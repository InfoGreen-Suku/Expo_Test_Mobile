import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
      flex: 1,
  
      backgroundColor:'#fff'
    },
    image: {
      width: '100%',
      height: '90%',
      resizeMode: 'contain',
      
    },
  
    pdf: {
      flex: 1, 
      width: '100%', 
      height:'80%',
      backgroundColor:'#fff'
    },
    contentContainer: {
      flex: 1,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 50,
    },
    video: {
      width: 350,
      height: 275,
    },
    controlsContainer: {
      padding: 10,
    },
  });
  