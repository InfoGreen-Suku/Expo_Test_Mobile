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

export default function Home() {
  const [modalVisible, setModalVisible] = useState(false);
  const [numberValue, setNumberValue] = useState("");
  const [verified, setVerified] = useState(false);

  const dummyProfile = useMemo(
    () => ({
      name: "அருண் குமார்",
      voterId: "TN/01/1234567890",
    }),
    [],
  );

  useEffect(() => {
    setModalVisible(true);
  }, []);

  const canSubmit = useMemo(() => numberValue.trim().length > 0, [numberValue]);

  const handleSubmit = () => {
    const value = numberValue.trim();
    if (!value) return;

    setVerified(true);
    setModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={styles.heroBg} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stack}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>முகப்பு</Text>
            <Text style={styles.heroSubtitle}>
              உங்கள் விவரங்களை சரிபார்க்க கீழே தகவல்கள் காட்டப்படும்.
            </Text>
          </View>

          {verified ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>பெயர்</Text>
                <Text style={styles.value}>{dummyProfile.name}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>வாக்காளர் அடையாள எண்</Text>
                <Text style={styles.value}>{dummyProfile.voterId}</Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>சரிபார்க்கப்பட்டது</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>தொடர, எண்ணை சமர்ப்பிக்கவும்.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          // Prevent closing via Android back button
        }}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>எண்ணை உள்ளிடவும்</Text>
            <Text style={styles.modalSubtitle}>
              சரிபார்க்க வேண்டிய எண்ணை உள்ளிட்டு சமர்ப்பிக்கவும்
            </Text>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
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
            </KeyboardAvoidingView>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: "#16A34A",
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
    maxWidth: 420,
    alignSelf: "center",
  },
  hero: {
    paddingHorizontal: 6,
    paddingTop: 12,
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
    borderColor: "#DCFCE7",
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    minHeight: 170,
  },
  emptyCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    minHeight: 120,
  },
  emptyText: {
    color: "#14532D",
    fontSize: 14,
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
    color: "#14532D",
    fontWeight: "700",
  },
  value: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  badge: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#166534",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#052E16",
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: "#166534",
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
    backgroundColor: "#16A34A",
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
});
