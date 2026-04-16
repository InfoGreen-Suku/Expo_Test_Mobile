import { useAuth } from "@/auth/AuthContext";
import ApiLogsScreen from "@/pages/ApiLogsScreen";
import CameraScreen from "@/pages/CameraScreen";
import Home from "@/pages/Home";
import AdminHome from "@/pages/Home/admin";
import Network from "@/pages/NetworkScreen";
import OpenLink from "@/pages/OpenLinkScreen";
import PDF from "@/pages/PDF";
import PendingScreen from "@/pages/PendingScreen";
import PermissionScreen from "@/pages/PermissionScreen";
import Pin from "@/pages/PinScreen";
import Print from "@/pages/Print";
import Record from "@/pages/RecordScreen";
import Sharedfile from "@/pages/SharedFileScreen";
import VerificationScreen from "@/pages/VerificationScreen";
import Webview from "@/pages/Webview";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const MainStack = createNativeStackNavigator();

export default function MainNavigator() {
  const { user } = useAuth();
  const initialRouteName = user?.userType === "admin" ? "Admin" : "Home";
  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <MainStack.Screen name="PendingScreen" component={PendingScreen} />
      {/* <MainStack.Screen
        name="TermsAndConditions"
        component={TermsAndConditions}
      /> */}
      {/* <MainStack.Screen name="Login" component={Login} /> */}
      <MainStack.Screen name="Home" component={Home} />
      <MainStack.Screen name="Admin" component={AdminHome} />
      <MainStack.Screen name="PermissionScreen" component={PermissionScreen} />
      <MainStack.Screen
        name="VerificationScreen"
        component={VerificationScreen}
      />
      <MainStack.Screen name="OpenLink" component={OpenLink} />
      <MainStack.Screen name="Webview" component={Webview} />
      <MainStack.Screen name="PDF" component={PDF} />
      <MainStack.Screen name="Print" component={Print} />
      <MainStack.Screen name="Pin" component={Pin} />
      <MainStack.Screen name="Record" component={Record} />
      <MainStack.Screen name="Camera" component={CameraScreen} />
      <MainStack.Screen name="Sharedfile" component={Sharedfile} />
      <MainStack.Screen name="Network" component={Network} />
      <MainStack.Screen name="ApiLogsScreen" component={ApiLogsScreen} />
    </MainStack.Navigator>
  );
}
