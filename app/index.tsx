import {
  View, Text, Button, StyleSheet, Switch, Image, Dimensions, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard
} from "react-native";
import React, { useState } from "react";
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { auth } from './firebaseConfig';
import axios from "axios";
import { useRef } from "react";

const { width, height } = Dimensions.get("window");

type Course = {
  id: number;
  club_name: string;
  course_name: string;
  location: {
    city: string;
    state: string;
  };
};

export default function HomeScreen() {
  const homeScreenImage = require('../assets/images/home_screen.png');
  const navigation = useNavigation<NavigationProp<any>>();
  // Determine if the user is signed in
  const isSignedIn = !!auth.currentUser;

  // Dev Mode State
  const [devMode, setDevMode] = useState(false);

  //Search State
  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const API_KEY = 'XEC2K7J62Z5ZSAHQTXGFMZS6G4';
  const API_URL = 'https://api.golfcourseapi.com/v1/search';

  const searchCourses = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await axios.get<{ courses: Course[] }>(API_URL, {
        params: { search_query: query.trim() },
        headers: { Authorization: `Key ${API_KEY}` },
      });
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Failed to fetch courses. Please try again.');
    }
    setLoading(false);
  };

  const handleCourseSelect = (course: Course) => {
    setSearchActive(false);
    setQuery("");
    navigation.navigate('TeeSelectionScreen', { course });
  };

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

        {/* Expandable Search Bar */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.searchContainer}>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, searchActive && styles.expandedSearch]}
            placeholder="Search for a course..."
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchActive(true)}
            onSubmitEditing={searchCourses}
          />

          {/* Cancel Button */}
          {searchActive && (
            <TouchableOpacity onPress={() => { setSearchActive(false); setQuery(""); Keyboard.dismiss(); }} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </KeyboardAvoidingView>

        {/* Search Results */}
        {searchActive && courses.length > 0 && (
          <View style={styles.resultsContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#FF8C00" />
            ) : (
              <FlatList
                data={courses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => handleCourseSelect(item)}>
                    <Text style={styles.resultText}>
                      {item.club_name} - {item.course_name}, {item.location.city}, {item.location.state}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* Sign-In/Sign-Up & Navigation Buttons */}
        {!searchActive && (
          <>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate(isSignedIn ? 'ProfileScreen' : 'SignInScreen')}>
              <Text style={styles.buttonText}>{isSignedIn ? "Profile" : "Sign-In / Sign-Up"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('map', { devMode })}>
              <Text style={styles.buttonText}>Free Roam</Text>
            </TouchableOpacity>

            {/* Dev Mode Toggle */}
            <View style={styles.devModeContainer}>
              <Text style={styles.devModeText}>Dev Mode</Text>
              <Switch value={devMode} onValueChange={setDevMode} />
            </View>
          </>
        )}
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

  /** === SEARCH BAR === **/
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    width: "80%",
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 10
  },
  expandedSearch: {
    flex: 1.5,
    fontSize: 18
  },
  cancelButton: {
    marginLeft: 10,
    paddingHorizontal: 10
  },
  cancelText: {
    color: "red",
    fontSize: 16
  },

  /** === SEARCH RESULTS === **/
  resultsContainer: {
    width: "80%",
    maxHeight: 250,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 10,
    marginTop: 10,
    padding: 5,
  },
  resultItem: { padding: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  resultText: { fontSize: 16 },

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