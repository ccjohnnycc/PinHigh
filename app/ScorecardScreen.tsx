import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Button, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Dimensions
} from 'react-native';
import { getScorecards, deleteScorecard, saveScorecard } from './firebaseUtils';
import { auth } from './firebaseConfig';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get("window");
type Player = { name: string; scores: string[] };

export default function ScorecardScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [scorecards, setScorecards] = useState<any[]>([]);
  const userId = auth.currentUser?.uid;
  const [courseName, setCourseName] = useState('');
  const [players, setPlayers] = useState<Player[]>([{
    name: 'Player 1',
    scores: Array(18).fill('')
  }]);

  // Load saved scorecard when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadSavedData = async () => {
        try {
          const savedData = await AsyncStorage.getItem('savedScorecard');
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            setCourseName(parsedData.courseName || '');
            setPlayers(parsedData.players || []);
          }
        } catch (error) {
          console.error('Failed to load saved scorecard:', error);
        }
      };
      loadSavedData();
    }, [])
  );

  // Save scorecard when leaving the screen
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('savedScorecard', JSON.stringify({ courseName, players }));
      } catch (error) {
        console.error('Failed to save scorecard:', error);
      }
    };

    const unsubscribe = navigation.addListener('blur', saveData);
    return () => unsubscribe();
  }, [courseName, players, navigation]);

  // Fetch scorecards when loaded
  useEffect(() => {
    if (userId) {
      fetchScorecards();
    }
  }, [userId]);

  // Fetch user scorecards
  const fetchScorecards = async () => {
    try {
      const cards = await getScorecards(userId!);
      setScorecards(cards);
    } catch (error) {
      console.error("Error fetching scorecards:", error);
    }
  };

  //Update score for a player and hole
  const updateScore = (playerIndex: number, holeIndex: number, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex].scores[holeIndex] = value;
    setPlayers(updatedPlayers);
  };

  //Add a new player
  const addPlayer = () => {
    setPlayers([...players, { name: `Player ${players.length + 1}`, scores: Array(18).fill('') }]);
  };

  //Remove a player
  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  //Clear all scores
  const clearScores = () => {
    Alert.alert('Clear Scores', 'Are you sure you want to clear all scores?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: () => setPlayers(players.map((p) => ({
          ...p, scores:
            Array(18).fill('')
        }))), style: 'destructive'
      }
    ]);
  };

  // Save current scorecard to Firebase
  const handleSaveScorecard = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name.');
      return;
    }

    const scorecardData = {
      players: players.map(player => ({
        name: player.name,
        scores: player.scores.map((s) => parseInt(s) || 0),
      })),
      data: new Date().toISOString().split('T')[0],
      course: courseName,
    };


    try {
      await saveScorecard(userId!, scorecardData);
      Alert.alert('Success', 'Scorecard saved!');
      //refresh
      fetchScorecards();
    } catch (error) {
      console.error("Error saving scorecard:", error);
      Alert.alert('Error', 'Failed to save scorecard.');
    }
  };

  // Load previous scorecard into new round
  const loadScorecard = (scorecard: any) => {
    setCourseName(scorecard.course);

    // Check if scorecard.players exists and map it correctly
    if (scorecard.players && Array.isArray(scorecard.players)) {
      setPlayers(scorecard.players.map((player: any) => ({
        name: player.name || "Unknown",
        scores: player.scores ? player.scores.map(String) : Array(18).fill(''),
      })));
    } else {
      Alert.alert("Error", "No player data found in this scorecard.");
      setPlayers([{ name: 'Player 1', scores: Array(18).fill('') }]);
    }
  };

  // Delete scorecard
  const handleDeleteScorecard = async (id: string) => {
    try {
      await deleteScorecard(userId!, id);
      fetchScorecards();
    } catch (error) {
      console.error("Error deleting scorecard:", error);
      Alert.alert('Error', 'Failed to delete scorecard.');
    }
  };

  //Get total score per player
  const getTotalScore = (scores: string[]) => {
    return scores.reduce((total, score) => total + (parseInt(score) || 0), 0);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>

      {/* Floating Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={30} color="white" />
      </TouchableOpacity>

      {/* Scorecard Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scorecard</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Course Name Input */}
        <TextInput
          style={styles.input}
          placeholder="Enter Course Name"
          value={courseName}
          onChangeText={setCourseName}
        />

        {/* Player & Score Inputs */}
        {players.map((player, playerIndex) => (
          <View key={playerIndex} style={styles.playerContainer}>
            <View style={styles.playerHeader}>
              <TextInput
                style={styles.input}
                value={player.name}
                onChangeText={(text) => {
                  const updatedPlayers = [...players];
                  updatedPlayers[playerIndex].name = text;
                  setPlayers(updatedPlayers);
                }}
              />
              <TouchableOpacity onPress={() => removePlayer(playerIndex)}>
                <Ionicons name="trash-outline" size={24} color="red" />
              </TouchableOpacity>
            </View>

            {/* Hole Scores */}
            <ScrollView horizontal>
              <View style={styles.holeContainer}>
                {Array.from({ length: 18 }, (_, i) => (
                  <View key={i} style={styles.holeBox}>
                    <Text style={styles.holeNumber}>{i + 1}</Text>
                    <TextInput
                      style={styles.scoreInput}
                      keyboardType="numeric"
                      value={player.scores[i]}
                      onChangeText={(value) => updateScore(playerIndex, i, value)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Total Score */}
            <Text style={styles.totalScore}>
              Total Score: {getTotalScore(player.scores)}
            </Text>
          </View>
        ))}

        {/* Scorecard Actions */}
        <TouchableOpacity style={styles.button} onPress={addPlayer}>
          <Text style={styles.buttonText}>Add Player</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={clearScores}>
          <Text style={styles.buttonText}>Clear Scores</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSaveScorecard}>
          <Text style={styles.buttonText}>Save Scorecard</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Previous Scorecards */}
      <Text style={styles.previousTitle}>Previous Scorecards</Text>
      {scorecards.length > 0 ? (
        <FlatList
          data={scorecards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.scorecardRow}>
              {/* Course Info */}
              <View>
                <Text style={styles.scorecardText}>{item.course}</Text>
                <Text style={styles.scorecardDate}>{item.date}</Text>
              </View>
              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={() => loadScorecard(item)} style={styles.loadButton}>
                  <Text style={styles.buttonText}>Load</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteScorecard(item.id)} style={styles.deleteButton}>
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noScorecardsText}>No previous scorecards found.</Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    paddingTop: 40,

  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  content: {
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: "#2C2C2C",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  playerContainer: {
    backgroundColor: "#282828",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  button: {
    backgroundColor: "#FF8C00",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  holeContainer: {
    flexDirection: "row",
    marginVertical: 5,
  },
  holeBox: {
    marginRight: 10,
    alignItems: "center",
    backgroundColor: "#3C3C3C",
    padding: 8,
    borderRadius: 5,
  },
  holeNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFD700",
  },
  scoreInput: {
    backgroundColor: "#444",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#FFD700",
    padding: 8,
    width: 50,
    height: 40,
    textAlign: "center",
    borderRadius: 5,
  },
  totalScore: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    marginTop: 10,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 50,
  },
  previousTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    marginTop: 5,
    marginBottom: 5,
    textAlign: "center",
  },
  scorecardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 10,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  scorecardText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  scorecardDate: {
    color: "#bbb",
    fontSize: 10,
  },
  noScorecardsText: {
    color: "#aaa",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: "row",
  },
  loadButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: "#C00000",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
});
