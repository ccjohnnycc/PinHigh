import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Button,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine";
import { saveClubAndDistance, getClubsAndDistances, suggestClub, saveScorecard } from "./firebaseUtils";
import { auth } from "./firebaseConfig";

type Club = {
    club: string;
    distance: number;
};

// Default clubs
const DEFAULT_CLUBS: Club[] = [
    { club: "Driver", distance: 240 },
    { club: "3W", distance: 220 },
    { club: "5W", distance: 200 },
    { club: "4I", distance: 190 },
    { club: "6I", distance: 180 },
    { club: "7I", distance: 165 },
    { club: "8I", distance: 155 },
    { club: "9I", distance: 145 },
    { club: "PW", distance: 130 },
    { club: "GW", distance: 120 },
    { club: "SW", distance: 110 },
    { club: "Putter", distance: 5 },
];

// Track Shot Modal Component
const TrackShotModal = ({ visible, distance, onClose }: any) => {
    const [club, setClub] = useState("");

    const handleSave = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert("Error", "You need to be signed in to save data.");
            return;
        }
        if (!club) {
            Alert.alert("Error", "Please enter a club name.");
            return;
        }

        await saveClubAndDistance(userId, club, distance);
        Alert.alert("Success", "Shot saved!");
        setClub("");
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Track Shot</Text>
                    <Text> Distance: {distance} yards </Text>
                    <TextInput
                        placeholder="Enter club name"
                        value={club}
                        onChangeText={setClub}
                        style={styles.input}
                    />
                    <Button title="Save" onPress={handleSave} />
                    <Button title="Cancel" onPress={onClose} color="red" />
                </View>
            </View>
        </Modal>
    );
};

// Scorecard Modal Component
const ScorecardModal = ({ visible, players, setPlayers, onClose, onSave }: any) => {
    const [courseName, setCourseName] = useState("");
    
    const updateScore = (playerIndex: number, holeIndex: number, value: string) => {
        const updatedPlayers = [...players];
        updatedPlayers[playerIndex].scores[holeIndex] = value;
        setPlayers(updatedPlayers);
    };

    const addPlayer = () => {
        setPlayers([
            ...players,
            { name: `Player ${players.length + 1}`, scores: Array(18).fill("") },
        ]);
    };

    const removePlayer = (index: number) => {
        setPlayers(players.filter((_: any, i: number) => i !== index));
    };

    const clearScores = () => {
        Alert.alert(
            "Clear Scores",
            "Are you sure you want to clear all scores?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Clear",
                    onPress: () =>
                        setPlayers(
                            players.map((player: any) => ({
                                ...player,
                                scores: Array(18).fill(""),
                            }))
                        ),
                    style: "destructive",
                },
            ]
        );
    };

    const handleSaveScorecard = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert("Error", "You need to be signed in to save data.");
            return;
        }
        if (!courseName.trim()) {
            Alert.alert("Error", "Please enter a course name.");
            return;
        }

        const scorecardData = {
            // Get the first player's name
            player: players[0].name,
            // Get scores
            scores: players[0].scores,
            // Save current date
            data: new Date().toISOString().split("T")[0],
            course: courseName,
        };

        await saveScorecard(userId, scorecardData);
        Alert.alert("Success", "Scorecard saved!");

        // Reset state
        setCourseName("");
        onClose();
    };

    const getTotalScore = (scores: string[]) => {
        return scores.reduce((total, score) => {
            const parsedScore = parseInt(score, 10);
            return total + (isNaN(parsedScore) ? 0 : parsedScore);
        }, 0);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.modalContainer}
            >
                <ScrollView>
                    <Text style={styles.modalTitle}>Scorecard</Text>
                    {/* Course Name Input */}
                    <Text style={styles.label}>Enter Course Name:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Course Name"
                        value={courseName}
                        onChangeText={setCourseName}
                    />
                    {/* Player/scores */}
                    {players.map((player: any, playerIndex: number) => (
                        <View
                            key={playerIndex}
                            style={{
                                backgroundColor: playerIndex % 2 === 0 ? "#f9f9f9" : "white",
                                padding: 10,
                                borderRadius: 5,
                                marginVertical: 5,
                            }}
                        >
                            <View style={styles.playerRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Enter Player Name"
                                    value={player.name}
                                    onChangeText={(text) => {
                                        const updatedPlayers = [...players];
                                        updatedPlayers[playerIndex].name = text;
                                        setPlayers(updatedPlayers);
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removePlayer(playerIndex)}
                                >
                                    <Text style={styles.removeButtonText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                            {/* Combined horizontal scroll for holes and scores */}
                            <ScrollView horizontal>
                                <View style={styles.holesAndScoresRow}>
                                    {Array.from({ length: 18 }, (_, i) => (
                                        <View key={i} style={styles.holeAndScore}>
                                            {/* Hole number */}
                                            <Text style={styles.holeHeader}>{i + 1}</Text>
                                            {/* Score input box */}
                                            <TextInput
                                                style={styles.scoreInput}
                                                keyboardType="numeric"
                                                value={player.scores[i]}
                                                onChangeText={(value) =>
                                                    updateScore(playerIndex, i, value)
                                                }
                                            />
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                            <Text style={styles.totalText}>
                                Total Score: {getTotalScore(player.scores)}
                            </Text>
                        </View>
                    ))}
                    <View style={[styles.buttonRow, { flexDirection: "column" }]}>
                        <Button title="Add Player" onPress={addPlayer} />
                        <View style={{ marginVertical: 10 }}>
                            <Button title="Clear Scores" onPress={clearScores} color="red" />
                        </View>
                        <Button title="Save Scorecard" onPress={handleSaveScorecard} />
                        <Button title="Close" onPress={onClose} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// Main Map Screen
export default function MapScreen() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isTrackShotVisible, setIsTrackShotVisible] = useState(false);
    const [isScorecardVisible, setIsScorecardVisible] = useState(false);
    const [players, setPlayers] = useState([{ name: "Player 1", scores: Array(18).fill("") }]);
    // For club suggestions
    const [clubs, setClubs] = useState<Club[]>(DEFAULT_CLUBS);

    const fetchLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setErrorMsg("This app requires location permissions to function.");
                return;
            }
            const currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation);
        } catch (error) {
            setErrorMsg("An error occurred while fetching the location");
        }
    }, []);

    // Fetch and merge clubs
    useEffect(() => {
        const fetchClubs = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            // Fetch from Firebase
            const userClubs: Club[] = await getClubsAndDistances(userId);

            // Merge user clubs with default clubs without duplicates
            const mergedClubs = [...DEFAULT_CLUBS, ...userClubs].reduce<Club[]>((acc, club) => {
                if (!acc.find((c) => c.club === club.club)) acc.push(club);
                return acc;
            }, []);

            setClubs(mergedClubs);
        };

        fetchClubs();
    }, []);

    const getDistance = () => {
        if (!location || !selectedPoint) return null;
        const start = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
        const end = {
            latitude: selectedPoint.latitude,
            longitude: selectedPoint.longitude,
        };
        const distanceInMeters = haversine(start, end, { unit: "meter" });
        return (distanceInMeters * 1.09361).toFixed(2);
    };

    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    return (
        <View style={styles.container}>
            {!location ? (
                <ActivityIndicator size="large" />
            ) : (
                <>
                    <MapView
                        style={styles.map}
                        mapType="satellite"
                        initialRegion={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.0015,
                            longitudeDelta: 0.0015,
                        }}
                        onPress={(e) => setSelectedPoint(e.nativeEvent.coordinate)}
                    >
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude,
                            }}
                            title="Your Location"
                        />
                        {selectedPoint && (
                            <Marker coordinate={selectedPoint} title="Selected Point" />
                        )}
                    </MapView>
                    <View style={styles.infoBox}>
                        <Text>Distance: {getDistance()} yards</Text>
                        {getDistance() && clubs.length > 0 && (
                            <Text>Suggested Club: {suggestClub(parseFloat(getDistance() || "0"), clubs)}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => setIsTrackShotVisible(true)}
                    >
                        <Text style={styles.buttonText}>Track Shot</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.floatingButton, { bottom: 80 }]}
                        onPress={() => setIsScorecardVisible(true)}
                    >
                        <Text style={styles.buttonText}>Scorecard</Text>
                    </TouchableOpacity>
                    <TrackShotModal
                        visible={isTrackShotVisible}
                        distance={parseFloat(getDistance() || "0")}
                        onClose={() => setIsTrackShotVisible(false)}
                    />
                    <ScorecardModal
                        visible={isScorecardVisible}
                        players={players}
                        setPlayers={setPlayers}
                        onClose={() => setIsScorecardVisible(false)}
                    />
                    {selectedPoint && (
                        <View style={styles.infoBox}>
                            <Text> Distance: {getDistance()} yards </Text>
                            {getDistance() &&
                                clubs.length > 0 &&
                                <Text> Suggested Club: {suggestClub(parseFloat(getDistance() || "0"), clubs)} </Text>}
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        width: 300,
        padding: 20,
        backgroundColor: "white",
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        marginLeft: 10,
        marginTop: 15,
        marginBottom: 0,
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 10,
        marginBottom: 5,
    },
    //player username
    input: {
        borderWidth: 1,
        borderColor: "black",
        padding: 10,
        marginVertical: 5,
        borderRadius: 5,
        width: "100%",
    },
    playerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    holesAndScoresRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    holeAndScore: {
        alignItems: "center",
        marginHorizontal: 5,
    },
    holesRow: {
        flexDirection: "row",
    },
    // Match width of scoreInput
    holeHeader: {
        width: 35,
        textAlign: "center",
        fontWeight: "bold",
    },
    scoreRow: {
        flexDirection: "row",
    },
    
    scoreInput: {
        width: 35,
        textAlign: "center",
        borderWidth: 1,
        borderColor: "black",
        borderRadius: 5,
        marginTop: 2,
        paddingVertical: 5,
    },
    totalText: {
        fontWeight: "bold",
        marginTop: 10,
    },
    removeButton: {
        backgroundColor: "red",
        padding: 5,
        borderRadius: 5,
        marginLeft: 10,
    },
    removeButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    //scorecard buttons
    buttonRow: {
        marginTop: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    //distance box
    infoBox: {
        position: "absolute",
        bottom: 35,
        left: 10,
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
    },
    // track shot button
    floatingButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "blue",
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgb(255, 255, 255)",
        padding: 20,
    },
});
