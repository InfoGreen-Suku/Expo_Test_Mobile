import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";
import {
  Alert,
  BackHandler,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./style";

export default function Network() {
  const navigation = useNavigation<any>();
  // const dispatch=useDispatch()

  const checkNetworkStatus = () => {
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        Alert.alert("Network Error!", "Please Connect your Network.", [
          { text: "Ok" },
        ]); // Navigate to network error page
      } else {
        navigation.navigate("Home");
      }
    });
  };
  // handle backbutton for moving previous page or exit the app
  const backHandle = async () => {
    // checking the user details before exiting the app if userdetails is null it will take user to myform page other take to webview

    BackHandler.exitApp();
  };

  // handle refresh button for refresh the page after getting network

  const handlerefresh = async () => {
    try {
      const savedUserDetails = await AsyncStorage.getItem("userData");
      if (savedUserDetails === null) {
        navigation.navigate("Login");
      } else {
        Alert.alert(
          "Something Wrong!",
          "Please Close the app and Reopen again.",
          [{ text: "ok", onPress: () => BackHandler.exitApp() }],
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.conatiner}>
      {/* <Image
        source={require("../../assets/images/Logo.png")}
        style={{
          width: "100%",
          height: "10%",
          resizeMode: "contain",
          alignSelf: "center",
        }}
      /> */}
      <Image
        source={require("../../assets/images/NetworkImage.png")}
        style={{ width: "100%", height: "40%", resizeMode: "contain" }}
      />
      <View style={styles.btnContainer}>
        <TouchableOpacity
          onPress={checkNetworkStatus}
          style={styles.Refreshbtn}
        >
          <Feather name="refresh-cw" size={20} color="black" />
          <Text style={styles.RefreshBtnText}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={backHandle} style={styles.Exitbtn}>
          <MaterialCommunityIcons name="location-exit" size={20} color="red" />
          <Text style={styles.ExitBtnText}>Exit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.ErrorText}>
          Error : Your connecton or host may be down
        </Text>
        <Text style={styles.ErrorText1}>Please connect your Network</Text>
      </View>
    </View>
  );
}
