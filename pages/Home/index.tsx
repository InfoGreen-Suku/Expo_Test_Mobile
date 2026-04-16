import { useAuth } from "@/auth/AuthContext";
import {
  getDistinctBhagNos,
  getVoterBySr,
  markVoterVerified,
} from "@/sqlite/votersDb";
import { transliterateLatinToTamil } from "@/utils/transliterateToTamil";
import Feather from "@expo/vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const SELECTED_BOOTH_STORAGE_KEY = "selectedBoothNumber";
const BOOTH_NUMBERS_STORAGE_KEY = "boothNumbersList";
const AUTH_USER_STORAGE_KEY = "authUser";

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
  const [isBoothModalVisible, setIsBoothModalVisible] = useState(false);
  const [isNoDataModalVisible, setIsNoDataModalVisible] = useState(false);
  const [isLoadingBooths, setIsLoadingBooths] = useState(false);
  const [boothSearchValue, setBoothSearchValue] = useState("");
  const [nameTamilScript, setNameTamilScript] = useState<string | null>(null);
  const [relationNameTamilScript, setRelationNameTamilScript] = useState<
    string | null
  >(null);

  const canSubmit = useMemo(
    () =>
      numberValue.trim().length > 0 && selectedBoothNumber.trim().length > 0,
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

  useEffect(() => {
    const loadSavedBoothState = async () => {
      try {
        const [storedBoothNumber, storedBoothNumbers] = await Promise.all([
          AsyncStorage.getItem(SELECTED_BOOTH_STORAGE_KEY),
          AsyncStorage.getItem(BOOTH_NUMBERS_STORAGE_KEY),
        ]);
        if (storedBoothNumber) {
          setSelectedBoothNumber(storedBoothNumber);
        }

        if (storedBoothNumbers) {
          const parsedBoothNumbers = JSON.parse(storedBoothNumbers);
          if (Array.isArray(parsedBoothNumbers)) {
            setBoothNumbers(parsedBoothNumbers);
          }
        }
      } catch (error) {
        console.log("Failed to load saved booth number:", error);
      }
    };

    void loadSavedBoothState();
  }, []);

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

  const handleOpenBoothModal = () => {
    setIsBoothModalVisible(true);
    void loadBoothNumbers();
  };

  const handleCloseBoothModal = () => {
    setIsBoothModalVisible(false);
    setBoothSearchValue("");
  };

  const handleBoothSelect = async (boothNumber: string) => {
    try {
      await AsyncStorage.setItem(SELECTED_BOOTH_STORAGE_KEY, boothNumber);
      setSelectedBoothNumber(boothNumber);
      handleCloseBoothModal();
    } catch (error) {
      console.log("Failed to save booth number:", error);
    }
  };

  const handleSubmit = async () => {
    const value = numberValue.trim();
    if (!value || !selectedBoothNumber) return;
    const sr = Number.parseInt(value, 10);
    if (Number.isNaN(sr)) return;

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
      const verifiedAt = formatDateTime12h(new Date());

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

  const handleReset = () => {
    setNumberValue("");
    setVerified(false);
    setMarkedVerified(false);
    setJustVerified(false);
    setMatchedVoter(null);
    setNameTamilScript(null);
    setRelationNameTamilScript(null);
    setIsNoDataModalVisible(false);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([SELECTED_BOOTH_STORAGE_KEY, "authUser"]);
    } finally {
      await signOutLocal();
    }
  };

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
                  onPress={() => void handleLogout()}
                  accessibilityRole="button"
                >
                  <Feather name="log-out" size={18} color="#FFFFFF" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </Pressable>
              </View>

              <Text style={styles.heroSubtitle}>
                {verified
                  ? "உங்கள் விவரங்களை சரிபார்க்க கீழே உள்ள தகவல்கள் சரியாக உள்ளதா என்பதை உறுதிப்படுத்தவும்."
                  : "சரிபார்க்க வேண்டிய எண்ணை உள்ளிட்டு சமர்ப்பிக்கவும்."}
              </Text>
            </View>

            {verified ? (
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
                <ScrollView
                  style={styles.entryScroll}
                  contentContainerStyle={styles.entryScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.entryTitle}>வாக்கு சாவடி எண்</Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.selectorButton,
                      pressed && styles.selectorButtonPressed,
                    ]}
                    onPress={handleOpenBoothModal}
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
                      onChangeText={(t) => setNumberValue(t.replace(/\s/g, ""))}
                      placeholder="எண்"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      style={styles.input}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>

                  <Pressable
                    disabled={!canSubmit}
                    onPress={handleSubmit}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSubmit }}
                    style={({ pressed }) => [
                      styles.button,
                      !canSubmit && styles.buttonDisabled,
                      pressed && canSubmit && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        !canSubmit && styles.buttonTextDisabled,
                      ]}
                    >
                      சமர்ப்பிக்கவும்
                    </Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
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
      </Modal>

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
  },
  entryScrollContent: {
    paddingBottom: 8,
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
