import { scaleFont } from "@/constants/ScaleFont";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  ImageBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  Logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    marginTop: scaleFont(120),
    gap: 40,
  },
  btn: {
    backgroundColor: "#008541",
    width: 180,
    padding: 6,
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 12,
  },
  btnText: {
    textAlign: "center",
    color: "#fff",
    fontSize: scaleFont(20),
    fontFamily: "Poppins-Light",
  },
  text1: {
    textAlign: "center",
    fontSize: scaleFont(24),
    fontFamily: "Poppins-Light",
    fontWeight: "bold",
    lineHeight: 25,
    color: "black",
  },
  text2: {
    textAlign: "center",
    fontSize: scaleFont(20),
    fontFamily: "Poppins-Light",
    fontWeight: 600,
    lineHeight: 25,
    color: "black",
  },
});
