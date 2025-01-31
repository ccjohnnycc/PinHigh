import { Tabs } from "expo-router";
import Icon from "react-native-vector-icons/Ionicons";


export default function RootLayout() {
    return (
      <Tabs>
        {/* Home tab */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" size={size} color={color} />
            ),
          }}
        />
  
        {/* Map tab */}
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color, size }) => (
              <Icon name="map" size={size} color={color} />
            ),
          }}
        />
  
        {/* Scorecard tab */}
        <Tabs.Screen
          name="scorecard"
          options={{
            title: "Scorecard",
            tabBarIcon: ({ color, size }) => (
              <Icon name="list" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }