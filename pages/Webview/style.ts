import { scaleFont } from "@/constants/ScaleFont";
import { Dimensions, StyleSheet } from "react-native";
const ScreenWidth = Dimensions.get('window').width;
const ScreenHeight = Dimensions.get('window').height;
export const styles = StyleSheet.create({
    container: {
      flex: 100,
      justifyContent: 'center',
    },
    horizontal: {
      justifyContent: 'space-evenly',
    },
    input: {
      width: '100%',
      height: 40,
      borderBottomWidth: 2,
      borderBottomColor: '#008541',
      marginBottom: 10,
      color: 'black',
      alignSelf: 'flex-start',
      fontSize: 16,
    },
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
    button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
    },
    buttonOpen: {
      backgroundColor: '#F194FF',
    },
    buttonClose: {
      backgroundColor: '#2196F3',
    },
    textStyle: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    modalText: {
      marginBottom: scaleFont(15),
      alignSelf: 'flex-start',
    },
    cameraContainer: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: '#008541', // Dimmed background
    },
    cameraPreview: {
      width: ScreenWidth,
      height: ScreenHeight,
      marginTop: scaleFont(30), // Adjusted height to leave space for the header
    },
  
    cameraHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      backgroundColor: '#008541',
      width: ScreenWidth,
      zIndex: 1,
      marginTop: ScreenHeight*0.05,

    },
    barcodeText: {
      textAlign: 'justify',
      fontSize: scaleFont(18),
      marginLeft: 4,
      fontWeight: 'bold',
      color: '#fff',
    },
    camerabordercontainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 20, // Added margin for better visibility
      height: ScreenHeight,
    },
    scannerFrame: {
      position: 'absolute',
      top: '30%',
      left: '10%',
      width: '80%',
      height: '40%',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#008541',
      borderRadius: 20,
    },
  });
  