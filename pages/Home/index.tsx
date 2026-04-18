import { useAuth } from "@/auth/AuthContext";
import {
  startReminderService,
  stopReminder,
  syncVerifiedVotersStatusToApi,
} from "@/hooks/backgroundTask";
import {
  applyServerVerifiedListPatch,
  formatVerifiedAtStorageLocal,
  getBoothVerifiedCountForDevice,
  getBoothVerifiedVotersListForDevice,
  getBoothVoterVerificationCounts,
  getDistinctBhagNos,
  getVoterBySr,
  markVoterVerified,
  warmUpVotersDb,
} from "@/sqlite/votersDb";
import { transliterateLatinToTamil } from "@/utils/transliterateToTamil";
import Feather from "@expo/vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const REFRESH_SPINNER_COLOR = "#2563EB";

const SELECTED_BOOTH_STORAGE_KEY = "selectedBoothNumber";
const BOOTH_NUMBERS_STORAGE_KEY = "boothNumbersList";
const AUTH_USER_STORAGE_KEY = "authUser";

function normalizeBoothNo(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}
const DAILY_ACCESS_MAX_TIME_STORAGE_KEY = "dailyAccessMaxTimeHm";

/** Fallback if API / AsyncStorage have not provided a time yet. */
const DEFAULT_DAILY_ACCESS_END_HOUR = 16;
const DEFAULT_DAILY_ACCESS_END_MINUTE = 45;

type AccessEndHm = { hour: number; minute: number };

/** Daily wall-clock cutoff, or a single calendar end instant from API datetime. */
type AccessEndSpec =
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "absolute"; endMs: number };

function getDefaultAccessEndSpec(): AccessEndSpec {
  return {
    kind: "daily",
    hour: DEFAULT_DAILY_ACCESS_END_HOUR,
    minute: DEFAULT_DAILY_ACCESS_END_MINUTE,
  };
}

function isPastDailyAccessCutoff(date: Date, end: AccessEndHm): boolean {
  const cutoff = new Date(date);
  cutoff.setHours(end.hour, end.minute, 0, 0);
  return date.getTime() >= cutoff.getTime();
}

function isPastAccessEndSpec(now: Date, spec: AccessEndSpec): boolean {
  if (spec.kind === "absolute") {
    return now.getTime() >= spec.endMs;
  }
  return isPastDailyAccessCutoff(now, {
    hour: spec.hour,
    minute: spec.minute,
  });
}

/** Parses `2026-04-18 19:10:00` or `2026-04-18T19:10:00` as local wall time. */
function parseApiDateTimeLocal(raw: string): Date | null {
  const m = raw
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const se = m[6] !== undefined ? Number(m[6]) : 0;
  if ([y, mo, da, h, mi, se].some((n) => !Number.isFinite(n))) return null;
  const d = new Date(y, mo - 1, da, h, mi, se);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDailyCutoffDisplayLabel(hm: AccessEndHm): string {
  const d = new Date(2000, 0, 1, hm.hour, hm.minute);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function parseMaxTimeToHm(value: unknown): AccessEndHm | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.hour === "number" && typeof o.minute === "number") {
      const hour = o.hour;
      const minute = o.minute;
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
    }
    return null;
  }

  let s = String(value).trim().replace(/\s+/g, " ");
  if (!s) return null;

  let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
    return null;
  }

  // e.g. "5:15 PM", "05:15:00PM", "05:15:00 PM" (optional seconds, space before AM/PM optional)
  m = s.match(/^(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?\s*(AM|PM)\s*$/i);
  if (m) {
    let hour = Number(m[1]);
    const minute = Number(m[2]);
    const ap = m[4].toUpperCase();
    if (minute < 0 || minute > 59) return null;
    if (ap === "AM") {
      if (hour === 12) hour = 0;
      else if (hour < 1 || hour > 12) return null;
    } else {
      if (hour === 12) hour = 12;
      else if (hour < 1 || hour > 11) return null;
      else hour += 12;
    }
    return { hour, minute };
  }

  m = s.match(/^(\d{1,2})\.(\d{2})$/);
  if (m) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  return null;
}

function parseAccessEndSpec(value: unknown): AccessEndSpec | null {
  if (value == null || value === "") return null;

  if (typeof value === "string") {
    const dt = parseApiDateTimeLocal(value);
    if (dt) return { kind: "absolute", endMs: dt.getTime() };
  }

  const hm = parseMaxTimeToHm(value);
  if (hm) return { kind: "daily", hour: hm.hour, minute: hm.minute };
  return null;
}

const EXPIRY_FIELD_KEYS = ["maxTime", "expiry_datetime"] as const;

function pickExpiryFromRecord(
  row: Record<string, unknown> | null | undefined,
): unknown {
  if (!row) return null;
  for (const key of EXPIRY_FIELD_KEYS) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

function extractMaxTimeFromUserPayload(
  data: unknown,
  matchedUser: Record<string, unknown> | null,
): unknown {
  const fromMatched = pickExpiryFromRecord(matchedUser ?? undefined);
  if (fromMatched != null) return fromMatched;

  if (Array.isArray(data)) {
    for (const row of data) {
      if (row && typeof row === "object") {
        const v = pickExpiryFromRecord(row as Record<string, unknown>);
        if (v != null) return v;
      }
    }
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const v = pickExpiryFromRecord(data as Record<string, unknown>);
    if (v != null) return v;
  }

  return null;
}

function formatBilingualName(tamil: unknown, english: unknown): string {
  const clean = (value: unknown) =>
    value == null
      ? ""
      : String(value)
          .replace(/\s*-\s*$/, "") // remove trailing "-" from source data
          .trim();

  const ta = clean(tamil);
  const en = clean(english);

  if (ta && en) return `${ta} (${en})`;
  if (ta) return ta;
  if (en) return en;
  return "-";
}

function formatDateTime12h(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, "0");

  // Example: 16-04-2026 10:59 AM
  return `${dd}-${mm}-${yyyy} ${hh}:${minutes} ${ampm}`;
}

function formatAccessLimitMessage(spec: AccessEndSpec): string {
  if (spec.kind === "absolute") {
    return `Access is available until ${formatDateTime12h(new Date(spec.endMs))}.`;
  }
  return `Daily access is available until ${formatDailyCutoffDisplayLabel({ hour: spec.hour, minute: spec.minute })}.`;
}

function maskVoterId(value: unknown) {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return "X";
  // If too short to have a "middle 3", don't mask.
  if (raw.length <= 3) return raw;

  const maskLen = Math.min(3, raw.length);
  const start = Math.floor((raw.length - maskLen) / 2);
  const end = start + maskLen;
  return `${raw.slice(0, start)}${"X".repeat(maskLen)}${raw.slice(end)}`;
}

export default function Home() {
  const { signOutLocal } = useAuth();
  const [numberValue, setNumberValue] = useState("");
  const [verified, setVerified] = useState(false);
  const [markedVerified, setMarkedVerified] = useState(false);
  const [isMarkingVerified, setIsMarkingVerified] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const [matchedVoter, setMatchedVoter] = useState<any | null>(null);
  const [boothNumbers, setBoothNumbers] = useState<string[]>([]);
  const [selectedBoothNumber, setSelectedBoothNumber] = useState("");
  // const [isBoothModalVisible, setIsBoothModalVisible] = useState(false);
  const [isNoDataModalVisible, setIsNoDataModalVisible] = useState(false);
  const [isLoadingBooths, setIsLoadingBooths] = useState(false);
  const [boothSearchValue, setBoothSearchValue] = useState("");
  const [nameTamilScript, setNameTamilScript] = useState<string | null>(null);
  const [relationNameTamilScript, setRelationNameTamilScript] = useState<
    string | null
  >(null);
  const [isLookupPending, setIsLookupPending] = useState(false);
  const [refreshingBoothApi, setRefreshingBoothApi] = useState(false);
  const [userAccessStatus, setUserAccessStatus] = useState<boolean>(false);
  const [userAccessResolved, setUserAccessResolved] = useState(false);
  const [accessTimeTick, setAccessTimeTick] = useState(0);
  const [accessEndSpec, setAccessEndSpec] = useState<AccessEndSpec | null>(
    null,
  );
  const [boothVoterCounts, setBoothVoterCounts] = useState<{
    booth: string;
    verified: number;
    total: number;
    verifiedOnDevice: number;
  } | null>(null);
  const [boothVoterCountsLoading, setBoothVoterCountsLoading] = useState(false);
  const [boothCountsRefreshKey, setBoothCountsRefreshKey] = useState(0);
  const [verifiedListModalVisible, setVerifiedListModalVisible] =
    useState(false);
  const [verifiedListRows, setVerifiedListRows] = useState<
    { sr: number; verified_at: string | null }[]
  >([]);
  const [verifiedListLoading, setVerifiedListLoading] = useState(false);
  const [verifiedListDeviceId, setVerifiedListDeviceId] = useState("");
  const [voterListRefreshModalVisible, setVoterListRefreshModalVisible] =
    useState(false);

  const canSubmit = useMemo(
    () =>
      numberValue.trim().length > 0 &&
      normalizeBoothNo(selectedBoothNumber).length > 0,
    [numberValue, selectedBoothNumber],
  );

  const isMatchedVoterVerified = useMemo(
    () => Number(matchedVoter?.status ?? 0) === 1 || markedVerified,
    [matchedVoter, markedVerified],
  );
  const verifiedDisplayText = justVerified
    ? "வெற்றிகரமாக சரிபார்க்கப்பட்டது"
    : "ஏற்கனவே சரிபார்க்கப்பட்டது";

  const filteredBoothNumbers = useMemo(() => {
    const searchValue = boothSearchValue.trim();
    if (!searchValue) return boothNumbers;

    return boothNumbers.filter((item) => item.includes(searchValue));
  }, [boothNumbers, boothSearchValue]);

  const isPastAccessCutoff = useMemo(() => {
    void accessTimeTick;
    const spec = accessEndSpec ?? getDefaultAccessEndSpec();
    return isPastAccessEndSpec(new Date(), spec);
  }, [accessTimeTick, accessEndSpec]);

  const hasValidAccess = userAccessStatus && !isPastAccessCutoff;

  useEffect(() => {
    const id = setInterval(() => setAccessTimeTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  /**
   * Background voter sync: runs once user/session is resolved and we have a booth.
   * Not gated on `hasValidAccess` — pending SQLite rows should still upload when the
   * UI shows invalid access or past cutoff (e.g. time window ended).
   */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userAccessResolved || cancelled) {
        if (__DEV__ && !cancelled) {
          console.log(
            "[BackgroundSync/Home] waiting — userAccessResolved is false",
          );
        }
        return;
      }

      const boothFromStorage = normalizeBoothNo(
        await AsyncStorage.getItem(SELECTED_BOOTH_STORAGE_KEY),
      );
      const boothFromState = normalizeBoothNo(selectedBoothNumber);
      const booth = boothFromState || boothFromStorage;

      if (!booth) {
        if (__DEV__) {
          console.log(
            "[BackgroundSync/Home] not starting — no booth in AsyncStorage/state",
          );
        }
        await stopReminder();
        return;
      }

      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;

      if (__DEV__) {
        console.log(
          "[BackgroundSync/Home] calling startReminderService, booth=",
          booth,
        );
      }
      await startReminderService();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userAccessResolved, selectedBoothNumber]);

  useEffect(() => {
    if (!userAccessResolved || !hasValidAccess) {
      setBoothVoterCounts(null);
      setBoothVoterCountsLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setBoothVoterCountsLoading(true);
      try {
        const fromStorage = normalizeBoothNo(
          await AsyncStorage.getItem(SELECTED_BOOTH_STORAGE_KEY),
        );
        const booth = normalizeBoothNo(selectedBoothNumber) || fromStorage;
        if (!booth) {
          if (!cancelled) {
            setBoothVoterCounts(null);
          }
          return;
        }

        const authRaw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
        const auth = authRaw ? (JSON.parse(authRaw) as any) : null;
        const deviceId =
          auth && typeof auth.deviceId === "string" ? auth.deviceId.trim() : "";

        const [{ verifiedCount, totalCount }, verifiedOnDevice] =
          await Promise.all([
            getBoothVoterVerificationCounts(booth),
            deviceId
              ? getBoothVerifiedCountForDevice(booth, deviceId)
              : Promise.resolve(0),
          ]);
        if (!cancelled) {
          setBoothVoterCounts({
            booth,
            verified: verifiedCount,
            total: totalCount,
            verifiedOnDevice,
          });
        }
      } catch (err) {
        console.log("Failed to load booth voter counts:", err);
        if (!cancelled) {
          setBoothVoterCounts(null);
        }
      } finally {
        if (!cancelled) {
          setBoothVoterCountsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    userAccessResolved,
    hasValidAccess,
    selectedBoothNumber,
    boothCountsRefreshKey,
  ]);

  const openVerifiedListModal = useCallback(async () => {
    const booth = normalizeBoothNo(selectedBoothNumber);
    if (!booth) return;

    setVerifiedListModalVisible(true);
    setVerifiedListLoading(true);
    try {
      const authRaw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
      const auth = authRaw ? (JSON.parse(authRaw) as any) : null;
      const deviceId =
        auth && typeof auth.deviceId === "string" ? auth.deviceId.trim() : "";
      setVerifiedListDeviceId(deviceId);
      if (!deviceId) {
        setVerifiedListRows([]);
        return;
      }
      const rows = await getBoothVerifiedVotersListForDevice(booth, deviceId);
      setVerifiedListRows(rows);
    } catch (e) {
      console.log("Failed to load verified voters list:", e);
      setVerifiedListRows([]);
    } finally {
      setVerifiedListLoading(false);
    }
  }, [selectedBoothNumber]);

  const closeVerifiedListModal = useCallback(() => {
    setVerifiedListModalVisible(false);
    setVerifiedListRows([]);
    setVerifiedListDeviceId("");
  }, []);

  const closeVoterListRefreshModal = useCallback(() => {
    setVoterListRefreshModalVisible(false);
  }, []);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state === "active") setAccessTimeTick((n) => n + 1);
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, []);

  const getBoothNumbers = useCallback(async () => {
    const authRaw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
    const auth = authRaw ? (JSON.parse(authRaw) as any) : null;
    const deviceID =
      auth && typeof auth.deviceId === "string" ? auth.deviceId : undefined;
    try {
      const response = await axios.post(
        `https://voters.infogreen.co/api/user_status.php`,
        {
          deviceID: deviceID,
        },
      );
      const data = response.data;

      console.log("response", data);
      if (data) {
        const booth = normalizeBoothNo(data.booth_no);
        await AsyncStorage.setItem(SELECTED_BOOTH_STORAGE_KEY, booth);
        setSelectedBoothNumber(booth);
        setUserAccessStatus(data.status === 1);
        const maxTimeRaw = extractMaxTimeFromUserPayload(data, null);
        const parsedMax = parseAccessEndSpec(maxTimeRaw);
        if (parsedMax) {
          await AsyncStorage.setItem(
            DAILY_ACCESS_MAX_TIME_STORAGE_KEY,
            JSON.stringify(parsedMax),
          );
          setAccessEndSpec(parsedMax);
        }
      } else {
        setUserAccessStatus(false);
      }
    } catch (error) {
      setUserAccessStatus(false);
      console.log("Failed to get user by id:", error);
    } finally {
      setUserAccessResolved(true);
    }
  }, []);

  const onRefreshBoothApi = useCallback(async () => {
    setRefreshingBoothApi(true);
    try {
      await getBoothNumbers();
    } finally {
      setRefreshingBoothApi(false);
    }
  }, [getBoothNumbers]);

  const refresh = async () => {
    const boothNo = await AsyncStorage.getItem(SELECTED_BOOTH_STORAGE_KEY);
    if (!boothNo) return;
    try {
      try {
        await syncVerifiedVotersStatusToApi();
        setBoothCountsRefreshKey((k) => k + 1);
      } catch (syncErr) {
        console.log("Pending voter status sync (refresh):", syncErr);
      }

      const response = await axios.post(
        `https://voters.infogreen.co/api/updated_voter_list.php`,
        {
          bhag_no: boothNo,
        },
      );
      if (response.data?.status === "success") {
        setVoterListRefreshModalVisible(true);
        try {
          const apiBhag = normalizeBoothNo(response.data.bhag_no ?? boothNo);
          const srList = response.data.sr_list;
          const list = Array.isArray(srList) ? srList : [];
          await applyServerVerifiedListPatch(apiBhag, list);
          setBoothCountsRefreshKey((k) => k + 1);
        } catch (patchErr) {
          console.log("Failed to apply server voter list patch:", patchErr);
        } finally {
          setVoterListRefreshModalVisible(false);
        }
      }
    } catch (error) {
      console.log("Failed to refresh booth number:", error);
    }
  };
  const boothListRefreshControl = (
    <RefreshControl
      refreshing={refreshingBoothApi}
      onRefresh={onRefreshBoothApi}
      tintColor={REFRESH_SPINNER_COLOR}
      colors={[REFRESH_SPINNER_COLOR]}
      progressBackgroundColor="#FFFFFF"
    />
  );

  useEffect(() => {
    const loadSavedBoothState = async () => {
      try {
        const [storedBoothNumber, storedBoothNumbers, storedAccessHmRaw] =
          await Promise.all([
            AsyncStorage.getItem(SELECTED_BOOTH_STORAGE_KEY),
            AsyncStorage.getItem(BOOTH_NUMBERS_STORAGE_KEY),
            AsyncStorage.getItem(DAILY_ACCESS_MAX_TIME_STORAGE_KEY),
          ]);
        if (storedBoothNumber) {
          setSelectedBoothNumber(normalizeBoothNo(storedBoothNumber));
        }

        if (storedBoothNumbers) {
          const parsedBoothNumbers = JSON.parse(storedBoothNumbers);
          if (Array.isArray(parsedBoothNumbers)) {
            setBoothNumbers(parsedBoothNumbers);
          }
        }

        if (storedAccessHmRaw) {
          try {
            const p = JSON.parse(storedAccessHmRaw) as Record<string, unknown>;
            if (p.kind === "absolute" && typeof p.endMs === "number") {
              setAccessEndSpec({ kind: "absolute", endMs: p.endMs });
            } else if (
              p.kind === "daily" &&
              typeof p.hour === "number" &&
              typeof p.minute === "number" &&
              p.hour >= 0 &&
              p.hour <= 23 &&
              p.minute >= 0 &&
              p.minute <= 59
            ) {
              setAccessEndSpec({
                kind: "daily",
                hour: p.hour,
                minute: p.minute,
              });
            } else if (
              typeof p.hour === "number" &&
              typeof p.minute === "number" &&
              p.hour >= 0 &&
              p.hour <= 23 &&
              p.minute >= 0 &&
              p.minute <= 59
            ) {
              setAccessEndSpec({
                kind: "daily",
                hour: p.hour,
                minute: p.minute,
              });
            }
          } catch {
            /* ignore invalid stored shape */
          }
        }
      } catch (error) {
        console.log("Failed to load saved booth number:", error);
      }
    };

    void loadSavedBoothState();
    void getBoothNumbers();
    void warmUpVotersDb().catch((err) => {
      console.log("Failed to warm up voters DB:", err);
    });
  }, [getBoothNumbers]);

  useEffect(() => {
    if (!matchedVoter) {
      setNameTamilScript(null);
      setRelationNameTamilScript(null);
      return;
    }

    const nameRaw = matchedVoter.Name != null ? String(matchedVoter.Name) : "";
    const relationRaw =
      matchedVoter.Father_Name != null ? String(matchedVoter.Father_Name) : "";

    let cancelled = false;

    void (async () => {
      try {
        const [nameTa, relationTa] = await Promise.all([
          nameRaw.trim()
            ? transliterateLatinToTamil(nameRaw)
            : Promise.resolve(null),
          relationRaw.trim()
            ? transliterateLatinToTamil(relationRaw)
            : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setNameTamilScript(nameTa);
          setRelationNameTamilScript(relationTa);
        }
      } catch {
        if (!cancelled) {
          setNameTamilScript(null);
          setRelationNameTamilScript(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchedVoter]);

  const loadBoothNumbers = async () => {
    if (boothNumbers.length > 0 || isLoadingBooths) return;

    try {
      setIsLoadingBooths(true);
      const storedBoothNumbers = await AsyncStorage.getItem(
        BOOTH_NUMBERS_STORAGE_KEY,
      );

      if (storedBoothNumbers) {
        const parsedBoothNumbers = JSON.parse(storedBoothNumbers);
        if (
          Array.isArray(parsedBoothNumbers) &&
          parsedBoothNumbers.length > 0
        ) {
          setBoothNumbers(parsedBoothNumbers);
          return;
        }
      }

      const distinctBhagNos = await getDistinctBhagNos();
      setBoothNumbers(distinctBhagNos);
      await AsyncStorage.setItem(
        BOOTH_NUMBERS_STORAGE_KEY,
        JSON.stringify(distinctBhagNos),
      );
    } catch (error) {
      console.log("Failed to load booth numbers:", error);
    } finally {
      setIsLoadingBooths(false);
    }
  };

  // const handleOpenBoothModal = () => {
  //   setIsBoothModalVisible(true);
  //   void loadBoothNumbers();
  // };

  // const handleCloseBoothModal = () => {
  //   setIsBoothModalVisible(false);
  //   setBoothSearchValue("");
  // };

  // const handleBoothSelect = async (boothNumber: string) => {
  //   try {
  //     await AsyncStorage.setItem(SELECTED_BOOTH_STORAGE_KEY, boothNumber);
  //     setSelectedBoothNumber(boothNumber);
  //     handleCloseBoothModal();
  //   } catch (error) {
  //     console.log("Failed to save booth number:", error);
  //   }
  // };

  const handleSubmit = async () => {
    const value = numberValue.trim();
    if (!value || !selectedBoothNumber) return;
    const sr = Number.parseInt(value, 10);
    if (Number.isNaN(sr)) return;

    setIsLookupPending(true);
    try {
      setIsNoDataModalVisible(false);
      const row = await getVoterBySr(sr, selectedBoothNumber);
      console.log("matched voter by sr:", sr, row);

      if (!row) {
        setMatchedVoter(null);
        setMarkedVerified(false);
        setJustVerified(false);
        setVerified(false);
        setIsNoDataModalVisible(true);
        return;
      }

      setMatchedVoter(row);
      setMarkedVerified(Number(row?.status ?? 0) === 1);
      setJustVerified(false);
      setVerified(true);
    } catch (e) {
      console.log("Failed to read voter by sr:", e);
      setMatchedVoter(null);
      setMarkedVerified(false);
      setJustVerified(false);
      setVerified(false);
    } finally {
      setIsLookupPending(false);
    }
  };

  const handleMarkVerified = async () => {
    if (!matchedVoter || isMatchedVoterVerified || isMarkingVerified) return;

    const sr = Number.parseInt(String(matchedVoter.sr ?? numberValue), 10);
    if (Number.isNaN(sr) || !selectedBoothNumber) return;

    try {
      const authRaw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
      const auth = authRaw ? (JSON.parse(authRaw) as any) : null;
      const userName =
        auth && typeof auth.name === "string" ? auth.name : undefined;
      const deviceId =
        auth && typeof auth.deviceId === "string" ? auth.deviceId : undefined;
      const verifiedAt = formatVerifiedAtStorageLocal(new Date());

      // Optimistic UI update (so it reflects immediately)
      setIsMarkingVerified(true);
      setMarkedVerified(true);
      setJustVerified(true);
      setMatchedVoter((prev: any) =>
        prev
          ? {
              ...prev,
              status: 1,
              verified_by_name: userName ?? prev.verified_by_name,
              verified_by_device_id: deviceId ?? prev.verified_by_device_id,
              verified_at: verifiedAt,
            }
          : prev,
      );

      await markVoterVerified(sr, selectedBoothNumber, {
        userName,
        deviceId,
        verifiedAt,
      });

      setBoothCountsRefreshKey((k) => k + 1);
    } catch (error) {
      console.log("Failed to update voter verification status:", error);
      // Roll back optimistic state if the DB update failed
      setMarkedVerified(false);
      setJustVerified(false);
      setMatchedVoter((prev: any) =>
        prev
          ? {
              ...prev,
              status: 0,
            }
          : prev,
      );
    } finally {
      setIsMarkingVerified(false);
    }
  };

  const handleReset = useCallback(() => {
    setNumberValue("");
    setVerified(false);
    setMarkedVerified(false);
    setJustVerified(false);
    setMatchedVoter(null);
    setNameTamilScript(null);
    setRelationNameTamilScript(null);
    setIsNoDataModalVisible(false);
  }, []);

  useEffect(() => {
    if (!userAccessResolved || !isPastAccessCutoff || !verified) return;
    handleReset();
  }, [userAccessResolved, isPastAccessCutoff, verified, handleReset]);

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.heroBg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.stack}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <Text style={styles.heroTitle}>Home</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.logoutButton,
                    pressed && styles.logoutButtonPressed,
                  ]}
                  onPress={() => refresh()}
                  accessibilityRole="button"
                >
                  <Feather name="refresh-ccw" size={18} color="#FFFFFF" />
                  <Text style={styles.logoutButtonText}>Refresh</Text>
                </Pressable>
              </View>

              <Text style={styles.heroSubtitle}>
                {verified && hasValidAccess
                  ? "உங்கள் விவரங்களை சரிபார்க்க கீழே உள்ள தகவல்கள் சரியாக உள்ளதா என்பதை உறுதிப்படுத்தவும்."
                  : "சரிபார்க்க வேண்டிய எண்ணை உள்ளிட்டு சமர்ப்பிக்கவும்."}
              </Text>
            </View>

            {verified && hasValidAccess ? (
              <View style={styles.card}>
                <ScrollView
                  style={styles.cardBody}
                  contentContainerStyle={styles.cardScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  stickyHeaderIndices={[0]}
                >
                  <View style={styles.cardStickyHeader}>
                    {isMatchedVoterVerified ? (
                      <View style={styles.verifiedBanner}>
                        <View style={styles.verifiedBannerIcon}>
                          <Feather name="check" size={16} color="#FFFFFF" />
                        </View>
                        <Text style={styles.verifiedBannerText}>
                          {verifiedDisplayText}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.fieldList}>
                    <View style={styles.fieldCard}>
                      <Text style={styles.fieldLabel}>பெயர்</Text>
                      <Text style={[styles.fieldValue, styles.prominentValue]}>
                        {formatBilingualName(
                          nameTamilScript,
                          matchedVoter?.Name,
                        )}
                      </Text>
                    </View>

                    <View style={styles.fieldCard}>
                      <Text style={styles.fieldLabel}>
                        வாக்காளர் அடையாள எண்
                      </Text>
                      <Text style={[styles.fieldValue, styles.prominentValue]}>
                        {maskVoterId(matchedVoter?.Number)}
                      </Text>
                    </View>

                    {matchedVoter?.Relation === "Father" ? (
                      <View style={styles.fieldCard}>
                        <Text style={styles.fieldLabel}>தந்தை பெயர்</Text>
                        <Text style={styles.fieldValue}>
                          {formatBilingualName(
                            relationNameTamilScript,
                            matchedVoter?.Father_Name,
                          )}
                        </Text>
                      </View>
                    ) : null}

                    {matchedVoter?.Relation === "Husband" ? (
                      <View style={styles.fieldCard}>
                        <Text style={styles.fieldLabel}>கணவர் பெயர்</Text>
                        <Text style={styles.fieldValue}>
                          {formatBilingualName(
                            relationNameTamilScript,
                            matchedVoter?.Father_Name,
                          )}
                        </Text>
                      </View>
                    ) : null}

                    {matchedVoter?.Relation === "Mother" ? (
                      <View style={styles.fieldCard}>
                        <Text style={styles.fieldLabel}>தாய் பெயர்</Text>
                        <Text style={styles.fieldValue}>
                          {formatBilingualName(
                            relationNameTamilScript,
                            matchedVoter?.Father_Name,
                          )}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.fieldCard}>
                      <Text style={styles.fieldLabel}>வயது</Text>
                      <Text style={styles.fieldValue}>
                        {matchedVoter?.age ?? "-"}
                      </Text>
                    </View>

                    <View style={styles.fieldCard}>
                      <Text style={styles.fieldLabel}>பாலினம்</Text>
                      <Text style={styles.fieldValue}>
                        {matchedVoter?.sex === "Male"
                          ? "ஆண்"
                          : matchedVoter?.sex === "Female"
                            ? "பெண்"
                            : "-"}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.actions}>
                  <Pressable
                    disabled={isMatchedVoterVerified || isMarkingVerified}
                    style={({ pressed }) => [
                      styles.badge,
                      isMatchedVoterVerified && styles.badgeDisabled,
                      (isMatchedVoterVerified || isMarkingVerified) &&
                        styles.badgeDisabled,
                      pressed &&
                        !isMatchedVoterVerified &&
                        !isMarkingVerified &&
                        styles.badgePressed,
                    ]}
                    onPress={() => {
                      void handleMarkVerified();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: isMatchedVoterVerified || isMarkingVerified,
                    }}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        (isMatchedVoterVerified || isMarkingVerified) &&
                          styles.badgeTextDisabled,
                      ]}
                    >
                      {isMatchedVoterVerified
                        ? verifiedDisplayText
                        : isMarkingVerified
                          ? "சேமிக்கிறது..."
                          : "சரிபார்க்கப்பட்டது"}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.secondaryButtonPressed,
                    ]}
                    onPress={handleReset}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryButtonText}>தொடரவும்</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.entryCard}>
                {!userAccessResolved ? (
                  <View style={styles.accessCheckContainer}>
                    <ActivityIndicator
                      size="large"
                      color={REFRESH_SPINNER_COLOR}
                    />
                    <Text style={styles.accessCheckText}>Checking access…</Text>
                  </View>
                ) : !hasValidAccess ? (
                  <ScrollView
                    style={styles.entryScroll}
                    contentContainerStyle={styles.invalidAccessScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={boothListRefreshControl}
                  >
                    <View style={styles.invalidAccessBlock}>
                      <View style={styles.invalidAccessIconWrap}>
                        <Feather
                          name="alert-circle"
                          size={44}
                          color="#DC2626"
                        />
                      </View>
                      <Text style={styles.invalidAccessTitle}>
                        Invalid access
                      </Text>
                      {isPastAccessCutoff && userAccessStatus ? (
                        <Text style={styles.invalidAccessSubtitle}>
                          {formatAccessLimitMessage(
                            accessEndSpec ?? getDefaultAccessEndSpec(),
                          )}
                        </Text>
                      ) : null}

                      <Pressable
                        onPress={() => void onRefreshBoothApi()}
                        disabled={refreshingBoothApi}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: refreshingBoothApi }}
                        style={({ pressed }) => [
                          styles.button,
                          styles.invalidAccessRefreshButton,
                          refreshingBoothApi && styles.buttonDisabled,
                          pressed &&
                            !refreshingBoothApi &&
                            styles.buttonPressed,
                        ]}
                      >
                        {refreshingBoothApi ? (
                          <View style={styles.submitButtonInner}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <Text style={styles.buttonText}>Refreshing…</Text>
                          </View>
                        ) : (
                          <Text style={styles.buttonText}>Refresh</Text>
                        )}
                      </Pressable>
                    </View>
                  </ScrollView>
                ) : (
                  <ScrollView
                    style={styles.entryScroll}
                    contentContainerStyle={styles.entryScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={boothListRefreshControl}
                  >
                    <Text style={styles.entryTitle}>வாக்கு சாவடி எண்</Text>

                    <Pressable
                      style={({ pressed }) => [
                        styles.selectorButton,
                        pressed && styles.selectorButtonPressed,
                      ]}
                      // onPress={handleOpenBoothModal}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.selectorText,
                          !selectedBoothNumber && styles.selectorPlaceholder,
                        ]}
                      >
                        {selectedBoothNumber || "சாவடி எண்ணை தேர்வு செய்யவும்"}
                      </Text>
                    </Pressable>

                    <Text style={styles.entryTitle}>எண்ணை உள்ளிடவும்</Text>

                    <View style={styles.inputWrap}>
                      <TextInput
                        value={numberValue}
                        onChangeText={(t) =>
                          setNumberValue(t.replace(/\s/g, ""))
                        }
                        placeholder="எண்"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        style={styles.input}
                        returnKeyType="done"
                        onSubmitEditing={() => void handleSubmit()}
                      />
                    </View>

                    <Pressable
                      disabled={!canSubmit || isLookupPending}
                      onPress={() => void handleSubmit()}
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: !canSubmit || isLookupPending,
                      }}
                      style={({ pressed }) => [
                        styles.button,
                        !canSubmit && styles.buttonDisabled,
                        pressed &&
                          canSubmit &&
                          !isLookupPending &&
                          styles.buttonPressed,
                      ]}
                    >
                      {isLookupPending ? (
                        <View style={styles.submitButtonInner}>
                          <ActivityIndicator color="#FFFFFF" size="small" />
                          <Text style={styles.buttonText}>தேடுகிறது…</Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.buttonText,
                            !canSubmit && styles.buttonTextDisabled,
                          ]}
                        >
                          சமர்ப்பிக்கவும்
                        </Text>
                      )}
                    </Pressable>

                    {normalizeBoothNo(selectedBoothNumber) ? (
                      boothVoterCountsLoading ? (
                        <View
                          style={[
                            styles.boothStatsCard,
                            styles.boothStatsCardNonInteractive,
                          ]}
                        >
                          <View style={styles.invalidAccessHintRow}>
                            <ActivityIndicator size="small" color="#2563EB" />
                            <Text style={styles.boothStatsCardMuted}>
                              Loading booth totals…
                            </Text>
                          </View>
                        </View>
                      ) : boothVoterCounts ? (
                        <Pressable
                          onPress={() => void openVerifiedListModal()}
                          accessibilityRole="button"
                          accessibilityLabel="View verified voters for this booth"
                          style={({ pressed }) => [
                            styles.boothStatsCard,
                            pressed && styles.boothStatsCardPressed,
                          ]}
                        >
                          <View style={styles.boothStatsCardHeader}>
                            <Text style={styles.boothStatsCardTitle}>
                              Local booth totals
                            </Text>
                            <Feather
                              name="chevron-right"
                              size={22}
                              color="#2563EB"
                            />
                          </View>
                          <Text style={styles.boothStatsCardBody}>
                            Booth {boothVoterCounts.booth}:{" "}
                            <Text style={styles.invalidAccessCountsEmphasis}>
                              {boothVoterCounts.verified}
                            </Text>{" "}
                            verified (status 1) of{" "}
                            <Text style={styles.invalidAccessCountsEmphasis}>
                              {boothVoterCounts.total}
                            </Text>{" "}
                            voters.
                          </Text>
                          <Text style={styles.boothStatsCardBodyDevice}>
                            This device (
                            <Text style={styles.invalidAccessCountsEmphasis}>
                              {boothVoterCounts.verifiedOnDevice}
                            </Text>
                            ) verified for this booth (local{" "}
                            <Text style={styles.boothStatsMonoHint}>
                              verified_by_device_id
                            </Text>
                            ).
                          </Text>
                          <Text style={styles.boothStatsCardHint}>
                            Tap to see verified data for this booth by this
                            device.
                          </Text>
                        </Pressable>
                      ) : null
                    ) : null}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* <Modal
        visible={isBoothModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseBoothModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCloseBoothModal}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>வாக்கு சாவடி எண்</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.modalCloseButtonPressed,
                ]}
                onPress={handleCloseBoothModal}
                accessibilityRole="button"
                accessibilityLabel="Close booth selection"
              >
                <Feather name="x" size={20} color="#1E3A8A" />
              </Pressable>
            </View>

            <View style={styles.modalSearchWrap}>
              <Feather
                name="search"
                size={18}
                color="#6B7280"
                style={styles.modalSearchIcon}
              />
              <TextInput
                value={boothSearchValue}
                onChangeText={setBoothSearchValue}
                placeholder="சாவடி எண்ணை தேடவும்"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                style={styles.modalSearchInput}
              />
            </View>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingBooths ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : null}
              {!isLoadingBooths && filteredBoothNumbers.length === 0 ? (
                <Text style={styles.modalEmptyText}>
                  No booth numbers found.
                </Text>
              ) : null}
              {filteredBoothNumbers.map((item) => (
                <Pressable
                  key={item}
                  style={({ pressed }) => [
                    styles.modalOption,
                    selectedBoothNumber === item && styles.modalOptionSelected,
                    pressed && styles.modalOptionPressed,
                  ]}
                  onPress={() => {
                    void handleBoothSelect(item);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedBoothNumber === item &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal> */}

      <Modal
        visible={isNoDataModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNoDataModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsNoDataModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>தகவல் கிடைக்கவில்லை</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.modalCloseButtonPressed,
                ]}
                onPress={() => setIsNoDataModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close no data dialog"
              >
                <Feather name="x" size={20} color="#1E3A8A" />
              </Pressable>
            </View>

            <View style={styles.modalList}>
              <Text style={styles.modalEmptyText}>
                {`இந்த ${numberValue} எண்ணிற்கு எந்த வாக்காளர் தகவலும் கிடைக்கவில்லை.`}
              </Text>
              <Pressable
                onPress={() => {
                  setIsNoDataModalVisible(false);
                  setNumberValue("");
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonText}>சரி</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={voterListRefreshModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVoterListRefreshModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeVoterListRefreshModal}
          />
          <View style={styles.modalCard} pointerEvents="box-none">
            <Text style={styles.modalTitle}>Booth list updated</Text>
            <Text style={styles.modalEmptyText}>
              Saving server data to the local database…
            </Text>
            <View style={styles.verifiedListLoadingWrap}>
              <ActivityIndicator size="large" color={REFRESH_SPINNER_COLOR} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={verifiedListModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeVerifiedListModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeVerifiedListModal}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Your device — booth {normalizeBoothNo(selectedBoothNumber)}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.modalCloseButtonPressed,
                ]}
                onPress={closeVerifiedListModal}
                accessibilityRole="button"
                accessibilityLabel="Close verified list"
              >
                <Feather name="x" size={20} color="#1E3A8A" />
              </Pressable>
            </View>

            {verifiedListDeviceId ? (
              <Text
                style={styles.modalDeviceIdCaption}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                Device: {verifiedListDeviceId}
              </Text>
            ) : null}

            {verifiedListLoading ? (
              <View style={styles.verifiedListLoadingWrap}>
                <ActivityIndicator size="large" color={REFRESH_SPINNER_COLOR} />
                <Text style={styles.modalLoadingText}>Loading…</Text>
              </View>
            ) : (
              <>
                <View style={styles.verifiedTableHeader}>
                  <Text style={styles.verifiedTableHeaderCell}>sr</Text>
                  <Text
                    style={[
                      styles.verifiedTableHeaderCell,
                      styles.verifiedTableHeaderCellWide,
                    ]}
                  >
                    verified_at
                  </Text>
                </View>
                <FlatList
                  data={verifiedListRows}
                  keyExtractor={(item) => String(item.sr)}
                  style={styles.verifiedListFlatList}
                  contentContainerStyle={
                    verifiedListRows.length === 0
                      ? styles.verifiedListEmptyContent
                      : undefined
                  }
                  ListEmptyComponent={
                    <Text style={styles.modalEmptyText}>
                      {!verifiedListDeviceId
                        ? "No device ID in session — cannot list your verifications."
                        : "No rows for this booth with your device's verified_by_device_id."}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.verifiedTableRow}>
                      <Text style={styles.verifiedTableCell}>{item.sr}</Text>
                      <Text
                        style={[
                          styles.verifiedTableCell,
                          styles.verifiedTableCellWide,
                        ]}
                        numberOfLines={2}
                      >
                        {item.verified_at != null &&
                        String(item.verified_at).trim() !== ""
                          ? String(item.verified_at)
                          : "—"}
                      </Text>
                    </View>
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  flex: {
    flex: 1,
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: "#2563EB",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    opacity: 0.9,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
  },
  logoutButtonPressed: {
    opacity: 0.9,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
  },
  stack: {
    width: "100%",
    flex: 1,
    alignSelf: "stretch",
  },
  hero: {
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.92)",
  },
  card: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    flex: 1,
  },
  cardBody: {
    flex: 1,
  },
  cardScrollContent: {
    paddingBottom: 16,
  },
  cardStickyHeader: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 10,
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  verifiedBannerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBannerText: {
    flex: 1,
    color: "#065F46",
    fontSize: 14,
    fontWeight: "900",
  },
  entryCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    flex: 1,
  },
  entryScroll: {
    flex: 1,
    minHeight: 0,
  },
  entryScrollContent: {
    paddingBottom: 8,
  },
  accessCheckContainer: {
    flex: 1,
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 14,
  },
  accessCheckText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  invalidAccessScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  invalidAccessBlock: {
    alignItems: "center",
    maxWidth: 300,
  },
  invalidAccessIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  invalidAccessTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#991B1B",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  invalidAccessSubtitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  invalidAccessCountsEmphasis: {
    fontWeight: "900",
    color: "#374151",
  },
  boothStatsCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFC",
  },
  boothStatsCardNonInteractive: {
    opacity: 1,
  },
  boothStatsCardPressed: {
    opacity: 0.92,
    backgroundColor: "#EFF6FF",
  },
  boothStatsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  boothStatsCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E3A8A",
  },
  boothStatsCardBody: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    lineHeight: 20,
  },
  boothStatsCardBodyDevice: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    lineHeight: 19,
  },
  boothStatsMonoHint: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  boothStatsCardMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  boothStatsCardHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  verifiedListLoadingWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  verifiedListFlatList: {
    maxHeight: 320,
  },
  verifiedListEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },
  verifiedTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 4,
  },
  verifiedTableHeaderCell: {
    flex: 0.35,
    fontSize: 12,
    fontWeight: "900",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  verifiedTableHeaderCellWide: {
    flex: 0.65,
  },
  verifiedTableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  verifiedTableCell: {
    flex: 0.35,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  verifiedTableCellWide: {
    flex: 0.65,
    fontWeight: "600",
    color: "#4B5563",
  },
  invalidAccessHintRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  invalidAccessHintIcon: {
    marginTop: 2,
  },
  invalidAccessHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  invalidAccessRefreshButton: {
    alignSelf: "stretch",
    marginTop: 18,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
  },
  selectorButton: {
    marginTop: 12,
    marginBottom: 14,
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  selectorButtonPressed: {
    opacity: 0.92,
  },
  selectorText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  selectorPlaceholder: {
    color: "#9CA3AF",
  },
  entrySubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: "#1D4ED8",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "700",
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
    textAlign: "right",
  },
  fieldList: {
    gap: 10,
  },
  fieldCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldLabel: {
    fontSize: 12.5,
    color: "#1E3A8A",
    fontWeight: "800",
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "800",
    textAlign: "left",
  },
  valueColumn: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  tamilTransliteration: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D4ED8",
    textAlign: "right",
  },
  prominentValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  badge: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  badgePressed: {
    opacity: 0.92,
  },
  badgeDisabled: {
    backgroundColor: "#E5E7EB",
    borderColor: "#E5E7EB",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  badgeTextDisabled: {
    color: "#9CA3AF",
  },
  actions: {
    marginTop: "auto",
    paddingTop: 14,
    gap: 10,
  },
  verifiedSuccessWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 28,
    paddingBottom: 12,
  },
  verifiedSuccessCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#34D399",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  verifiedSuccessTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "900",
    color: "#2563EB",
    textAlign: "center",
  },
  verifiedSuccessSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
  },
  verifiedStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  secondaryButton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonPressed: {
    opacity: 0.92,
  },
  secondaryButtonText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  inputWrap: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    height: 50,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  button: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  buttonTextDisabled: {
    color: "#9CA3AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  modalCloseButtonPressed: {
    opacity: 0.92,
  },
  modalList: {
    maxHeight: 360,
  },
  modalSearchWrap: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  modalSearchIcon: {
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  modalLoadingText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 12,
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  modalDeviceIdCaption: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
  },
  modalOption: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  modalOptionSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  modalOptionPressed: {
    opacity: 0.92,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  modalOptionTextSelected: {
    color: "#2563EB",
  },
});
