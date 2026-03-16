import AntDesign from "@expo/vector-icons/AntDesign";
import * as Location from "expo-location";
import * as ExpoPrint from "expo-print";
import * as SMS from "expo-sms";
import * as StoreReview from "expo-store-review";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Modal,
  PermissionsAndroid,
  Platform,
  Text,
  ToastAndroid,
  View,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import Share from "react-native-share";

import { scaleFont } from "@/constants/ScaleFont";
import { PermissionModal } from "@/constants/utils/permissionModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { CameraType, CameraView } from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import { useShareIntent } from "expo-share-intent";
import { Linking } from "react-native";
import DeviceInfo from "react-native-device-info";
import { WebView } from "react-native-webview";
import { useDispatch, useSelector } from "react-redux";
import { styles } from "./style";

export default function Webview() {
  const users = useSelector((store: any) => store?.user?.userData);
  const URL = users?.url;
  const SharedFile_URL = useSelector(
    (store: any) => store?.user?.SharedFile_URL
  );
  const Image_URL = useSelector((store: any) => store?.user?.Image_URL);
  const Audio_URL = useSelector((store: any) => store?.user?.Audio_URL);
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [lastBackPress, setLastBackPress] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [state, setstate] = useState(false);
  const [location, setLocation] = useState<any | null>(null);
  const userStatus = useSelector((store: any) => store?.user?.userData?.status);
  const isReminderServiceEnabled = useSelector(
    (store: any) => store?.user?.isReminderServiceEnabled
  );
  const navigation = useNavigation<any>();
  const [Location_Id, setLocation_Id] = useState(null);
  const [bardcode_id, setbardcode_id] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannedDataArray, setScannedDataArray] = useState<any[]>([]);
  const [DownloadmodalVisible, setDownloadModalVisible] = useState(false);
  const [PrintmodalVisible, setPrintModalVisible] = useState(false);
  const [AndroidID, setAndroidID] = useState("");
  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntent();
  //  whatsapp message
  const [messagesSent, setMessagesSent] = useState<any[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [appStateListenerActive, setAppStateListenerActive] = useState(false);
  const [Image_Url_Id, setImage_Url_Id] = useState("");
  const [audio_Url_Id, setaudio_Url_Id] = useState("");
  const [messages, setmessages] = useState([]);
  const [facing, setFacing] = useState<CameraType>("back");
  const [appOpenCount, setAppOpenCount] = useState(0);
  const lastReviewRequest = useRef<number>(0);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [subscriptionID, setSubscriptionID] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const canGoBackRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const hasPostedRef = useRef(false);
  const dispatch = useDispatch();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  // Function to check network status if network is not detected it navigate to network page

  // const callHtmlFunction = () => {
  //   if (webViewRef.current) {
  //     // Replace 'yourHtmlFunction()' with the name of your function in the HTML
  //     webViewRef.current.injectJavaScript('getLocation()');
  //   }
  // };
  // // callHtmlFunction();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      console.log("📩 Received share intent:", shareIntent);

      // Check if files exist
      if (shareIntent.files && shareIntent.files.length > 0) {
        shareIntent.files.forEach((item: any) => {
          const filePath = item.uri || item.path;
          const fileExtension = filePath
            ? filePath.substring(filePath.lastIndexOf(".") + 1).toLowerCase()
            : null;

          if (filePath) {
            switch (fileExtension) {
              case "pdf":
                console.log(`PDF File: ${filePath}`);
                break;
              case "jpg":
              case "jpeg":
                console.log(`JPG File: ${filePath}`);
                break;
              case "mp4":
                console.log(`MP4 File: ${filePath}`);
                break;
              case "mp3":
                console.log(`MP3 File: ${filePath}`);
                break;
              default:
                console.log(`Unknown File Type: ${filePath}`);
            }
            navigation.navigate("Sharedfile", { filepath: filePath });
          }
        });
      }
      // Check if there is shared text / web link
      else if (shareIntent.text || shareIntent.webUrl) {
        const sharedContent = shareIntent.webUrl || shareIntent.text;
        if (sharedContent) {
          console.log(`URL/Text: ${sharedContent}`);
          navigation.navigate("Sharedfile", { filepath: sharedContent });
        }
      }

      // Clear after handling
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent]);

  // NetInfo.fetch().then(state => {
  //   console.log("Connection type:", state.type);
  //   console.log("Is connected:", state.isConnected);
  //   console.log("Details:", state.details); // May include ssid, strength, etc.
  // });

  useEffect(() => {
    if (isCameraOpen) {
      setScanned(false);
    }
  }, [isCameraOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      sendNextMessage();
    }
  }, [messages]);

  useEffect(() => {
    if (deviceInfo && !hasPostedRef.current) {
      hasPostedRef.current = true;
    }
  }, [deviceInfo]);
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


  const checkAndRequestReview = async () => {
    console.log(appOpenCount);

    try {
      // Only request review if:
      // 1. The app has been opened at least 5 times
      // 2. It's been at least 7 days since the last review request
      // 3. The device is capable of showing the review dialog
      const now = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      if (
        appOpenCount === 5 &&
        (await StoreReview.hasAction()) &&
        (await StoreReview.isAvailableAsync())
      ) {
        await StoreReview.requestReview();
        lastReviewRequest.current = now;
      }
    } catch (error) {
      console.log("Error requesting review:", error);
    }
  };

  const getId = async () => {
    const id = await AsyncStorage.getItem("subscriptionId");
    setSubscriptionID(id);
  };

  const checkPermissions = async () => {
    const isAndroid10OrAbove =
      Platform.OS === "android" && Number(Platform.Version) > 31;

    if (isAndroid10OrAbove) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (!granted) {
        navigation.navigate("PermissionScreen");
      }
    }


  };


  useEffect(() => {

    NetInfo.fetch().then(state => {
      if (!state.isConnected) {
        navigation.navigate('Network'); // Navigate to network error page
      }
    });
    // getting androidID
    DeviceInfo.getAndroidId().then((androidId) => {
      setAndroidID(androidId);
    });
    const appversion = DeviceInfo.getBuildNumber();
    setAppVersion(appversion);
    getId();
    // checkPermissions();
    getAllDeviceInfo();
    // Handle app state changes for review

    // location getting

    // passing the value to webview component to display the value
    if (location) {
      const dynamicId = Location_Id;
      const script = `
        (function() {
          const element = document.getElementById('${dynamicId}');
          if (element) {
            element.value = '${location.coords.latitude},${location.coords.longitude}';
            // Optionally, trigger an event if needed
            element.dispatchEvent(new Event('change'));
          }
        })();
      `;
      webViewRef.current.injectJavaScript(script);
    }
    scannedDataArray.forEach((scannedData, index) => {
      if (scannedData) {
        const dynamicId = bardcode_id;
        const script = `
        (function() {
          const element = document.getElementById('${dynamicId}');
          if (element) {
            element.value = '${scannedData}';
            // Optionally, trigger an event if needed
            element.dispatchEvent(new Event('change'));
          }
        })();
      `;
        webViewRef.current.injectJavaScript(script);
      }
    });
    if (Image_URL !== null && webViewRef.current) {
      const Imageurl = JSON.stringify(Image_URL);
      const dynamicId = Image_Url_Id;
      const script = `
        (function() {
          const element = document.getElementById('${dynamicId}');
          if (element) {
            element.value = '${Imageurl}';
            // Optionally, trigger an event if needed
            element.dispatchEvent(new Event('change'));
          }
        })();
      `;
      webViewRef.current.injectJavaScript(script);
    }

    if (Audio_URL !== null && webViewRef.current) {
      const Audiourl = JSON.stringify(Audio_URL);
      const dynamicId = audio_Url_Id;
      const script1 = `
        (function() {
          const element = document.getElementById('${dynamicId}');
          if (element) {
            element.value = '${Audiourl}';
            // Optionally, trigger an event if needed
            element.dispatchEvent(new Event('change'));
          }
        })();
      `;
      webViewRef.current.injectJavaScript(script1);
    }

    if (SharedFile_URL !== null && webViewRef.current) {
      const SharedFileURL = JSON.stringify(SharedFile_URL);
      const script1 = `
        (function() {
          const element = document.getElementById('Sharedfile_URL');
          if (element) {
            element.value = '${SharedFileURL}';
            // Optionally, trigger an event if needed
            element.dispatchEvent(new Event('change'));
          }
        })();
      `;
      webViewRef.current.injectJavaScript(script1);
    }
    // message to whatsapp
    const handleAppStateChange = (nextAppState: any) => {
      if (
        messages.length > 0 &&
        messagesSent.length < messages.length &&
        nextAppState === "active"
      ) {
        setTimeout(() => {
          // Navigate back to the WebView's initial state or a specific page
          if (webViewRef.current) {
            webViewRef.current.goBack();
          }
          // Proceed to the next message
          setCurrentMessageIndex((prevIndex) => prevIndex + 1);
          sendNextMessage();
        }, 100);
      }
    };

    if (appStateListenerActive) {
      const subscription = AppState.addEventListener(
        "change",
        handleAppStateChange
      );
      return () => {
        subscription.remove();
      };
    }

    // Handle hardware back press for moving previous page and exit the app

    const reviewSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App has come to the foreground
          setAppOpenCount((prev) => prev + 1);
          checkAndRequestReview();
        }

        setAppState(nextAppState);
      }
    );

    return () => {
      reviewSubscription.remove();
      // Remove event listener when component unmounts
    };
  }, [
    userStatus,
    location,
    scannedDataArray,

    lastBackPress,
    webViewRef,
    appStateListenerActive,
    messagesSent,
    currentMessageIndex,
    Image_URL,
    Audio_URL,
    SharedFile_URL,
    appOpenCount,
    appState,
  ]);

  useEffect(() => {
    const backAction = () => {
      console.log("canGoBackRef.current:", canGoBackRef.current);
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        lastBackPressRef.current = 0; // Reset timer when going back in WebView
        return true;
      }

      const now = Date.now();
      if (lastBackPressRef.current && now - lastBackPressRef.current < 2000) {
        console.log("Exiting app");
        BackHandler.exitApp(); // exit app on second press
        console.log("Exiting app 2");
        return true;
      }
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
      lastBackPressRef.current = now;
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const injectScript = `


(function() {
      // Override the function to capture its parameters
      window.WhatsappApi = function(data) {
        if(data){
          const jsonString=data;
          try{
            const parsedJson=JSON.parse(jsonString);
            const modifyData=parsedJson.map(item=>({id:item.id,message:item.Message,number:item.phoneNumber}))
            window.ReactNativeWebView.postMessage("send"+"&SPLIT&"+JSON.stringify(modifyData));
          }
          catch (error){
            console.log("catch error",error)
          }
        }else{
        console.log("data not found")
        }
         
      };
    })();

(function() {
      // Override the function to capture its parameters
      window.sendSMS = function(phone, message) {
        window.ReactNativeWebView.postMessage("sms" + "&SPLIT&" + phone + "&SPLIT&" + message);
      };
    })();
(function() {
      // Override the function to capture its parameters
      window.Share = function(Pdfname, Number,DataRef) {
        window.ReactNativeWebView.postMessage("print" + "&SPLIT&" + DataRef +"&SPLIT&"+ Pdfname +"&SPLIT&"+ Number);
      };
    })();

    (function() {
      // Override the function to capture its parameters
      window.pdfPreview = function(DataRef) {
        window.ReactNativeWebView.postMessage("pdf"+"&SPLIT&"+DataRef);
      };
    })();

     (function() {
      // Override the function to capture its parameters
      window.camera = function(ClientID,DataRef,Idname) {
        window.ReactNativeWebView.postMessage("camera"+ "&SPLIT&" + DataRef + "&SPLIT&" + ClientID+"&SPLIT&"+Idname);
      };
    })();

    (function() {
      // Override the function to capture its parameters
      window.audio = function(ClientID,DataRef,Idname) {
        window.ReactNativeWebView.postMessage("record"+ "&SPLIT&" + DataRef + "&SPLIT&" + ClientID+"&SPLIT&"+Idname);
      };
    })();

    (function() {
      // Override the function to capture its parameters
      window.call = function(DataRef) {
        window.ReactNativeWebView.postMessage("Number"+"&SPLIT&"+DataRef);
      };
    })();

     (function() {
      // Override the function to capture its parameters
      window.popup = function(DataRef,name) {
        window.ReactNativeWebView.postMessage("openLink"+"&SPLIT&"+DataRef+"&SPLIT&"+name);
      };
    })();
    (function() {
      // Override the function to capture its parameters
      window.Screenshot = function() {
        window.ReactNativeWebView.postMessage("Share_pdf"+"&SPLIT&"+window.location.href);
      };
    })();

    (function() {
      // Override the function to capture its parameters
      window.getLocation = function(IDname) {
        window.ReactNativeWebView.postMessage("location"+"&SPLIT&"+IDname);
      };
    })();

    (function() {
      // Override the function to capture its parameters
      window.getBarcode = function(IDname) {
        window.ReactNativeWebView.postMessage("barcode"+"&SPLIT&"+IDname);
      };
    })();

`;
  // send sms
  const sendMessageSMS = async (message: string, number: string) => {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const { result } = await SMS.sendSMSAsync([number], message);
        console.log("SMS sent successfully", result);
      } else {
        Alert.alert("Error", "SMS is not available on this device");
      }
    } catch (error) {
      console.error("Failed to send SMS", error);
      Alert.alert("Error", "Failed to send SMS");
    }
  };
  // message to whatsapp
  const sendMessageToWhatsApp = async (message: any, number: any) => {
    try {
      let deepLink = `whatsapp://send?text=${encodeURIComponent(message)}`;

      // If a number is provided, add it to the deep link
      if (number) {
        deepLink += `&phone=${number}`;
      }

      await Linking.openURL(deepLink);
    } catch (error: any) {
      console.log("Error sharing to WhatsApp:", error.message);
    }
  };

  const sendNextMessage = async () => {
    // // Normal message sending flow
    if (currentMessageIndex === messages.length) {
      // If the current index is equal to the length of messages array, reset index to 0
      setCurrentMessageIndex(0);
    } else {
      const { message, number } = messages[currentMessageIndex];
      try {
        await sendMessageToWhatsApp(message, number);
        setMessagesSent([...messagesSent, { message, number }]);
        setCurrentMessageIndex(currentMessageIndex + 1);
        setAppStateListenerActive(true); // Activate app state listener after sending a message
      } catch (error: any) {
        console.log("Error sending message:", error.message);
      }
    }
  };
  // convert url to pdfand share without print
  const URLtoShare = async (url: string) => {
    try {
      setDownloadModalVisible(true);

      // Fetch the URL content
      const response = await fetch(url);
      const htmlContent = await response.text();

      // Convert to PDF using Expo Print
      const { uri } = await ExpoPrint.printToFileAsync({
        html: htmlContent,
        width: 612, // Letter size width in points
        height: 792, // Letter size height in points
      });

      setDownloadModalVisible(false);

      // Share directly from generated file URI
      sharePDF(uri);
    } catch (error) {
      setDownloadModalVisible(false);
      Alert.alert("Error", "Failed to convert and share URL as PDF");
      console.error("Error in URLtoShare:", error);
    }
  };

  const sharePDF = (pdfPath: any) => {
    const shareOptions = {
      // `pdfPath` from Expo Print / FileSystem already has a valid scheme
      url: pdfPath,
      type: "application/pdf",
      title: "Share PDF File",
    };

    Share.open(shareOptions)
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        err && console.log(err);
      });
  };
  //   // convert url to pdf and navigate to print page for printing the pdf
  const convertUrlToPdf = async (
    PrintUrl: string,
    name: string,
    number: string
  ) => {
    try {
      setPrintModalVisible(true);
      const response = await fetch(PrintUrl);
      const htmlContent = await response.text();

      const { uri } = await ExpoPrint.printToFileAsync({
        html: htmlContent,
        width: 612, // Letter size width in points
        height: 792, // Letter size height in points
      });

      setPrintModalVisible(false);
      navigation.navigate("Print", {
        pdfPath: uri,
        name: name,
        number: number,
        url: PrintUrl,
      });
    } catch (error) {
      setPrintModalVisible(false);
      Alert.alert("Error converting URL to PDF", "Please try again!");
      console.log("Error converting URL to PDF:", error);
    }
  };

  //   // for linking the phone app

  const handleLinkPress = (url: any) => {
    // Check if the URL is a phone number link
    if (url.startsWith("tel:")) {
      // Open the phone dialer
      Linking.openURL(url);
      return false;
    }
    return true;
  };
  // Handle messages coming from WebView component for trigger the particular opertaion each operation have different message
  const handleWebViewMessage = (event: any) => {
    const message = event.nativeEvent.data;
    if (message) {
      const [action, index, index1, index2] = message.split("&SPLIT&");
      if (action === "location") {
        setLocation_Id(index);
        console.log("loction");
        getLocation();
      }
      if (action === "barcode") {
        requestCameraPermission();
        setbardcode_id(index);
      }
      if (action === "pdf") {
        const pdfURl = index;
        downloadpdf(pdfURl);
      }
      if (action === "sms") {
        sendMessageSMS(index1, index);
      }
      if (action === "send") {
        setmessages(JSON.parse(index));
      }
      if (action === "data") {
        const locationData = JSON.parse(index);
      }
      if (action === "record") {
        navigation.navigate("Record", { ClientId: index1, Path: index });
        setaudio_Url_Id(index2);
      }
      if (action === "camera") {
        navigation.navigate("Camera", { ClientId: index1, Path: index });
        setImage_Url_Id(index2);
      }
      if (action === "print") {
        convertUrlToPdf(index, index1, index2);
      }
      if (action === "Number") {
        console.log(index);
        handleLinkPress(index);
      }
      if (action === "Share_pdf") {
        URLtoShare(index);
        // navigation.navigate('ApiLogsScreen');
      }
      if (action === "openLink") {
        navigation.navigate("OpenLink", { link: index, name: index1 });
      }
    }
  };

  // handle the download pdf part once the user click the mentioned class name box or anything the pdf is download in user device inside the download directory

  const downloadpdf = async (pdfURl: string) => {
    const fileName = "downloaded_pdf.pdf"; // or derive from URL
    const targetDirectory = new Directory(Paths.document);
    const filePath = `${targetDirectory.uri}/${fileName}`;
    const targetFile = new File(filePath);

    try {
      setDownloadModalVisible(true);

      // Ensure directory exists
      const dirInfo = await targetDirectory.info();
      if (!dirInfo.exists) {
        await targetDirectory.create({ intermediates: true });
      }

      // ✅ Check if the file already exists
      const fileInfo = await targetFile.info();
      if (fileInfo.exists) {
        setDownloadModalVisible(false);
        Alert.alert(
          "Already Downloaded",
          "Do you want to open the existing PDF?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open", onPress: () => openPDF(targetFile.uri) },
          ]
        );
        return;
      }

      // Download if not exists
      const encodedUrl = encodeURI(pdfURl.trim());
      const downloadedFile = await File.downloadFileAsync(
        encodedUrl,
        targetFile,
        { headers: { Accept: "application/pdf" } }
      );

      setDownloadModalVisible(false);
      console.log("Finished downloading to:", downloadedFile.uri);
      Alert.alert("Process Completed", "Do you want to open PDF file?", [
        { text: "Cancel", style: "cancel" },
        { text: "Open", onPress: () => openPDF(downloadedFile.uri) },
      ]);
    } catch (error) {
      setDownloadModalVisible(false);
      Alert.alert("Failed to download PDF", "Please try again");
      console.error("Download error:", error);
    }
  };
  // once the pdf is downloaded it asking user to open or share pdf, if the user click the open button it open the pdf in same app in different page.
  const openPDF = (pdfPath: any) => {
    navigation.navigate("PDF", { pdfPath: pdfPath });
  };

  // Handle QRcode for getting the details from the mention barcode or qrcode
  const handleQRCodeScan = async (data: any) => {
    try {
      console.log("data", data);

      // Create a new array with the scanned data
      const updatedScannedDataArray = data
        ? [...scannedDataArray, data]
        : [...scannedDataArray];

      // Update the state with the new array
      setScannedDataArray(updatedScannedDataArray);

      // Close the camera
      setIsCameraOpen(false);
    } catch (error) {
      console.log("Error parsing scanned QR code data:", error);
      Alert.alert("Error", "Failed to parse scanned QR code data");
    }
  };

  const requestCameraPermission = async () => {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "This app needs access to your camera.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      setIsCameraOpen(true);
      return true;
    } else {
      setPermissionModalVisible(true);
      return false;
    }
  };

  // asking permission to user for location tracking
  const getLocation = async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "This app needs access to your location.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setModalVisible(true); // Start loading
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation(location);
          setModalVisible(false);
          console.log(
            "Location:",
            location.coords.latitude,
            location.coords.longitude
          );
        } else {
          setModalVisible(false); // Stop loading
          setPermissionModalVisible(true);
        }
      } else {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(location);
        setModalVisible(false);
        console.log(
          "Location:",
          location.coords.latitude,
          location.coords.longitude
        );
      }
    } catch (err) {
      console.log(err);
      setModalVisible(false); // Stop loading
    }
  };

  return (
    <>
      {/* here i am checking the user status for getting the link from api if user status is pending the api doesn't provide the link that case it navigate to bending screen once the status is success it will provid the link and user navigate to webview  */}

      <View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}
        >
          <View>
            <View style={styles.modalView}>
              {!state ? <ActivityIndicator size="large" color="#00ff00" /> : ""}
              <Text style={{ color: "black", fontSize: scaleFont(16) }}>
                Getting your Location....
              </Text>
            </View>
          </View>
        </Modal>
      </View>
      <WebView
        userAgent={`${appVersion}/infogreen-c-app/${AndroidID}/${subscriptionID}`}
        source={{ uri: "https://infogreen.in/test" }}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.container, styles.horizontal]}>
            <ActivityIndicator size="large" color="#00ff00" />
          </View>
        )}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={false}
        incognito={false}
        pullToRefreshEnabled={false}
        ref={webViewRef}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          canGoBackRef.current = navState.canGoBack; // keep latest value
        }}
        textZoom={100}
        injectedJavaScript={injectScript}
        onMessage={handleWebViewMessage}
        onError={(e) => {
          const { description } = e.nativeEvent;
          // console.warn("WebView Error:", description);
          Alert.alert("Page Load Error", description, [
            { text: "Retry", onPress: () => webViewRef.current?.reload() },
          ]);
        }}
      />
      <View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={DownloadmodalVisible}
          onRequestClose={() => {
            setDownloadModalVisible(!DownloadmodalVisible);
          }}
        >
          <View>
            <View style={styles.modalView}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text style={{ color: "black", fontSize: scaleFont(15) }}>
                Please wait your Pdf is Processing
              </Text>
            </View>
          </View>
        </Modal>
      </View>
      {/* for print modal */}
      <View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={PrintmodalVisible}
          onRequestClose={() => {
            setPrintModalVisible(!PrintmodalVisible);
          }}
        >
          <View>
            <View style={styles.modalView}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text style={{ color: "black", fontSize: scaleFont(15) }}>
                Please wait your Pdf is Generating
              </Text>
            </View>
          </View>
        </Modal>
      </View>
      {/* here this the part of code for handling the camera for scan QRcode  */}
      {isCameraOpen && (
        <Modal
          visible={isCameraOpen}
          onRequestClose={() => setIsCameraOpen(false)}
          animationType="slide"
        >
          <View style={styles.cameraContainer}>
            {/* Header */}
            <View style={styles.cameraHeader}>
              <Text style={styles.barcodeText}>BarCode Scanner</Text>
              <AntDesign
                name="close-circle"
                size={30}
                color="#fff"
                onPress={() => setIsCameraOpen(false)}
              />
            </View>

            {/* Camera View */}
            <View style={styles.camerabordercontainer}>
              <CameraView
                style={styles.cameraPreview}
                facing={facing}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "aztec",
                    "ean13",
                    "ean8",
                    "qr",
                    "pdf417",
                    "upc_e",
                    "datamatrix",
                    "code39",
                    "code93",
                    "itf14",
                    "codabar",
                    "code128",
                    "upc_a",
                  ],
                }}
                onBarcodeScanned={(result: any) => {
                  if (scanned) return;
                  setScanned(true);
                  if (result?.data) {
                    handleQRCodeScan(result.data);
                  }
                }}
              />
              {/* Scanner Frame Overlay */}
              <View style={styles.scannerFrame}>
                <View />
                <View />
                <View />
                <View />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {permissionModalVisible && (
        <PermissionModal
          visible={permissionModalVisible}
          onClose={() => {
            setPermissionModalVisible(false);
            Linking.openSettings();
          }}
        />
      )}
    </>
  );
}
