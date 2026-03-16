import { postUserDetails } from '@/hooks/api/postUserDetails';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { styles } from './style';


export default function Splashscreen() {
  const navigation = useNavigation<any>();
  const [isConnected, setIsConnected] = useState(true);
  const dispatch=useDispatch()
// for encrypt the key
//   const currentDate = new Date();
//   const key = "InfoGreen#!@#$%" + currentDate.getHours().toString().padStart(2, '0') + currentDate.getMinutes().toString().padStart(2, '0');
//   const plaintext = 'InfoGreen_App';
  
//   // Encrypt
//   const ciphertext = CryptoJS.AES.encrypt(plaintext, key).toString();
//   const encryptKey={ciphertext}
 


  // Timer for excecuting the splashscreen and checking the user status
  useEffect(() => {
    setTimeout(() => {
      checkNetworkStatus();
    }, 2000);
  }, []);


// Function to check network status before entering into webview

  const checkNetworkStatus = () => {
    NetInfo.fetch().then(state => {
    //   setIsConnected(state.isConnected);
      if (!state.isConnected) {
        navigation.navigate('Network'); // Navigate to network error page
      } else {
        checkUserDetails();
      }
    });
  };
  

 
  
  //  cross check the user details for navigate to webview page if user details is null it navigate to welcome page
  const checkUserDetails = async () => {
    // const logs=await getLogs()
    try {
      const savedUserDetails = await AsyncStorage.getItem('userDetails');
      if (!savedUserDetails) {
        navigation.navigate('WelcomeScreen');
      } else {
        const userDetails = JSON.parse(savedUserDetails);
        if(userDetails!==null ||userDetails!==undefined){
          const details=await postUserDetails(userDetails)
          dispatch({ type: 'POST_USER_SUCCESS', payload: details });
          // console.log("details",details);
          // Check if biometric authentication is supported once it supported whenever the user open the app it asking finger print authentication
        } 
      }
    } catch (error) {
      console.error('Error checking user details:', error);
    }
  };
  return (
    <View
      style={{
        backgroundColor: 'white',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        
      }}>
      <Image
        style={styles.tinyLogo}
        source={require('../../assets/images/SplashScreen.jpg')} 
      />
    </View>
  );
}
