import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSelector } from 'react-redux';
import { styles } from "./style";
export default function Pin() {
  const [pin, setPin] = useState(["", "", "", ""]); // State to store PIN input
  const [error, setError] = useState(false); // State to store the stored PIN
  const [modalVisible, setModalVisible] = useState(false);
    const userData = useSelector((state:any) => state.user.userData);
  const navigation = useNavigation<any>();
  console.log("userData_PIN",userData.authentication_pin);

  // Handle digit press
  const handleDigitPress = (digit: any) => {
    setError(false);
    const newPinArray = [...pin];
    const index = newPinArray.findIndex((item) => item === "");
    if (index !== -1) {
      newPinArray[index] = digit;
      setPin(newPinArray);
      // If all digits are filled, check the PIN
      console.log(newPinArray);

      if (newPinArray.every((item) => item !== "")) {
        if(userData && userData.authentication_pin){
            checkPin(newPinArray.join(''));
        }
      }
    }
  };
  useEffect(() => {
    if (userData && userData.authentication_preference === 'fingerprint') {
      fingerprint(); // Trigger fingerprint authentication
    }
  }, [userData]);

  // Handle backspace press
  const handleBackspacePress = () => {
    const newPinArray = [...pin];
    const index = newPinArray.findLastIndex((item) => item !== "");
    if (index !== -1) {
      newPinArray[index] = "";
      setPin(newPinArray);
    }
  };

  // Check entered PIN against stored PIN
  const checkPin = (enteredPin: any) => {
      if (enteredPin === userData.authentication_pin) {
        setPin(['', '', '', '']);
        navigation.navigate('Webview')
      } else {
            setError(true)
            setPin(['', '', '', '']);
      }
  };

  // Forget PIN process
  const forgetPin = () => {
    setModalVisible(true);
  };

  // Render the PIN circles
  const renderPin = () => {
    return pin.map((digit, index) => (
      <View key={index} style={styles.pinCircle}>
        {digit !== "" && <View style={styles.pinText}></View>}
      </View>
    ));
  };

  // Biometric authentication
  const fingerprint = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
      });
  
      if (result.success) {
        // Navigate or unlock app
        navigation.navigate('Webview');
      } else {
        Alert.alert('Authentication Failed', 'Please try again or use your PIN.');
      }
    } else {
      Alert.alert(
        'Biometric not supported',
        'Your device does not support biometric authentication or it is not enabled.'
      );
    }
  };
  
  // };

  // Render the numeric keypad buttons
  const renderKeypad = () => {
    const buttons = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      ["Biometric", 0, "Back"],
    ];

    return buttons.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.keypadRow}>
        {row.map((item) => (
          <TouchableOpacity
            key={item}
            style={styles.keypadButton}
            onPress={() => {
              if (item === "Back") {
                handleBackspacePress();
              } else if (item === "Biometric") {
                  fingerprint();
              } else {
                handleDigitPress(item);
              }
            }}
          >
            {item === "Back" ? (
              <Ionicons name="backspace-outline" size={35} color="#000" />
            ) : item === "Biometric" ? (
              <Ionicons name="finger-print-sharp" size={35} color="#000" />
            ) : (
              <Text style={styles.keypadButtonText}>{item}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    ));
  };
  const B = (props: any) => (
    <Text style={{ fontWeight: "bold" }}>{props.children}</Text>
  );

  return (
    <View style={styles.maniContainer}>
      <View
        style={styles.TextContainer}
      >
        <Text
          style={styles.text1}
        >
          Enter PIN to Access your Account
        </Text>
        <View style={styles.pinContainer}>{renderPin()}</View>
        <View style={styles.keypadContainer}>
          {error ? (
            <Text
              style={styles.errorText}
            >
              Wrong PIN!
            </Text>
          ) : (
            <TouchableOpacity onPress={forgetPin}>
              <Text
                style={styles.forgetPinText}
              >
                Forget your PIN?
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ marginTop: 60 }}>{renderKeypad()}</View>
        </View>
      </View>


      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalView}>
          <Text
            style={styles.modalText1}
          >
            We're sorry, but it seems you've forgotten your PIN. Please contact
            our administrator for assistance.
          </Text>
          <Text
            style={styles.modalText2}
          >
            Support Hours: Monday to Saturday, 9 AM - 5 PM.
          </Text>
          <Text
            style={styles.modalText3}
          >
            Mobile: <B>9566950467</B> {"\n"} Email: <B>support@infogreen.in</B>{" "}
            .
          </Text>
          <TouchableOpacity
            style={styles.modalBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalBtnText}>Ok</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
