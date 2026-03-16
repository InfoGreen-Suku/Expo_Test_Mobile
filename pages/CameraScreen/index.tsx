import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Image,
    Linking,
    Modal,
    PermissionsAndroid,
    Platform,
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View
} from 'react-native';
import RNPhotoManipulator from 'react-native-photo-manipulator';

import { useNavigation } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDispatch } from 'react-redux';

import { scaleFont } from '@/constants/ScaleFont';
import { PermissionModal } from '@/constants/utils/permissionModal';
import { PostFile } from '@/hooks/api/PostFile';
import { CameraType, CameraView } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { styles } from './style';

const CameraScreen = ({ route }: any) => {
  const { ClientId } = route.params ?? {};
  const { Path } = route.params ?? {};
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const dispatch = useDispatch();
  const [facing, setFacing] = useState<CameraType>('back');
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState<any | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // Add loading state
  const camera = useRef<any>(null);
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [errormodalVisible, seterrorModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const switchCamera = () => {
    setFacing(prevType => (prevType === 'back' ? 'front' : 'back'));
  };

  useEffect(() => {

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Exit the app when back button is pressed on Myform page
        navigation.goBack();
        return true; // Prevent default behavior
      },
    );
    return () => backHandler.remove();
  }, []);
  // Get current date and time
  useEffect(() => {
    const date = new Date();
    setDateTime(date.toLocaleString());
    RequestPermission();
  }, []);

  // asking permission to user for location tracking
  const getLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setIsFetchingLocation(true); // Start loading

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation(location);
          setIsFetchingLocation(false);
        } else {
          setIsFetchingLocation(false); // Stop loading
        }
      } else {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(location);
      }
    } catch (err) {
      console.log(err);
      setIsFetchingLocation(false); // Stop loading
    }
  };

  const RequestPermission = async () => {
    const granted = await PermissionsAndroid.requestMultiple(
      [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION],
    );
    if (granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED && granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    } else {
      setPermissionModalVisible(true);
      return false;
    }
  };
  const takePicture = async () => {
    const permissionGranted = await RequestPermission();
    if (!permissionGranted) {
      return;
    }
    if (camera.current) {
      try {
        const photo = await camera.current.takePictureAsync({
          quality: 0.2,
          skipProcessing: true,
        });

        // Determine original dimensions
        const getSize = () => new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(
            photo.uri,
            (width, height) => resolve({ width, height }),
            (e) => reject(e),
          );
        });

        const { width: originalWidth, height: originalHeight } = await getSize();

        // Cap area to ~1MP preserving aspect ratio
        const maxPixels = 1000000; // 1 MP
        const currentPixels = originalWidth * originalHeight;
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        if (currentPixels > maxPixels) {
          const scale = Math.sqrt(maxPixels / currentPixels);
          targetWidth = Math.max(1, Math.floor(originalWidth * scale));
          targetHeight = Math.max(1, Math.floor(originalHeight * scale));
        }

        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: targetWidth, height: targetHeight } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Normalize to path without scheme to match `file://${imageUri}` usage
        const cleanedUri = manipulated.uri.startsWith('file://')
          ? manipulated.uri.replace('file://', '')
          : manipulated.uri;
        setImageUri(cleanedUri);
        setShowCamera(false);
      } catch (error) {
        Alert.alert('Failed to taking picture', 'Please retake picture!');
        console.log('Error taking picture:', error);
      }
    }
  };

  const saveImageWithWatermark = async () => {
    try {

      const timestamp = new Date().getTime();
      const filename = `captured_image_${timestamp}.jpg`;
      const targetDirectory = new Directory(Paths.document);
      const destPath = `${targetDirectory.uri}/${filename}`;
      const imageuri = `file://${imageUri}`;
      const targetFile = new File(destPath);
      const dirInfo = await targetDirectory.info();
      if (!dirInfo.exists) {
        await targetDirectory.create({ intermediates: true });
      }

      const data: any = await createWatermarkedImage(imageuri);


      const sourceFile = new File(data);
      await sourceFile.copy(targetFile);


      uploadImage(destPath);
      return destPath;
    } catch (error) {
      setModalVisible(false);
      Alert.alert('Failed to save image in device', 'Please try again');
      console.log('Error in saveImageWithWatermark:', error);
      return null;
    }
  };

  const getImageSize = (imagePath: any) => {
    return new Promise((resolve, reject) => {
      Image.getSize(
        imagePath,
        (width, height) => {
          console.log('Image size:', width, height);
          resolve({ width, height });
        },
        (error) => {
          console.error('Error getting image size:', error);
          reject(error);
        }
      );
    });
  };

  const createWatermarkedImage = async (imagePath: any) => {
    try {
      const height: any = await getImageSize(imagePath);
      console.log(height);

      const Watermark = `${dateTime} | Lat: ${location?.coords?.latitude || 'N/A'} | Long: ${location?.coords?.longitude || 'N/A'}`;

      const texts = [
        {
          position: { x: 30, y: height.height - 30 },
          text: Watermark,
          textSize: 25,
          color: '#FFFFFF',
          thickness: 3,
        },
      ];
      const resultUri = await RNPhotoManipulator.printText(imagePath, texts);
      // const resultUri = 'ghghh';
      console.log('Watermarked image saved:', resultUri);

      setModalVisible(true);
      return resultUri;
    } catch (error) {
      setModalVisible(false);
      Alert.alert('Failed to saving image with watermark', 'Please try again');
      console.log('Error saving image with watermark:', error);
      return null;
    }
  };

  // upload image to api
  const uploadImage = async (imagePath: any) => {
    try {
      const imageExists = await new File(imagePath).info();
      if (!imageExists.exists) {
        setModalVisible(false);
        Alert.alert('Failed to capture image', 'Please retake image!');
        console.log('Image file does not exist:', imagePath);
        return;
      }

      // Create FormData object
      const formData: any = new FormData();
      formData.append('image', {
        uri: `file://${imagePath}`,
        name: 'image.jpg', // You can adjust the filename as needed
        type: 'image/jpeg', // Adjust the MIME type if needed
      });
      formData.append('ClientID', ClientId);

      // Send the FormData object to the API
      const details = await PostFile(formData, Path);
      dispatch({ type: 'POST_IMAGE_SUCCESS', payload: details });
      setModalVisible(false);
      navigation.navigate('Webview');
      // Handle the response from the API
      console.log('API response:', details);
    } catch (error) {
      setModalVisible(false);
      Alert.alert('Failed to upload image', 'Please try again');
      console.log('Error sharing image with API:', error);
    }
  };

  const closeCamera = () => {
    navigation.goBack();
  };

  const retake = () => {
    setShowCamera(true);
    setImageUri(null);
  };



  return (
    <View style={{ flex: 1 }}>
      {/* <View style={{ flexDirection: 'row', gap: 40,  backgroundColor: '#008541', width: '100%', height: '7%', }} >
        <AntDesign name="close" size={scaleFont(25)} color="#fff" style={{ alignSelf: 'center', left: scaleFont(20), top: scaleFont(10), marginBottom: scaleFont(15) }}
          onPress={()=>navigation.goBack()} />
        <Text style={{ fontSize: scaleFont(20), textAlign: 'center', fontWeight: '500', color: "#fff", top: 12 }}>Camera Preview</Text>
      </View> */}
      {showCamera ? (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: scaleFont(200),
            }}>
            <CameraView ref={camera} style={{ flex: 1, width: '80%', aspectRatio: 3 / 4, marginTop: scaleFont(30) }} facing={facing} />

          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.button} onPress={closeCamera}>
              <AntDesign name="close" size={30}
                color={'#000'}
                style={{ alignSelf: 'center', padding: 8 }} />
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton}>
              <TouchableOpacity
                style={styles.captureInnerButton}
                onPress={takePicture}
              />
              <Text style={[styles.buttonText, { top: 4 }]}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={switchCamera}>
              <MaterialIcons name="cameraswitch" size={30}
                color={'#000'}
                style={{ alignSelf: 'center', padding: 8 }} />

              <Text style={styles.buttonText}>Switch</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: scaleFont(150),
            }}>
            <Image
              source={{ uri: `file://${imageUri}` }}
              style={styles.previewImage}
            />
          </View>
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.button} onPress={closeCamera}>
              <AntDesign name="close" s size={scaleFont(30)}
                color={'#000'}
                style={{ alignSelf: 'center', padding: 8 }} />

              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={saveImageWithWatermark}>
              <AntDesign name="check" size={scaleFont(35)}
                color={'#008541'}
                style={{ alignSelf: 'center', padding: 6 }} />

              <Text style={styles.buttonText}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={retake}>
              <MaterialCommunityIcons name="camera-retake-outline" size={scaleFont(30)}
                color={'#000'}
                style={{ alignSelf: 'center', padding: 8 }} />

              <Text style={styles.buttonText}>Re-Take</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View >
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}>
          <View >
            <View style={styles.modalView}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text style={{ color: 'black', fontSize: scaleFont(14) }}>
                Please wait your image is Uploading
              </Text>
            </View>
          </View>
        </Modal>
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={errormodalVisible}
        onRequestClose={() => {
          seterrorModalVisible(!errormodalVisible);
        }}>
        <View >
          <View style={styles.modalView}>
            <Text style={{ color: 'black', fontSize: scaleFont(15) }}>
              Please turn on location or check your location is enabled
            </Text>
            <TouchableHighlight
              style={{
                backgroundColor: '#008541',
                width: 80,
                marginTop: 30,
              }}
              onPress={() => {
                navigation.navigate('Webview');
                seterrorModalVisible(false);
              }}
            >
              <Text style={{ color: 'white', fontSize: scaleFont(15) }}>OK</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
      {isFetchingLocation && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isFetchingLocation}
          onRequestClose={() => setIsFetchingLocation(false)}>
          <View >
            <View style={styles.modalView}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text style={{ color: 'black', fontSize: scaleFont(15) }}>
                Fetching location, please wait...
              </Text>
            </View>
          </View>
        </Modal>
      )}
      {permissionModalVisible && (
        <PermissionModal visible={permissionModalVisible} onClose={() => {setPermissionModalVisible(false);Linking.openSettings()}} />
      )}
    </View>
  );
};



export default CameraScreen;
