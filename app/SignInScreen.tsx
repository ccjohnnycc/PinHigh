import React, { useState } from "react";
import {
  View, TextInput, Button, StyleSheet, Text, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ToastAndroid,
} from "react-native";
import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';


const SignInScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const homeScreenImage = require("../assets/images/home_screen.png");

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        ToastAndroid.show("Account created successfully!", ToastAndroid.SHORT);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        ToastAndroid.show("Signed in successfully!", ToastAndroid.SHORT);
      }

      setTimeout(() => navigation.navigate("index"), 1000);
    } catch (err: any) {
      setError("Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Background Image */}
      <Image source={homeScreenImage} style={styles.backgroundImage} resizeMode="cover" />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        <Text style={styles.title}>{isSignUp ? "Sign Up" : "Sign In"}</Text>

        {/* Input Fields */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#ddd"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#ddd"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Error Message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Sign-In / Sign-Up Button */}
        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSignUp ? "Sign Up" : "Sign In"}</Text>}
        </TouchableOpacity>

        {/* Toggle Sign-In / Sign-Up */}
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        {/* Back to Home */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// **STYLING**
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  overlay: {
    width: "85%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FF8C00",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    fontSize: 16,
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: "#FF8C00",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "#FF5733",
    fontSize: 14,
    marginBottom: 10,
  },
  toggleText: {
    marginTop: 10,
    color: "#FF8C00",
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 15,
  },
  backText: {
    color: "#FF8C00",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default SignInScreen;