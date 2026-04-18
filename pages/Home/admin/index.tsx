import { useAuth } from "@/auth/AuthContext";
import { getDistinctBhagNos } from "@/sqlite/votersDb";
import Feather from "@expo/vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type DeviceListItem = {
  id: number;
  name: string;
  deviceID: string;
  mobileNumber: string;
  userType: "user" | "admin";
};

export default function AdminHome() {
  const { signOutLocal } = useAuth();

  const [boothNumbers, setBoothNumbers] = useState<string[]>([]);
  const [selectedBoothNumber, setSelectedBoothNumber] = useState("");
  const [isBoothModalVisible, setIsBoothModalVisible] = useState(false);
  const [isLoadingBooths, setIsLoadingBooths] = useState(false);
  const [boothSearchValue, setBoothSearchValue] = useState("");
  const [deviceSearchValue, setDeviceSearchValue] = useState("");
  const [users, setUsers] = useState<DeviceListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshingUsers, setRefreshingUsers] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await axios.get(
        "https://69e30f5f3327837a1552cc48.mockapi.io/voter/user",
      );
      setUsers(response.data);
    } catch (error) {
      console.log("Failed to load users:", error);
    }
  }, []);

  const onRefreshUsers = useCallback(async () => {
    setRefreshingUsers(true);
    try {
      await loadUsers();
    } finally {
      setRefreshingUsers(false);
    }
  }, [loadUsers]);

  const filteredBoothNumbers = useMemo(() => {
    const searchValue = boothSearchValue.trim();
    if (!searchValue) return boothNumbers;

    return boothNumbers.filter((item) => item.includes(searchValue));
  }, [boothNumbers, boothSearchValue]);

  useEffect(() => {
    const loadSavedBoothState = async () => {
      try {
        const [storedBoothNumbers] = await Promise.all([
          AsyncStorage.getItem(BOOTH_NUMBERS_STORAGE_KEY),
        ]);

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
    void loadUsers();
  }, [loadUsers]);
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

  const handleOpenBoothModal = (id: string) => {
    setSelectedUserId(id);
    setIsBoothModalVisible(true);

    void loadBoothNumbers();
  };

  const handleCloseBoothModal = () => {
    setIsBoothModalVisible(false);
    setBoothSearchValue("");
  };

  const handleBoothSelect = async (boothNumber: string) => {
    try {
      const response = await axios.put(
        `https://69e30f5f3327837a1552cc48.mockapi.io/voter/user/${selectedUserId}`,
        {
          boothNumber,
          status: 1,
          maxTime: "06:30:00PM",
        },
      );
      console.log("response", response.data);
      // setSelectedBoothNumber(boothNumber);
      handleCloseBoothModal();
    } catch (error) {
      console.log("Failed to save booth number:", error);
    }
  };

  const filteredDevices = useMemo(() => {
    const nonAdmins = users.filter((item) => item.userType === "user");
    const q = deviceSearchValue.trim().toLowerCase();
    if (!q) return nonAdmins;

    return nonAdmins.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.deviceID.toLowerCase().includes(q) ||
        item.mobileNumber.toLowerCase().includes(q)
      );
    });
  }, [users, deviceSearchValue]);

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
                {/* <Pressable
                  style={({ pressed }) => [
                    styles.logoutButton,
                    pressed && styles.logoutButtonPressed,
                  ]}
                  onPress={() => void handleLogout()}
                  accessibilityRole="button"
                >
                  <Feather name="log-out" size={18} color="#FFFFFF" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </Pressable> */}
              </View>
            </View>

            <View style={styles.entryCard}>
              <Text style={styles.entryTitle}>பயனர்கள் பட்டியல்</Text>

              <View style={styles.pageSearchWrap}>
                <Feather
                  name="search"
                  size={18}
                  color="#6B7280"
                  style={styles.pageSearchIcon}
                />
                <TextInput
                  value={deviceSearchValue}
                  onChangeText={setDeviceSearchValue}
                  placeholder="Search name / device id / phone"
                  placeholderTextColor="#9CA3AF"
                  style={styles.pageSearchInput}
                />
              </View>

              <FlatList
                style={styles.deviceList}
                data={filteredDevices}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.deviceListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingUsers}
                    onRefresh={onRefreshUsers}
                    tintColor={REFRESH_SPINNER_COLOR}
                    colors={[REFRESH_SPINNER_COLOR]}
                    progressBackgroundColor="#FFFFFF"
                  />
                }
                ListEmptyComponent={() => {
                  const hasAnyDevices = users.length > 0;
                  const hasSearch = deviceSearchValue.trim().length > 0;

                  if (!hasAnyDevices) {
                    return (
                      <Text style={styles.modalEmptyText}>No data found.</Text>
                    );
                  }

                  if (hasSearch) {
                    return (
                      <Text style={styles.modalEmptyText}>No match found.</Text>
                    );
                  }

                  return (
                    <Text style={styles.modalEmptyText}>
                      No users in this list.
                    </Text>
                  );
                }}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.deviceCard,
                      pressed && styles.deviceCardPressed,
                    ]}
                    onPress={() => handleOpenBoothModal(item.id.toString())}
                    accessibilityRole="button"
                    accessibilityLabel={`Open booth selection for ${item.name}`}
                  >
                    <Text style={styles.deviceName}>{item.name}</Text>
                    <View style={styles.deviceMetaRow}>
                      <Text style={styles.deviceMetaLabel}>Device ID</Text>
                      <Text style={styles.deviceMetaValue}>
                        {item.deviceID}
                      </Text>
                    </View>
                    <View style={styles.deviceMetaRow}>
                      <Text style={styles.deviceMetaLabel}>Phone</Text>
                      <Text style={styles.deviceMetaValue}>
                        {item.mobileNumber}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            </View>
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
              {!isLoadingBooths && boothNumbers.length === 0 ? (
                <Text style={styles.modalEmptyText}>No list found.</Text>
              ) : null}
              {!isLoadingBooths &&
              boothNumbers.length > 0 &&
              filteredBoothNumbers.length === 0 ? (
                <Text style={styles.modalEmptyText}>No match found.</Text>
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
    backgroundColor: "#ffffff",
  },
  flex: {
    flex: 1,
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "#2563EB",
    // borderBottomLeftRadius: 24,
    // borderBottomRightRadius: 24,
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
    paddingTop: 5,
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
    marginTop: 5,
    flex: 1,
    minHeight: 0,
  },
  deviceList: {
    flex: 1,
    minHeight: 0,
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
  pageSearchWrap: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 2,
  },
  pageSearchIcon: {
    marginRight: 8,
  },
  pageSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
  },
  deviceListContent: {
    paddingTop: 14,
    paddingBottom: 6,
    gap: 10,
  },
  deviceCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deviceCardPressed: {
    opacity: 0.92,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
  },
  deviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  deviceMetaLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  deviceMetaValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#1D4ED8",
    textAlign: "right",
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
