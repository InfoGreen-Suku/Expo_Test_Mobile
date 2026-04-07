import Entypo from "@expo/vector-icons/Entypo";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from "react-native";

import { styles } from "./style";
export default function Login() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const [mobileNumberError, setMobileNumberError] = useState("");
  const [nameError, setNameError] = useState("");

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

  const handleRegister = () => {
    if (name === "" || mobileNumber === "") {
      setNameError("பெயர் தேவையானவை");
      setMobileNumberError("தொலைபேசி எண் தேவையானவை");
      return;
    }
    navigation.navigate("Home");
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
                underlayColor={"#007a2a"}
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
