import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, Button,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { getScorecards, deleteScorecard, saveScorecard } from './firebaseUtils';
import { auth } from './firebaseConfig';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

type Player = { name: string; scores: string[] };

export default function ScorecardScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const [scorecards, setScorecards] = useState<any[]>([]);
  const userId = auth.currentUser?.uid;
  const [courseName, setCourseName] = useState('');
  const [players, setPlayers] = useState<Player[]>([{ name: 'Player 1', scores: Array(18).fill('') }]);

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
            const dataToSave = JSON.stringify({ courseName, players });
            console.log("💾 Saving scorecard:", dataToSave);
            await AsyncStorage.setItem('savedScorecard', dataToSave);
        } catch (error) {
            console.error('Failed to save scorecard:', error);
        }
    };

    const unsubscribe = navigation.addListener('blur', saveData);
    return unsubscribe;
}, [courseName, players]);


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
        onPress: () => setPlayers(players.map((p) => ({ ...p, scores: Array(18).fill('') }))),
        style: 'destructive'
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
      <ScrollView>
        <Text style={styles.title}>Scorecard</Text>

        {/* Course Name Input */}
        <Text style={styles.label}>Course Name:</Text>
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
              <Button title="Remove" onPress={() => removePlayer(playerIndex)} color="red" />
            </View>

            {/* Hole Scores */}
            <ScrollView horizontal>
              <View style={styles.holeContainer}>
                {Array.from({ length: 18 }, (_, i) => (
                  <View key={i} style={styles.holeBox}>
                    <Text style={styles.holeNumber}>Hole {i + 1}</Text>
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

            {/* 🟢 Total Score */}
            <Text style={styles.totalScore}>
              Total Score: {getTotalScore(player.scores)}
            </Text>
          </View>
        ))}

        {/* Scorecard Actions */}
        <Button title="Add Player" onPress={addPlayer} />
        <Button title="Clear Scores" onPress={clearScores} color="orange" />
        <Button title="Save Scorecard" onPress={handleSaveScorecard} />
        <Button title="Back to Map" onPress={() => navigation.goBack()} />
      </ScrollView>

      {/* Previous Scorecards */}
      <Text style={styles.title}>Previous Scorecards</Text>
      {scorecards.length > 0 ? (
        <FlatList
          data={scorecards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.scorecardRow}>
              <Text>{item.course} - {item.date}</Text>
              <Button title="Load" onPress={() => loadScorecard(item)} />
              <Button title="Delete" onPress={() => handleDeleteScorecard(item.id)} color="red" />
            </View>
          )}
        />
      ) : (
        <Text>No previous scorecards found.</Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10
  },
  label: {
    fontSize: 18,
    marginTop: 10
  },
  input: {
    borderWidth: 1,
    padding: 5,
    marginBottom: 10
  },
  playerContainer: {
    marginBottom: 20
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  holeContainer: {
    flexDirection: 'row'
  },
  holeBox: {
    marginRight: 10,
    alignItems: 'center'
  },
  holeNumber: {
    fontWeight: 'bold'
  },
  scoreInput: {
    borderWidth: 1,
    padding: 10,
    width: 50,
    height: 40,
    textAlign: 'center'
  },
  totalScore: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5
  },
  scorecardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
});
