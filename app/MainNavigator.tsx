import Home from "@/pages/Home";
import AdminHome from "@/pages/Home/admin";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

const MainStack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={"Home"}
    >
      {/* <MainStack.Screen
        name="TermsAndConditions"
        component={TermsAndConditions}
      /> */}
      {/* <MainStack.Screen name="Login" component={Login} /> */}
      <MainStack.Screen name="Home" component={Home} />
      <MainStack.Screen name="Admin" component={AdminHome} />
    </MainStack.Navigator>
  );
}
