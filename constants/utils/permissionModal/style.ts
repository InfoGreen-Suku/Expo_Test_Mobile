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

  modalText2: {
    color: "white",
    marginTop: 20,
    textAlign: "justify",
    fontSize: scaleFont(15),
    fontFamily: "Poppins-Light",
  },
});
