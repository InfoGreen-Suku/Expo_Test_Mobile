import { scaleFont } from "@/constants/ScaleFont";
import { postUserDetails } from "@/hooks/api/postUserDetails";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Image,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import { useDispatch, useSelector } from "react-redux";
import { styles } from "./style";
export default function PendingScreen() {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const navigation = useNavigation<any>();
  const [userDetails, setUserData] = useState<any>("");
  const dispatch = useDispatch();
  // const currentDate = new Date();
  const status = useSelector((store: any) => store?.user?.userData?.status);
  const [isApiCall, setIsApiCall] = useState<boolean>(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // const key = "InfoGreen#!@#$%" + currentDate.getHours().toString().padStart(2, '0') + currentDate.getMinutes().toString().padStart(2, '0');
  // const plaintext = 'InfoGreen_App';

  // Encrypt
  // const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();

  // getting deatils from the localstorage and passing it into the api and checking the user Status and all the details are stored under the keyword "userDetails" in api

  const handleData = async () => {
    setIsApiCall(true);
    try {
      if (userDetails !== null || userDetails !== undefined) {
        if (
          !userDetails.deviceInfo ||
          !userDetails.appName ||
          !userDetails.userId ||
          userDetails.userId.trim() === ""
        ) {
          (userDetails.deviceInfo = deviceInfo),
            (userDetails.appName = deviceInfo?.appName),
            (userDetails.userId = deviceInfo?.androidID);
        }
        AsyncStorage.setItem("userDetails", JSON.stringify(userDetails));
        const details = await postUserDetails(userDetails);
        dispatch({ type: "POST_USER_SUCCESS", payload: details });
        if (status === "success") {
          setIsApiCall(false);
          navigation.navigate("Webview");
        } else {
          setIsApiCall(false);
          setModalVisible(true);
          // navigation.navigate('Webview');
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const getAllDeviceInfo = async () => {
    try {
      const [
        androidApiLevel,
        androidID,
        brand,
        systemName,
        systemVersion,
        applicationBuildVersion,
        operatorName,
        device,
        deviceID,
        deviceName,
        fontScale,
        hardware,
        ipAddress,
        macAddress,
        manufacturer,
        modal,
        productName,
        applicationVersion,
        appName,
      ] = await Promise.all([
        DeviceInfo.getApiLevel(),
        DeviceInfo.getAndroidId(),
        DeviceInfo.getBrand(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getCarrier(),
        DeviceInfo.getDevice(),
        DeviceInfo.getDeviceId(),
        DeviceInfo.getDeviceName(),
        DeviceInfo.getFontScale(),
        DeviceInfo.getHardware(),
        DeviceInfo.getIpAddress(),
        DeviceInfo.getMacAddress(),
        DeviceInfo.getManufacturer(),
        DeviceInfo.getModel(),
        DeviceInfo.getProduct(),
        DeviceInfo.getVersion(),
        DeviceInfo.getApplicationName(),
      ]);
      const deviceInfo = {
        androidApiLevel,
        androidID,
        brand,
        systemName,
        systemVersion,
        applicationBuildVersion,
        operatorName,
        device,
        deviceID,
        deviceName,
        fontScale,
        hardware,
        ipAddress,
        macAddress,
        manufacturer,
        modal,
        productName,
        applicationVersion,
        appName,
      };
      setDeviceInfo(deviceInfo);
    } catch (error) {
      console.error("Error getting device info:", error);
    }
  };
  // handle the refresh button and checking the user status
  const handleRefresh = async () => {
    try {
      const UserData = await AsyncStorage.getItem("userDetails");
      if (UserData) {
        setUserData(JSON.parse(UserData));
      }
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    handleRefresh();
    getAllDeviceInfo();
  }, []);

  // handle backbutton for moving previous page or exit the app
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          BackHandler.exitApp();
        }
        return true;
      }
    );

    return () => backHandler.remove();
  }, [navigation]);

  const handleOk = async () => {
    try {
      if (status === "success" && userDetails.userId) {
        navigation.navigate("Webview");
        setModalVisible(false)
      }
      else{
        setModalVisible(false)
      }
    } catch (error) {
      console.log(error);
    }
  };

  // For bolding the word
  const B = (props: any) => (
    <Text style={{ fontWeight: "bold" }}>{props.children}</Text>
  );

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Image
        source={require("../../assets/images/Logo.png")}
        style={styles.Logo}
      />
      <Image
        source={require("../../assets/images/task.png")}
        style={styles.BigImage}
      />
      <Text style={styles.text}>
        We're currently processing your activation request. Please bear with us
        as we work to complete it. {"\n"} Thank you for your patience!
      </Text>
      <TouchableOpacity style={styles.Btn} onPress={handleData}>
        <Text style={styles.btnText}>Refresh</Text>
      </TouchableOpacity>
      {/* <Button
          title={'Refresh'}
          buttonStyle={{backgroundColor: '#008541'}}
          containerStyle={{width: '50%', marginTop: 20}}
          onPress={handleData}
        /> */}

      {!isApiCall && (
        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <View style={styles.modalView}>
            <Text style={styles.referenceNo}>
              Reference.No : {userDetails.userId ? userDetails.userId : "null"}
            </Text>

            <Text style={styles.modalText1}>
              We are currently processing your activation. Kindly remain patient
              while we finalize the process.
            </Text>

            <Text style={styles.modalText2}>
              For any inquiries, Please reach out to us:{" "}
            </Text>
            <Text style={styles.modalText3}>
              Mobile: <B>9566950467</B> {"\n"} Email:{" "}
              <B>support@infogreen.in</B> .
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleOk}
            >
              <Text style={styles.modalBtnText}>Ok</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isApiCall}
        onRequestClose={() => setIsApiCall(false)}
      >
        <View>
          <View style={styles.loaderModalView}>
            <ActivityIndicator size="large" color="#00ff00" />
            <Text style={{ color: "black", fontSize: scaleFont(16) }}>
              Loading....
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
