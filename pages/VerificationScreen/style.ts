import { scaleFont } from "@/constants/ScaleFont";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  LogoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: scaleFont(100),
  },
  Logo: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  MainImage: {
    width: "90%",
    height: "40%",
    resizeMode: "contain",
    marginTop: scaleFont(30),
  },
  Text1: {
    textAlign: "center",
    fontFamily: "Poppins-Ligh",
    fontWeight: "bold",
    color: "black",
    fontSize: scaleFont(20),
    marginTop: 20,
  },
  Text2: {
    textAlign: "center",
    fontFamily: "Poppins-Ligh",
    fontWeight: "500",
    color: "black",
    fontSize: scaleFont(20),
    marginTop: 20,
  },
  Text3: {
    textAlign: "center",
    fontFamily: "Poppins-Ligh",
    color: "black",
    fontSize: scaleFont(18),
    marginTop: 20,
  },
  btnContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    gap: 60,
    marginBottom: 100,
  },
  wrongBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderColor: "black",
    borderWidth: 1,
    gap: 5,
  },
  wrongBtnText: {
    color: "black",
    fontSize: scaleFont(16),
  },
  YesBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderColor: "black",
    borderWidth: 1,
    gap: 5,
  },
  YesBtnText: {
    color: "black",
    fontSize: scaleFont(16),
  },
});
