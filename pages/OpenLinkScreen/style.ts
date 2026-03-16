import { scaleFont } from "@/constants/ScaleFont";
import { Dimensions, StyleSheet } from "react-native";
const ScreenWidth = Dimensions.get('window').width;
const ScreenHeight = Dimensions.get('window').height;
export const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff', 
    },
    horizontal: {
      justifyContent: 'space-evenly',
    },
    Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#008541',
    width:ScreenWidth,
    height:ScreenHeight*0.1,
  },
  filename: {
    textAlign: 'justify',
    fontSize: scaleFont(17),
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Poppins-Light',
    marginTop: 10,
  },
  });
  