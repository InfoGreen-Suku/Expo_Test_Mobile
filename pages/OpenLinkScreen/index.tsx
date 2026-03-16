import { scaleFont } from '@/constants/ScaleFont';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import { styles } from './style';


export default function OpenLink({route}:any) {
    const webViewRef=useRef(null)
    const {link,name}=route.params ?? {};
    const URL=link
    const navigation=useNavigation<any>()
    
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
          'hardwareBackPress',
          () => {
            navigation.goBack()
            return true;
          },
        );
    
        return () => backHandler.remove();
      }, []);
  return (
    <View style={styles.container}>
       <View style={{ flexDirection: 'row', gap: 50, marginBottom: 30, backgroundColor: '#008541', width: '100%', height: '7%', }} >
                <AntDesign name="close" size={scaleFont(25)} color="#fff" style={{ alignSelf: 'center', left: scaleFont(20), top: scaleFont(10), marginBottom: scaleFont(15) }}
                    onPress={() => navigation.goBack()} />
                <Text style={{ fontSize: scaleFont(20), textAlign: 'center', fontWeight: '500', color: "#fff", top: 12 }}>{name?name:'Sample_File_Name'}</Text>
            </View>
      <WebView
        source={{ uri: URL }}
        startInLoadingState
        renderLoading={() => (
            <View style={[styles.container, styles.horizontal]}>
                <ActivityIndicator size="large" color="#00ff00" />
            </View>
        )}
        ref={webViewRef}
        javaScriptEnabled={true}
        domStorageEnabled={true}
                
        />

    </View>
  )
}
