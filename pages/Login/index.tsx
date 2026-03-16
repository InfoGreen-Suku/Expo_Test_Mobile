import { postUserDetails } from '@/hooks/api/postUserDetails';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Image, KeyboardAvoidingView, Modal, PermissionsAndroid, Platform, ScrollView, Text, TextInput, TouchableHighlight, TouchableOpacity, View } from 'react-native';
import { OneSignal } from 'react-native-onesignal';

import { PermissionModal } from '@/constants/utils/permissionModal';
import BarcodeScanning from '@react-native-ml-kit/barcode-scanning';
import { CameraType, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import DeviceInfo from 'react-native-device-info';
import { useDispatch, useSelector } from 'react-redux';
import { styles } from './style';
const ScreenHeight = Dimensions.get('window').height;
export default function Login() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [appCode, setAppCode] = useState('');
  const [nameError, setNameError] = useState('');
  const [companyNameError, setCompanyNameError] = useState('');
  const [mobileNumberError, setMobileNumberError] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [AndroidID, setAndroidID] = useState('');
  const dispatch = useDispatch();
  const currentDate = new Date();
  const secretKey =
    'InfoGreen#!@#$%' +
    currentDate.getHours().toString().padStart(2, '0') +
    currentDate.getMinutes().toString().padStart(2, '0');
  const plaintext = 'InfoGreen_App';
  const isLoading = useSelector((state: any) => state.user.loading); // handle notification
  const [visible, setisvisible] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [scanned, setScanned] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  useEffect(() => {
    getAllDeviceInfo()
  }, []);

  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // const permissionGranted = await requestStoragePermission();
    // console.log(permissionGranted);
    // if (!permissionGranted) {
    //   return;
    // }
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      scanQRCodeFromFile(result.assets[0].uri)
    }
  };
  const scanQRCodeFromFile = async (uri: string) => {
    try {
      const barcodes = await BarcodeScanning.scan(uri);
      if (barcodes.length > 0) {
        console.log('QR Data:', barcodes[0].value);
        handleQRCodeScan(barcodes[0].value);
      } else {
        alert('No QR code detected in this image.');
      }
    } catch (error) {
      console.error('QR Scan Error:', error);
    }
  };
  useEffect(() => {
    if (isCameraOpen) {
      setScanned(false);
    }
  }, [isCameraOpen]);


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
        appName
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
        DeviceInfo.getApplicationName()
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
        appName
      };
      setDeviceInfo(deviceInfo);
    } catch (error) {
      console.error('Error getting device info:', error);
    }
  };

  const checkNetworkStatus = () => {
    NetInfo.fetch().then(state => {
      if (!state.isConnected) {
        navigation.navigate('Network'); // Navigate to network error page
      } else {
        saveUserDetails();
      }
    });
  };

  const checkPermissions = async () => {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (!granted) {
      setIsCameraOpen(false);
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ).then(granted => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setIsCameraOpen(true);
        }
        else {
          console.log("Permission denied");
          setIsCameraOpen(false);
          setPermissionModalVisible(true);
        }
      });
    }
    else {
      setIsCameraOpen(true);
    }
  };

  // const requestStoragePermission = async (): Promise<boolean> => {
  //   try {
  //     if (Platform.OS !== 'android') {
  //       return true;
  //     }

  //     // Android 13+ uses READ_MEDIA_IMAGES; older versions use READ_EXTERNAL_STORAGE
  //     if ((Platform as any).Version >= 33) {
  //       const res = await PermissionsAndroid.request(
  //         PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
  //       );
  //       return res === PermissionsAndroid.RESULTS.GRANTED;
  //     } else {
  //       const res = await PermissionsAndroid.request(
  //         PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  //       );
  //       return res === PermissionsAndroid.RESULTS.GRANTED;
  //     }
  //   } catch (error) {
  //     console.error('Error requesting storage permission:', error);
  //     return false;
  //   }
  // }
  // const method = 'aes-256-cbc';

  // // Generate a random IV (Initialization Vector)
  // const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes IV for AES-256-CBC

  // // Encrypt
  // const encrypted = CryptoJS.AES.encrypt(
  //   plaintext,
  //   CryptoJS.enc.Utf8.parse(secretKey),
  //   {
  //     iv: iv,
  //     mode: CryptoJS.mode.CBC,
  //     padding: CryptoJS.pad.Pkcs7,
  //   },
  // );

  // // Concatenate IV and ciphertext
  // const ciphertextWithIV = iv.concat(encrypted.ciphertext);

  // // Convert the encrypted data to a Base64 string
  // const ciphertext = ciphertextWithIV.toString(CryptoJS.enc.Base64);

  // getting androidID




  // Saving the user details and posting it into api
  const saveUserDetails = async () => {

    try {
      // Checking input field
      let isError = false;

      if (!name) {
        setNameError('Name is required');
        isError = true;
      } else {
        setNameError('');
      }

      if (!companyName) {
        setCompanyNameError('Company name is required');
        isError = true;
      } else {
        setCompanyNameError('');
      }

      if (!mobileNumber) {
        setMobileNumberError('Mobile number is required');
        isError = true;
      } else {
        setMobileNumberError('');
      }

      if (!isError) {
        // Geting SUBSCRIPTION ID
        const id =
          await OneSignal.User.pushSubscription.getIdAsync();

        // Storing to local storage
        const userId = deviceInfo.androidID;
        console.log(id);
        const userDetails = {
          userId,
          name,
          companyName,
          mobileNumber,
          appCode,
          subscriptionId: id,
          deviceInfo: deviceInfo,
          appName: deviceInfo.appName,
          // ciphertext: ciphertext,
          // key: secretKey,
        };
        // console.log(userDetails);

        await AsyncStorage.setItem('userDetails', JSON.stringify(userDetails));
        setisvisible(true);
        // store to server useing axios post method under the keyword of "userDetails"
        const details = await postUserDetails(userDetails);
        dispatch({ type: 'POST_USER_SUCCESS', payload: details });
        // console.log("details", details);
        // navigation.navigate('Webview');
        // Alert.alert('Success', 'User details stored successfully');
      }
    } catch (error) {
      console.error('Error saving user details:', error);
    }
  };
  // const codeScanner = useCodeScanner({
  //   codeTypes: ['qr'],
  //   onCodeScanned: codes => {
  //     handleQRCodeScan(codes[0].value);
  //   },
  // });
  // Handle QRcode for auto filling user details
  const handleQRCodeScan = async (data: any) => {
    try {
      const id =
        await OneSignal.User.pushSubscription.getIdAsync();
      const scannedData = JSON.parse(data);
      setIsCameraOpen(false);
      const userDetails = {
        name: scannedData.name,
        companyName: scannedData.companyName,
        mobileNumber: scannedData.mobileNumber,
        appCode: scannedData.appCode,
        deviceInfo: deviceInfo,
        appName: deviceInfo.appName,
        userId: deviceInfo.androidID,
        subscriptionId: id,
      };
      NetInfo.fetch().then(async (state: any) => {
        if (!state.isConnected) {
          navigation.navigate('Network'); // Navigate to network error page
        } else {
          await AsyncStorage.setItem('userDetails', JSON.stringify(userDetails));
          setisvisible(true);
          // store to server useing axios post method under the keyword of "userDetails"
          const details = await postUserDetails(userDetails);
          dispatch({ type: 'POST_USER_SUCCESS', payload: details });
        }
      });
    } catch (error) {
      console.error('Error parsing scanned QR code data:', error);
      Alert.alert('Error', 'Failed to parse scanned QR code data');
    }
  };

  // handle BackButton for moving back to the previous page or exit app.
  useEffect(() => {


    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true;
      },
    );




    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Illustration Image */}
          <View style={styles.imageContainer}>
            <Image
              style={styles.illustrationImage}
              source={require('../../assets/images/Logo.png')}
              resizeMode="contain"
            />
          </View>

          {/* Card Container with Form */}
          <View style={styles.cardContainer}>
            <View style={styles.formContainer}>
              
              {/* Name Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.inputContainer}>
                  <Entypo name="user" size={20} color="#6B7280" style={styles.inputIcon} />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={text => {
                      let filteredText = text.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ');
                      filteredText = filteredText.replace(/\b\w/g, char => char.toUpperCase());
                      setName(filteredText);
                      setNameError('');
                    }}
                    onFocus={() => setNameError('')}
                  />
                </View>
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
              </View>

              {/* Company Name Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Company / Institution Name</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="office-building" size={20} color="#6B7280" style={styles.inputIcon} />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="company / institution name"
                    placeholderTextColor="#9CA3AF"
                    value={companyName}
                    onChangeText={text => {
                      let filteredText = text.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ');
                      filteredText = filteredText.replace(/\b\w/g, char => char.toUpperCase());
                      setCompanyName(filteredText);
                      setCompanyNameError('');
                    }}
                    onFocus={() => setCompanyNameError('')}
                  />
                </View>
                {companyNameError ? <Text style={styles.errorText}>{companyNameError}</Text> : null}
              </View>

              {/* Phone Number Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Phone No</Text>
                <View style={styles.inputContainer}>
                  <Feather name="phone" size={20} color="#6B7280" style={styles.inputIcon} />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your mobile number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={mobileNumber}
                    onChangeText={text => {
                      const filteredText = text.replace(/[^0-9]/g, '').slice(0, 10);
                      setMobileNumber(filteredText);
                      setMobileNumberError('');
                    }}
                    maxLength={10}
                    onFocus={() => setMobileNumberError('')}
                  />
                </View>
                {mobileNumberError ? <Text style={styles.errorText}>{mobileNumberError}</Text> : null}
              </View>

              {/* Register Button */}
              <TouchableHighlight
                style={styles.createAccountButton}
                onPress={checkNetworkStatus}
                underlayColor={'#007a2a'}>
                <Text style={styles.createAccountButtonText}>Register</Text>
              </TouchableHighlight>

              {/* OR Divider */}
              <View style={styles.orDividerContainer}>
                <View style={styles.orDividerLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orDividerLine} />
              </View>

              {/* Scan QR Code Button */}
              <TouchableHighlight
                style={styles.scanQRButton}
                onPress={checkPermissions}
                underlayColor={'#f3f4f6'}>
                <View style={styles.scanQRButtonContent}>
                  <MaterialCommunityIcons name="qrcode-scan" size={20} color="#008541" />
                  <Text style={styles.scanQRButtonText}>Scan QR Code</Text>
                </View>
              </TouchableHighlight>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>


      {isCameraOpen && (
        <Modal
          visible={isCameraOpen}
          onRequestClose={() => setIsCameraOpen(!isCameraOpen)}
          animationType="slide" >
          <View style={styles.cameraContainer}>

            <View style={styles.cameraHeader}>
              <Text style={styles.barcodeText}>BarCode Scanner</Text>

              <AntDesign name="close-circle" size={30} color={'#fff'} onPress={() => setIsCameraOpen(false)} />

            </View>
            <View style={styles.camerabordercontainer}>
              <CameraView
                style={styles.cameraPreview}
                facing={facing}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
              <View style={styles.uploadButtonWrapper}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.uploadButton}
                  onPress={pickImage}
                >
                  <Feather name="image" size={20} color={'#000'} style={{ marginRight: 8 }} />
                  <Text style={styles.uploadButtonText}>Upload from gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={isLoading}>
        <View style={styles.modalView}>
          <ActivityIndicator size="large" color="#00ff00" />
        </View>
      </Modal>
      
      <PermissionModal visible={permissionModalVisible} onClose={() => setPermissionModalVisible(false)} />
    </View>
  );
};


