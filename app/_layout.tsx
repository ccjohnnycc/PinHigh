import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="CourseSearchScreen" />
      <Stack.Screen name="map" />
      <Stack.Screen name="scorecard" />
      <Stack.Screen name="SignInScreen" />
      <Stack.Screen name="TeeSelectionScreen" />

    </Stack>
  );
}
