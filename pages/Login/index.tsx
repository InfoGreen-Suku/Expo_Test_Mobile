import Entypo from "@expo/vector-icons/Entypo";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from "react-native";

import { useAuth } from "@/auth/AuthContext";
import DeviceInfo from "react-native-device-info";
import { styles } from "./style";
export default function Login() {
  const navigation = useNavigation<any>();
  const { signInLocal } = useAuth();
  const s = styles as any;
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [userType, setUserType] = useState<"user" | "admin">("user");

  const [mobileNumberError, setMobileNumberError] = useState("");
  const [nameError, setNameError] = useState("");
  const [userTypeError, setUserTypeError] = useState("");
  const [deviceID, setDeviceID] = useState("");

  useEffect(() => {
    getAllDeviceInfo();
  }, []);

  // handle BackButton for moving back to the previous page or exit app.
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        navigation.goBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const getAllDeviceInfo = async () => {
    try {
      const [androidID] = await Promise.all([DeviceInfo.getAndroidId()]);
      setDeviceID(androidID);
    } catch (error) {
      console.error("Error getting device info:", error);
    }
  };

  const handleRegister = async () => {
    if (name === "" || mobileNumber === "") {
      setNameError("பெயர் தேவையானவை");
      setMobileNumberError("தொலைபேசி எண் தேவையானவை");
      return;
    }
    if (mobileNumber.trim().length !== 10) {
      setMobileNumberError("தொலைபேசி எண்ணைச் சரிபார்க்கவும்");
      return;
    }

    // Admin-only restriction (User has no restriction)
    if (userType === "admin") {
      const DEFAULT_ADMIN = {
        name: "admin",
        mobileNumber: "9874563210",
      } as const;

      const nameOk =
        name.trim().toLowerCase() === DEFAULT_ADMIN.name.toLowerCase();
      const mobileOk = mobileNumber.trim() === DEFAULT_ADMIN.mobileNumber;

      if (!nameOk || !mobileOk) {
        setUserTypeError("Admin விவரங்கள் தவறாக உள்ளது");
        return;
      }
    }

    const payload = {
      name,
      mobileNumber,
      deviceID,
    };

    console.log("payload", payload);
    await signInLocal({
      name: payload.name,
      mobileNumber: payload.mobileNumber,
      deviceId: payload.deviceID,
      userType,
    });
  };

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Container with Form */}
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>வரவேற்கிறோம்</Text>
              <Text style={styles.cardSubtitle}>
                உங்கள் பெயரும் தொலைபேசி எண்ணும் உள்ளிட்டு தொடரவும்
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <View style={s.userTypeToggle}>
                  <Pressable
                    style={({ pressed }) => [
                      s.userTypeOption,
                      userType === "user" && s.userTypeOptionSelected,
                      pressed && s.userTypeOptionPressed,
                    ]}
                    onPress={() => {
                      setUserType("user");
                      setName("");
                      setMobileNumber("");
                      setUserTypeError("");
                      setNameError("");
                      setMobileNumberError("");
                    }}
                  >
                    <Text
                      style={[
                        s.userTypeOptionText,
                        userType === "user" && s.userTypeOptionTextSelected,
                      ]}
                    >
                      User
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      s.userTypeOption,
                      userType === "admin" && s.userTypeOptionSelected,
                      pressed && s.userTypeOptionPressed,
                    ]}
                    onPress={() => {
                      setUserType("admin");
                      setName("");
                      setMobileNumber("");
                      setUserTypeError("");
                      setNameError("");
                      setMobileNumberError("");
                    }}
                  >
                    <Text
                      style={[
                        s.userTypeOptionText,
                        userType === "admin" && s.userTypeOptionTextSelected,
                      ]}
                    >
                      Admin
                    </Text>
                  </Pressable>
                </View>
                {userTypeError ? (
                  <Text style={styles.errorText}>{userTypeError}</Text>
                ) : null}
              </View>
              {/* Name Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>பெயர்</Text>
                <View style={styles.inputContainer}>
                  <Entypo
                    name="user"
                    size={20}
                    color="#6B7280"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="பெயரை உள்ளிடவும்"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      setNameError("");
                      setUserTypeError("");
                    }}
                    onFocus={() => setNameError("")}
                  />
                </View>
                {nameError ? (
                  <Text style={styles.errorText}>{nameError}</Text>
                ) : null}
              </View>

              {/* Phone Number Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>தொலைபேசி எண்</Text>
                <View style={styles.inputContainer}>
                  <Feather
                    name="phone"
                    size={20}
                    color="#6B7280"
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="தொலைபேசி எண்"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={mobileNumber}
                    onChangeText={(text) => {
                      const filteredText = text
                        .replace(/[^0-9]/g, "")
                        .slice(0, 10);
                      setMobileNumber(filteredText);
                      setMobileNumberError("");
                      setUserTypeError("");
                    }}
                    maxLength={10}
                    onFocus={() => setMobileNumberError("")}
                  />
                </View>
                {mobileNumberError ? (
                  <Text style={styles.errorText}>{mobileNumberError}</Text>
                ) : null}
              </View>

              {/* Register Button */}
              <TouchableHighlight
                onPress={handleRegister}
                style={styles.createAccountButton}
                underlayColor={"#1D4ED8"}
              >
                <Text style={styles.createAccountButtonText}>
                  சமர்ப்பிக்கவும்
                </Text>
              </TouchableHighlight>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
