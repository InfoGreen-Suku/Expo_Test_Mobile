import {
  getDistinctBhagNos,
  getVoterBySr,
  markVoterVerified,
} from "@/sqlite/votersDb";
import Feather from "@expo/vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
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

export default function Home() {
  const [numberValue, setNumberValue] = useState("");
  const [verified, setVerified] = useState(false);
  const [markedVerified, setMarkedVerified] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const [matchedVoter, setMatchedVoter] = useState<any | null>(null);
  const [boothNumbers, setBoothNumbers] = useState<string[]>([]);
  const [selectedBoothNumber, setSelectedBoothNumber] = useState("");
  const [isBoothModalVisible, setIsBoothModalVisible] = useState(false);
  const [isLoadingBooths, setIsLoadingBooths] = useState(false);
  const [boothSearchValue, setBoothSearchValue] = useState("");

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
      const row = await getVoterBySr(sr, selectedBoothNumber);
      console.log("matched voter by sr:", sr, row);
      setMatchedVoter(row);
      setMarkedVerified(Number(row?.status ?? 0) === 1);
      setJustVerified(false);
    } catch (e) {
      console.log("Failed to read voter by sr:", e);
      setMatchedVoter(null);
      setMarkedVerified(false);
      setJustVerified(false);
    } finally {
      setVerified(true);
    }
  };

  const handleMarkVerified = async () => {
    if (!matchedVoter || isMatchedVoterVerified) return;

    const sr = Number.parseInt(String(matchedVoter.sr ?? numberValue), 10);
    if (Number.isNaN(sr) || !selectedBoothNumber) return;

    try {
      await markVoterVerified(sr, selectedBoothNumber);
      setMatchedVoter((prev: any) =>
        prev
          ? {
              ...prev,
              status: 1,
            }
          : prev,
      );
      setMarkedVerified(true);
      setJustVerified(true);
    } catch (error) {
      console.log("Failed to update voter verification status:", error);
    }
  };

  const handleReset = () => {
    setNumberValue("");
    setVerified(false);
    setMarkedVerified(false);
    setJustVerified(false);
    setMatchedVoter(null);
  };

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.heroBg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Home</Text>
              <Text style={styles.heroSubtitle}>
                {verified
                  ? "உங்கள் விவரங்களை சரிபார்க்க கீழே உள்ள தகவல்கள் சரியாக உள்ளதா என்பதை உறுதிப்படுத்தவும்."
                  : "சரிபார்க்க வேண்டிய எண்ணை உள்ளிட்டு சமர்ப்பிக்கவும்."}
              </Text>
            </View>

            {verified ? (
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <View style={styles.row}>
                    <Text style={styles.label}>பெயர்</Text>
                    <Text style={[styles.value, styles.prominentValue]}>
                      {matchedVoter?.Name ?? "-"}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.label}>வாக்காளர் அடையாள எண்</Text>
                    <Text style={[styles.value, styles.prominentValue]}>
                      {matchedVoter?.Number ?? "-"}
                    </Text>
                  </View>

                  {matchedVoter?.Relation === "Father" && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.row}>
                        <Text style={styles.label}>தந்தை பெயர்</Text>
                        <Text style={styles.value}>
                          {matchedVoter?.Father_Name}
                        </Text>
                      </View>
                    </>
                  )}
                  {matchedVoter?.Relation === "Husband" && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.row}>
                        <Text style={styles.label}>கணவர் பெயர்</Text>
                        <Text style={styles.value}>
                          {matchedVoter?.Father_Name}
                        </Text>
                      </View>
                    </>
                  )}
                  {matchedVoter?.Relation === "Mother" && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.row}>
                        <Text style={styles.label}>தாய் பெயர்</Text>
                        <Text style={styles.value}>
                          {matchedVoter.Father_Name}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={styles.divider} />

                  <View style={styles.row}>
                    <Text style={styles.label}>வயது</Text>
                    <Text style={styles.value}>{matchedVoter?.age ?? "-"}</Text>
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.label}>பாலினம்</Text>
                    <Text style={styles.value}>{matchedVoter?.sex ?? "-"}</Text>
                  </View>

                  {isMatchedVoterVerified ? (
                    <View style={styles.verifiedSuccessWrap}>
                      <View style={styles.verifiedSuccessCircle}>
                        <Feather name="check" size={38} color="#FFFFFF" />
                      </View>
                      <Text style={styles.verifiedSuccessTitle}>
                        {verifiedDisplayText}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actions}>
                  <Pressable
                    disabled={isMatchedVoterVerified}
                    style={({ pressed }) => [
                      styles.badge,
                      isMatchedVoterVerified && styles.badgeDisabled,
                      pressed && !isMatchedVoterVerified && styles.badgePressed,
                    ]}
                    onPress={() => {
                      void handleMarkVerified();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isMatchedVoterVerified }}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isMatchedVoterVerified && styles.badgeTextDisabled,
                      ]}
                    >
                      {isMatchedVoterVerified
                        ? verifiedDisplayText
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
              </View>
            )}
          </View>
        </ScrollView>
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
                <Text style={styles.modalLoadingText}>
                  Loading booth numbers...
                </Text>
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
  content: {
    flexGrow: 1,
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
