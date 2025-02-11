import { Tabs } from "expo-router";
import { Stack } from "expo-router";
import Icon from "react-native-vector-icons/Ionicons";


export default function RootLayout() {
    return (
      <Stack>
      <Stack.Screen name="index" options={{ title: "PinHigh" }} />
      <Stack.Screen name="CourseSearchScreen" options={{ title: "Search Course" }} />
      <Stack.Screen name="map" options={{ title: "Map" }} />
      <Stack.Screen name="scorecard" options={{ title: "Scorecard" }} />
      <Stack.Screen name="SignInScreen" options={{ title: "Sign In" }} />
      <Stack.Screen name="TeeSelectionScreen" options={{ title: 'Select Tee' }} />

    </Stack>
    );
  }