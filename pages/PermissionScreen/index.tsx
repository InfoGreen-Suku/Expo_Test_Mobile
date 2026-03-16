import { scaleFont } from '@/constants/ScaleFont';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Image, ImageBackground, Linking, PermissionsAndroid, Platform, Text, TouchableOpacity, View } from 'react-native';
import { OneSignal } from 'react-native-onesignal';
import { styles } from './style';

export default function PermissionScreen() {
  const navigation = useNavigation<any>();
  const [allPermissionsGranted, setAllPermissionsGranted] = useState(false);

//   useEffect(()=>{
// checkPermission
//   },[])

async function checkPermission() {
  const isAndroid10OrAbove = Platform.OS === 'android' && Number(Platform.Version) >= 29; // Android 10 (API level 29) or above
  // const permissionsToRequest = isAndroid10OrAbove 
  //   ? [PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION,
  //     PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  //     PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  //     PermissionsAndroid.PERMISSIONS.CAMERA,
  //   ]
  //   : [
  //     PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  //     PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  //     PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  //     PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  //     PermissionsAndroid.PERMISSIONS.CAMERA,
  //   ];

  try {
    // const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
    // const notification = await OneSignal.Notifications.requestPermission(true);
    
    // const allGranted = Object.values(results).every(
    //   result => result === PermissionsAndroid.RESULTS.GRANTED
    // ) || notification;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    const allGranted = result === PermissionsAndroid.RESULTS.GRANTED;

      if (!allGranted) {
        Alert.alert(
          'Permission Required',
          'Without permission you cannot access the app.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            },
          ],
        );
    } else {
      navigation.navigate('Webview');
    }
  } catch (err) {
    console.warn(err);
    Alert.alert('Error', 'Failed to request permissions');
  }
}

const requestPermissions = async (isAndroid10OrAbove: boolean) => {
  try {
    const permissions = isAndroid10OrAbove 
      ? [PermissionsAndroid.PERMISSIONS.ACCESS_MEDIA_LOCATION,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.CAMERA,

      ]
      : [
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        PermissionsAndroid.PERMISSIONS.CAMERA,


        ];

    let allGranted = true;

    for (const permission of permissions) {
      const granted = await PermissionsAndroid.request(
        permission,
        {
          title: 'Permission Request',
          message: 'App needs access to your storage to save Files',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || granted === PermissionsAndroid.RESULTS.DENIED) {
        allGranted = false;
        break;
      }
    }

    const notification = await OneSignal.Notifications.requestPermission(true);
    if (!notification) {
      allGranted = false;
    }

    if (allGranted) {
      setAllPermissionsGranted(true);
      navigation.navigate('Webview');
      // openAppSettings()
    } else {
      setAllPermissionsGranted(false);
      Alert.alert(
        'Permission',
        'Please go to the App settings and provide the permission',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  } catch (err) {
    console.warn(err);
    return false;
  }
};

const openAppSettings = () => {
  Linking.openSettings().catch(() => {
    Alert.alert('Unable to open settings', 'Please open the settings manually.');
  });
};
  return (
    <ImageBackground source={require("../../assets/images/permission.png")} style={styles.ImageBackground} resizeMode="cover">
     <View style={{ flex: 1, alignItems: 'center'}}>
        <View style={{ marginTop: scaleFont(120) }}>
            <Image source={require("../../assets/images/Logo.png")} style={styles.Logo} />
        </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.text1}>Permission Needed</Text>
        <Text style={styles.text2}>Please allow the app to function properly by granting the required permissions. Thanks!</Text>
      </View>
      <View style={{ marginTop: 40 }}>
      <TouchableOpacity style={styles.btn} onPress={() => checkPermission()} >
      <Text style={styles.btnText}>Allow</Text>
      </TouchableOpacity>
      </View>
    </View>
    </ImageBackground>
   
  );
}
