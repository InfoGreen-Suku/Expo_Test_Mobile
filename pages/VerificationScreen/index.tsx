import AntDesign from '@expo/vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React from 'react';
import { BackHandler, Image, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './style';

const VerificationScreen = ({route}:any) => {
  // URL , session ID params getting from the app.js file for passing to validation link

  const navigation = useNavigation<any>();
  const {URL} = route.params ?? {};
  const {sessionId}=route.params ?? {};
  const {Name}=route.params ?? {};
 


  // passing the user validation Id to the validation link
  const passSessionID=async()=>{
    const SessionID={sessionId}
    console.log(SessionID);
    try {
      const response = await axios.post(URL,{sessionId}
      );
      // console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  }

// handle BackButton for moving back to the previous page or exit app.
  const handleRedirection = (choice: string) => {
    if (choice === 'Yes') {
      passSessionID()
      navigation.navigate("Webview")
      BackHandler.exitApp()
    } else {
      navigation.navigate("Webview")
      BackHandler.exitApp()
    }
  };


  // for bolding the particular word
  const B = (props:any) => (
    <Text style={{fontWeight: 'bold', color: '#008541'}}>{props.children}</Text>
  );
  const B1 = (props:any) => (
    <Text style={{fontWeight: 'bold', color: 'red'}}>{props.children}</Text>
  );
  return (
    <View
      style={styles.container}>
      <View style={styles.LogoContainer}>
      <Image
        source={require('../../assets/images/Logo.png')}
        style={styles.Logo}
      />
      </View>
      <Image
        source={require('../../assets/images/VerificationImage.jpg')}
        style={styles.MainImage}
      />
      <Text
        style={styles.Text1}>
        Are you trying to Sign in ?
      </Text>
      <Text style={styles.Text2}>Name</Text>
      <Text
        style={styles.Text3}>
        If you trust this attempt, please click <B>"Yes"</B> to proceed. If not
        , please click <B1>"No"</B1>.
      </Text>
      <View
        style={styles.btnContainer}>
        <TouchableOpacity onPress={() => handleRedirection('No')}
          style={styles.wrongBtn}>
          {/* <TickIcon name="close" color={'red'} size={20} /> */}
          <AntDesign name="close" size={20} color="red" />
          <Text style={styles.wrongBtnText}>No, don't allow</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleRedirection('Yes')}
          style={styles.YesBtn}>
          {/* <TickIcon name="check" color={'#008541'} size={20} /> */}
          <AntDesign name="check" size={20} color="#008541" />
          <Text style={styles.YesBtnText}>Yes, it's me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VerificationScreen;
