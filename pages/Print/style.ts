import { scaleFont } from "@/constants/ScaleFont";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    pdf: {
      flex: 1,
      width: '100%',
      height: '80%',
      backgroundColor: '#fff',
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: scaleFont(22),
    },
    modalView: {
      margin: 20,
      backgroundColor: '#f1f1f1',
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
      width: '100%',
      height: '25%',
      top: '40%',
    },
    modalText: {
      marginBottom: scaleFont(15),
      textAlign: 'center',
      fontSize: scaleFont(17),
      fontWeight: '500',
      right: scaleFont(90),
      color: 'black',
    },
  });
  