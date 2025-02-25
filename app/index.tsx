import { View, Text, Button, StyleSheet, Switch, Image, Dimensions, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { auth } from './firebaseConfig';

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const homeScreenImage = require('../assets/images/home_screen.png');
  const navigation = useNavigation<NavigationProp<any>>();
  // Determine if the user is signed in
  const isSignedIn = !!auth.currentUser;

  // Dev Mode State
  const [devMode, setDevMode] = useState(false);

  return (
    <View style={styles.container}>
      <Image
        source={homeScreenImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Overlay Content */}
      <View style={styles.overlay}>
        <Text style={styles.title}>PinHigh</Text>

        {/* Buttons */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('CourseSearchScreen')}>
          <Text style={styles.buttonText}>Search Courses</Text>
        </TouchableOpacity>

        {/* Sign-In/Sign-Up Button (Single Button) */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate(isSignedIn ? 'ProfileScreen' : 'SignInScreen')}
        >
          <Text style={styles.buttonText}>
            {isSignedIn ? "Profile" : "Sign-In / Sign-Up"}
          </Text>
        </TouchableOpacity>

        {/* Free Roam (Go to Map) Button */}
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('map', { devMode })}>
          <Text style={styles.buttonText}>Free Roam</Text>
        </TouchableOpacity>

        {/* Dev Mode Toggle */}
        <View style={styles.devModeContainer}>
          <Text style={styles.devModeText}>Dev Mode</Text>
          <Switch value={devMode} onValueChange={setDevMode} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** === MAIN CONTAINER === **/
  container: {
    flex: 1,
    position: "relative",
  },

  /** === BACKGROUND IMAGE === **/
  backgroundImage: {
    position: "absolute",
    width: width,
    height: height,
    top: 0,
    left: 0,
  },

  /** === OVERLAY === **/
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  /** === TITLE === **/
  title: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 30,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },

  /** === BUTTONS === **/
  button: {
    backgroundColor: "#FF8C00",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginVertical: 10,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  /** === DEV MODE TOGGLE === **/
  devModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  devModeText: {
    fontSize: 18,
    color: "#fff",
    marginRight: 10,
  },
});