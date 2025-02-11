import { View, Text, Button, StyleSheet } from "react-native";
import React from "react";
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { auth } from './firebaseConfig';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp<any>>();

  // Determine if the user is signed in
  const isSignedIn = !!auth.currentUser;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PinHigh</Text>

      {/* Button for course search */}
      <Button title="Search Course" onPress={() => navigation.navigate('CourseSearchScreen')} />

      {/* Button for Sign-In/Sign-Up or Profile */}
      {isSignedIn ? (
        <Button title="Profile" onPress={() => navigation.navigate('Profile')} />
      ) : (
        <Button title="Sign-In/Sign-Up" onPress={() => navigation.navigate('SignInScreen')} />
      )}
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
});