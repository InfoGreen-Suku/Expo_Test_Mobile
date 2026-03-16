import { scaleFont } from "@/constants/ScaleFont";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  modalView: {
    margin: 20,
    marginTop: "65%",
    backgroundColor: "grey",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
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
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  modalBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderColor: "white",
    borderWidth: 1,
    marginTop: 10,
    width: "30%",
    borderRadius: 3,
  },
  modalBtnText: {
    color: "black",
    fontSize: scaleFont(16),
  },
  modalText1: {
    color: "white",
    textAlign: "justify",
    fontSize: scaleFont(16),
    fontFamily: "Poppins-Light",
  },

  referenceNo: {
    color: "white",
    textAlign: "center",
    fontSize: scaleFont(16),
    fontFamily: "Poppins-Light",
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalText2: {
    color: "white",
    marginTop: 20,
    textAlign: "justify",
    fontSize: scaleFont(16),
    fontFamily: "Poppins-Light",
  },

  modalText3: {
    color: "white",
    marginTop: 20,
    textAlign: "center",
    fontSize: scaleFont(16),
    fontFamily: "Poppins-Light",
  },

  Btn: {
    backgroundColor: "#008541",
    padding: 8,
    width: "50%",
    marginTop: 20,
    borderRadius: 10,
  },

  btnText: {
    color: "#fff",
    fontSize: scaleFont(20),
    fontWeight: 500,
    textAlign: "center",
  },

  text: {
    color: "black",
    textAlign: "center",
    fontSize: scaleFont(16),
    fontFamily: "Poppins-Light",
    marginBottom: 20,
  },
  Logo: {
    width: 100,
    height: 100,
  },
  BigImage: {
    width: "100%",
    height: "50%",
    resizeMode: "contain",
  },
  loaderModalView: {
      margin: 20,
      marginTop: '80%',
      backgroundColor: "white",
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: '#fff',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
});
