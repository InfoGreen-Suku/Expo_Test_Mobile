import { scaleFont } from "@/constants/ScaleFont";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    background: {
      flex: 1,
      resizeMode: 'contain', // or 'stretch' or 'contain'
      justifyContent: 'center',
    },
    title: {
      color: '#008541',
      fontFamily: 'Poppins-Light',
      fontWeight: 'bold',
      fontSize: scaleFont(20),
      textAlign: 'center',
      marginTop: 20,
    },
    subtitle: {
      color: 'black',
      fontFamily: 'Poppins-Light',
      fontSize: scaleFont(14),
      maxWidth: '70%',
      textAlign: 'center',
      marginTop: 12,
    },
    image: {
      height: 340,
      width: 380,
      resizeMode: 'contain',
    },
    dotcomponent: {
      width: 12,
      height: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      marginHorizontal:8,
    },
    dotsub: {
      width: '100%',
      height: '100%',
      borderRadius: 6,
      backgroundColor: 'grey',
    },
    nextbtn: {
      width: '100%',
      backgroundColor: '#008541',
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    nextbtntxt: {
      fontFamily: 'Poppins-Light',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: scaleFont(17),
    },
    skipBar: {
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 2,
    },
    skipText: {
      color: '#008541',
      fontFamily: 'Poppins-Light',
      fontWeight: 'bold',
      fontSize: scaleFont(16),
    },
  });
  