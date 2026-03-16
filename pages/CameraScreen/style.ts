import { scaleFont } from "@/constants/ScaleFont";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    modalView: {
      margin: 20,
      marginTop: '80%',
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    controlsContainer: {
      position: 'absolute',
      bottom: 20,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    button: {
      alignItems: 'center',
      backgroundColor: 'lightgrey',
      borderRadius: 100,
      width: 50,
      height: 50,
      marginBottom: 45,
    },
    captureButton: {
      width: 55,
      height: 55,
      borderRadius: 100,
      borderColor: '#008541',
      backgroundColor: '#008541',
      // justifyContent: 'center',
      alignItems: 'center',
      bottom: scaleFont(20),
    },
    // uploadButton: {
    //   width: 70,
    //   height: 70,
    //   borderRadius: 100,
    //   borderColor: '#008541',
    //   backgroundColor: '#008541',
    //   justifyContent: 'center',
    //   alignItems: 'center',
    // },
    captureInnerButton: {
      width: 45,
      height: 45,
      borderRadius: 100,
      backgroundColor: '#fff',
      top: 5,
    },
    buttonText: {
      color: '#000',
      marginTop: scaleFont(8),
      fontSize: scaleFont(12),
    },
    previewImage: {
      width: 300,
      height: 400,
    },
  });