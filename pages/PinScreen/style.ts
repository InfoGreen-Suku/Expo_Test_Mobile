import { scaleFont } from "@/constants/ScaleFont";
import { Dimensions, StyleSheet } from "react-native";

const ScreenWidth = Dimensions.get("window").width;
const ScreenHeight = Dimensions.get("window").height;
export const styles = StyleSheet.create({
  maniContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 70,
    gap: 30,
  },
  pinCircle: {
    width: 20,
    height: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#fff",
    justifyContent: "center",
    backgroundColor: "#00933",
    alignItems: "center",
  },
  pinText: {
    width: 20,
    height: 20,
    borderRadius: 100,
    backgroundColor: "#fff",
  },
  keypadContainer: {
    marginTop: 50,
    backgroundColor: "#fff",
    borderTopRightRadius: 50,
    borderTopLeftRadius: 50,
    padding: 40,
    height: ScreenHeight,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    height: ScreenHeight * 0.12,
  },
  keypadButton: {
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: "#F6F6F6",
    justifyContent: "center",
    alignItems: "center",
  },
  keypadButtonText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#000",
    fontFamily: "Poppins-Light",
  },

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

  TextContainer: {
    backgroundColor: "#008541",
    width: ScreenWidth,
    height: ScreenHeight,
  },
  text1: {
    color: "#fff",
    textAlign: "center",
    fontSize: scaleFont(17),
    marginTop: scaleFont(55),
    fontFamily: "Poppins-Light",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    fontSize: scaleFont(15),
    fontFamily: "Poppins-Light",
  },
  forgetPinText: {
    color: "#000000",
    textAlign: "center",
    fontSize: scaleFont(16),
    fontFamily: "Poppins-Light",
  },
  modalText1: {
    color: "white",
    textAlign: "justify",
    fontSize: scaleFont(5),
    fontFamily: "Poppins-Light",
  },
  modalText2: {
    color: "white",
    marginTop: 20,
    textAlign: "justify",
    fontSize: scaleFont(5),
    fontFamily: "Poppins-Light",
  },
  modalText3: {
    color: "white",
    marginTop: 20,
    textAlign: "center",
    fontSize: scaleFont(5),
    fontFamily: "Poppins-Light",
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
    fontSize: scaleFont(5),
  },
});
