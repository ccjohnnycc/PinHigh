import { View, Text, Button, StyleSheet, Switch } from "react-native";
import React, { useState } from "react";
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { auth } from './firebaseConfig';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  // Determine if the user is signed in
  const isSignedIn = !!auth.currentUser;

  // Dev Mode State
  const [devMode, setDevMode] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PinHigh</Text>

      {/* Button for course search */}
      <Button title="Search Course" onPress={() => navigation.navigate('CourseSearchScreen')} />

      {/* Button for Sign-In/Sign-Up or Profile */}
      {isSignedIn ? (
        <Button title="Profile" onPress={() => navigation.navigate('ProfileScreen')} />
      ) : (
        <Button title="Sign-In/Sign-Up" onPress={() => navigation.navigate('SignInScreen')} />
      )}
      {/* Dev Mode Toggle */}
      <View style={styles.devModeContainer}>
        <Text style={styles.devModeText}>Dev Mode</Text>
        <Switch value={devMode} onValueChange={setDevMode} />
      </View>

      {/* Go to Map */}
      <Button 
        title="Go to Map" 
        onPress={() => navigation.navigate('map', { devMode })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    marginVertical: 10,
    //marginBottom: 10,
  },
  devModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  devModeText: {
    fontSize: 18,
    marginRight: 10,
  },
});