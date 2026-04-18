import {
  getVotersPendingStatusSync,
  markVotersStatusSynced,
  type VoterStatusSyncRow,
} from "@/sqlite/votersDb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Alert, Platform } from "react-native";
import BackgroundService from "react-native-background-actions";

/** Search Metro / Logcat for this tag to trace background sync. */
const LOG_TAG = "[BackgroundSync]";

/** Same key as `pages/Home/index.tsx` — current booth’s `bhag_no`. */
const SELECTED_BOOTH_STORAGE_KEY = "selectedBoothNumber";

const VOTERS_STATUS_SYNC_URL =
  "https://voters.infogreen.co/api/voters_list_status_update.php";

/** Interval between sync attempts while the foreground service is running. */
const BACKGROUND_SYNC_INTERVAL_MS = 60_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildStatusSyncPayload(rows: VoterStatusSyncRow[]) {
  return {
    voters: rows.map((r) => ({
      booth_no: Number(String(r.bhag_no).trim()) || 0,
      sr_no: Number(r.sr),
      status: Number(r.status),
      device_id: r.verified_by_device_id ?? "",
      user_name: r.verified_by_name ?? "",
      date_time: r.verified_at ?? "",
    })),
  };
}

type StatusSyncApiResponse = {
  status?: string;
  message?: string;
  updated?: { booth_no?: number | string; sr_no?: number | string }[];
};

/** Only rows listed in `updated` get `online_status = 1` locally. */
function parseSyncedKeysFromApiBody(
  data: unknown,
): { sr: number; bhagNo: string }[] {
  if (!data || typeof data !== "object") return [];
  const body = data as StatusSyncApiResponse;
  if (String(body.status ?? "").toLowerCase() !== "success") return [];

  const updated = body.updated;
  if (!Array.isArray(updated) || updated.length === 0) return [];

  const keys: { sr: number; bhagNo: string }[] = [];
  for (const item of updated) {
    if (!item || typeof item !== "object") continue;
    const sr = Number(item.sr_no);
    const boothRaw = item.booth_no;
    if (!Number.isFinite(sr) || boothRaw === undefined || boothRaw === null) {
      continue;
    }
    const bhagNo = String(boothRaw).trim();
    if (!bhagNo) continue;
    keys.push({ sr, bhagNo });
  }
  return keys;
}

/** Push pending verified rows (`online_status = 0`) to the server; shared with Home manual refresh. */
export async function syncVerifiedVotersStatusToApi(): Promise<void> {
  const boothRaw = await AsyncStorage.getItem(SELECTED_BOOTH_STORAGE_KEY);
  const boothBhagNo = boothRaw?.trim() ?? "";
  if (!boothBhagNo) return;

  const rows = await getVotersPendingStatusSync(boothBhagNo);
  if (rows.length === 0) return;

  console.info(`${LOG_TAG} posting ${rows.length} voter(s) to server…`);
  const payload = buildStatusSyncPayload(rows);
  const response = await axios.post(VOTERS_STATUS_SYNC_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 60_000,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Sync failed: HTTP ${response.status}`);
  }

  const toMark = parseSyncedKeysFromApiBody(response.data);
  if (toMark.length === 0) {
    console.info(
      `${LOG_TAG} server OK but no rows in "updated"; local DB unchanged`,
    );
    return;
  }

  await markVotersStatusSynced(toMark);
  console.info(
    `${LOG_TAG} marked ${toMark.length} row(s) synced (online_status=1)`,
  );
}

const reminderTask = async (taskData: { delay: number }) => {
  const { delay } = taskData;
  console.info(
    `${LOG_TAG} background loop active (interval ${delay} ms). Watch Metro or Android Logcat (ReactNativeJS).`,
  );

  while (BackgroundService.isRunning()) {
    try {
      console.info(`${LOG_TAG} sync cycle start`);
      await syncVerifiedVotersStatusToApi();
    } catch (e) {
      console.warn(`${LOG_TAG} sync error:`, e);
    }
    console.info(
      `${LOG_TAG} waiting ${delay} ms (${delay / 1000}s) before next sync cycle`,
    );
    await sleep(delay);
  }
  console.info(`${LOG_TAG} background loop ended`);
};

const taskConfig = {
  taskName: "Background Task",
  taskTitle: "Update Online Status",
  taskDesc: "Syncing verified voters to server",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#2563EB",
  parameters: {
    delay: BACKGROUND_SYNC_INTERVAL_MS,
  },
  allowExecutionInForeground: true,
  foregroundServiceType: ["dataSync"] as Array<"dataSync">,
};

export const startReminderService = async () => {
  try {
    if (BackgroundService.isRunning()) {
      console.info(`${LOG_TAG} already running — skip start`);
      return;
    }

    console.info(`${LOG_TAG} requesting start (platform=${Platform.OS})…`);

    await BackgroundService.start(
      (taskdata: any) => reminderTask(taskdata),
      taskConfig,
    );
    console.info(
      `${LOG_TAG} Native start() resolved — notification should appear on Android; loop logs follow.`,
    );
    // if (__DEV__) {
    //   Alert.alert(
    //     "Background sync",
    //     "Service started (__DEV__). You should see a persistent notification on Android; logs use tag [BackgroundSync] in Logcat.",
    //   );
    // }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_TAG} start failed:`, message, err);
    if (__DEV__) {
      Alert.alert("Background sync failed", message);
    }
  }
};

export const stopReminder = async () => {
  if (BackgroundService.isRunning()) {
    await BackgroundService.stop();
    console.info(`${LOG_TAG} stopped`);
  }
};

// const activateReminder = (reminderDetails:any) => {
//   // initializeNotifications(reminderDetails);
//   showReminder(reminderDetails.message);
// };
