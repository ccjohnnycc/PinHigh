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
    Image,
    Animated,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine";
import { saveClubAndDistance, getClubsAndDistances, suggestClub, saveScorecard } from "./firebaseUtils";
import { auth } from "./firebaseConfig";
import { useRoute, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import arrowImg from "../assets/images/arrow.png";


type Club = {
    club: string;
    distance: number;
};

type RootStackParamList = {
    CourseSearch: undefined;
    TeeSelectionScreen: { course: Course };
    map: { course: Course; selectedTee: string; holes: HoleData[] };
};

type Course = {
    course_name: string;
    tees: {
        [teeName: string]: HoleData[];
    };
    location: {
        latitude: number;
        longitude: number;
    };
};

type HoleData = {
    hole_number: number;
    distance: number;
    par: number;
    handicap: number;
};

// weather API Key and URL
const OPENWEATHER_API_KEY = "b508f10805c3cc6983c16fbae45c51e6";
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";

// google elevation API kuye and URL
const GOOGLE_ELEVATION_API_KEY = "AIzaSyCvRJfjHDq3GKfksif-NoclJdvQT4ILjuU"; // Replace with your API key
const GOOGLE_ELEVATION_URL = "https://maps.googleapis.com/maps/api/elevation/json";

// converting weather degrees to compass direction
const getCardinalDirection = (degrees: number) => {
    if (degrees >= 337.5 || degrees < 22.5) return "N";
    if (degrees >= 22.5 && degrees < 67.5) return "NE";
    if (degrees >= 67.5 && degrees < 112.5) return "E";
    if (degrees >= 112.5 && degrees < 157.5) return "SE";
    if (degrees >= 157.5 && degrees < 202.5) return "S";
    if (degrees >= 202.5 && degrees < 247.5) return "SW";
    if (degrees >= 247.5 && degrees < 292.5) return "W";
    if (degrees >= 292.5 && degrees < 337.5) return "NW";
    // Default if no valid direction found
    return "--";
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

//using elevation API to get elevation
const getElevation = async (latitude: number, longitude: number): Promise<number | null> => {
    try {
        const response = await axios.get(GOOGLE_ELEVATION_URL, {
            params: {
                locations: `${latitude},${longitude}`,
                key: GOOGLE_ELEVATION_API_KEY,
            },
        });

        if (response.data.results.length > 0) {
            return response.data.results[0].elevation;
        } else {
            console.error("No elevation data found.");
            return null;
        }
    } catch (error) {
        console.error("Failed to fetch elevation data:", error);
        return null;
    }
};


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

// =========================Main Map Screen=========================
export default function MapScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'map'>>();
    const { course, selectedTee, holes } = route.params;
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [windSpeed, setWindSpeed] = useState<number | null>(null);
    const [windDirection, setWindDirection] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isTrackShotVisible, setIsTrackShotVisible] = useState(false);
    const [isScorecardVisible, setIsScorecardVisible] = useState(false);
    const [players, setPlayers] = useState([{ name: "Player 1", scores: Array(18).fill("") }]);
    const [userElevation, setUserElevation] = useState<number | null>(null);
    const [markedElevation, setMarkedElevation] = useState<number | null>(null);

    // For club suggestions
    const [clubs, setClubs] = useState<Club[]>(DEFAULT_CLUBS);

    // Extract the holes data for the selected tee
    //const holes: HoleData[] = course.tees[selectedTee] || [];
    const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
    const currentHole = holes[currentHoleIndex];

    const handleNextHole = () => {
        if (currentHoleIndex < holes.length - 1) {
            setCurrentHoleIndex(currentHoleIndex + 1);
        } else {
            Alert.alert('You have reached the last hole.');
        }
    };
    const handlePrevHole = () => {
        if (currentHoleIndex > 0) {
            setCurrentHoleIndex(currentHoleIndex - 1);
        } else {
            Alert.alert('You are on the first hole.');
        }
    };

    const startLocationUpdates = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setErrorMsg("This app requires location permissions to function.");
                return;
            }
    
            // Set up a real-time location watcher
            await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    // Update every 5 seconds
                    timeInterval: 5000,
                    // Update if moved at least 5 yards
                    distanceInterval: 5 * 1.09361,
                },
                async (newLocation) => {
                    setLocation(newLocation);
    
                    // Update user elevation
                    const elevation = await getElevation(newLocation.coords.latitude, newLocation.coords.longitude);
                    if (elevation !== null) setUserElevation(elevation);
                }
            );
        } catch (error) {
            setErrorMsg("An error occurred while fetching the location");
        }
    };
    
    // Start tracking when the component mounts
    useEffect(() => {
        startLocationUpdates();
    }, []);

    // pull users saved clubs and merge clubs
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

    // pull weather details from api
    useEffect(() => {
        if (!location) return;

        const fetchWeather = async () => {
            try {
                const { latitude, longitude } = location.coords;
                const response = await axios.get(OPENWEATHER_URL, {
                    params: {
                        lat: latitude,
                        lon: longitude,
                        appid: OPENWEATHER_API_KEY,
                        units: "imperial",
                    },
                });

                const windData = response.data.wind;
                setWindSpeed(Math.round(windData.speed));
                setWindDirection(windData.deg);
            } catch (error) {
                console.error("Failed to fetch wind data:", error);
            }
        };

        fetchWeather();
    }, [location]);

    //user target marker
    const handleMapPress = async (e: any) => {
        const newPoint = e.nativeEvent.coordinate;
        setSelectedPoint(newPoint);

        // Get elevation for selected point
        const elevation = await getElevation(newPoint.latitude, newPoint.longitude);
        if (elevation !== null) setMarkedElevation(elevation);
    };


    //

    return (
        <View style={styles.container}>
            {!location ? (
                <ActivityIndicator size="large" />
            ) : (
                <>
                    {/* Header for hole information */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.headerText}>Tee: {selectedTee}</Text>
                        {currentHole ? (
                            <>
                                <Text style={styles.headerText}>Hole: #{currentHole.hole_number}</Text>
                                <Text style={styles.headerText}>Distance: {currentHole.distance} yards</Text>
                                <Text style={styles.headerText}>Par: {currentHole.par}</Text>
                                <Text style={styles.headerText}>Handicap: {currentHole.handicap}</Text>
                            </>
                        ) : (
                            <Text style={styles.headerText}>No hole data available</Text>
                        )}
                    </View>
                    {/* Map view and user marker */}
                    <MapView
                        style={styles.map}
                        mapType="satellite"
                        initialRegion={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.0015,
                            longitudeDelta: 0.0015,
                        }}
                        onPress={handleMapPress}
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
                    {/* wind */}
                    <View style={styles.weatherBox}>
                        <Text style={styles.weatherText}>
                            Wind: {windSpeed !== null ? `${windSpeed} mph` : "--"}
                        </Text>
                        <Text style={styles.weatherText}>
                            Direction: {windDirection !== null ? getCardinalDirection(windDirection) : "--"}
                        </Text>
                    </View>
                    {/* Distance/ club suggestion */}
                    {selectedPoint && (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}> Distance: {getDistance()} yards </Text>
                            {getDistance() &&
                                clubs.length > 0 &&
                                <Text style={styles.infoText}> Club: {suggestClub(parseFloat(getDistance()
                                    || "0"), clubs)} </Text>}
                        </View>
                    )}
                    {/* Elevation */}
                    <View style={styles.elevationBox}>
                        {userElevation !== null && markedElevation !== null ? (
                            <>
                                <Text style={styles.elevationText}>
                                    {Math.round((markedElevation - userElevation) * 3.28084)} ft
                                    {markedElevation > userElevation ? "⬆️" : "⬇️"}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.elevationText}>Elevation: -- ft</Text>
                        )}
                    </View>
                    {/* Next Hole button */}
                    <TouchableOpacity style={styles.nextHoleButton} onPress={handleNextHole}>
                        <Text style={styles.buttonText}>Next Hole</Text>
                    </TouchableOpacity>
                    {/* Prev Hole button */}
                    <TouchableOpacity style={styles.prevHoleButton} onPress={handlePrevHole}>
                        <Text style={styles.buttonText}>Prev Hole</Text>
                    </TouchableOpacity>

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

                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    /** === MODALS (Track Shot & Scorecard) === **/
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
        marginBottom: 5,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgb(255, 255, 255)",
        padding: 20,
    },

    /** === TEXT INPUTS & LABELS === **/
    input: {
        borderWidth: 1,
        borderColor: "black",
        padding: 10,
        marginVertical: 5,
        borderRadius: 5,
        width: "100%",
    },
    label: {
        fontSize: 16,
        fontWeight: "bold",
        marginTop: 10,
        marginBottom: 5,
    },

    /** === SCORECARD STYLING === **/
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
    holeHeader: {
        width: 35,
        textAlign: "center",
        fontWeight: "bold",
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

    /** === BUTTONS === **/
    floatingButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: "blue",
        padding: 10,
        borderRadius: 5,
    },
    nextHoleButton: {
        position: "absolute",
        bottom: 120,
        left: 10,
        backgroundColor: "green",
        padding: 10,
        borderRadius: 5,
    },
    prevHoleButton: {
        position: "absolute",
        bottom: 175,
        left: 10,
        backgroundColor: "orange",
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    buttonRow: {
        marginTop: 20,
        justifyContent: "center",
        alignItems: "center",
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

    /** === MAP & INFO DISPLAYS === **/
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },

    /** INFO BOXES Distance **/
    infoContainer: {
        position: "absolute",
        bottom: 35,
        left: 10,
        right: 10,
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        elevation: 3,
    },
    infoBox: {
        position: "absolute",
        bottom: 35,
        left: 10,
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        elevation: 3,
    },
    infoText: {
        fontSize: 16,
        fontWeight: "bold",
    },

    /** === HEADER INFO (Course details) === **/
    headerContainer: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        borderBottomWidth: 1,
        borderColor: '#ccc',
        // render last
        zIndex: 100,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },

    /** === WEATHER BOX === **/
    weatherBox: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        elevation: 3,
    },
    weatherText: {
        fontSize: 16,
        fontWeight: "bold",
    },
    /** === Elevation Box/ text === **/
    elevationBox: {
        position: "absolute",
        top: 95,
        right: 10,
        backgroundColor: "white",
        padding: 10,
        borderRadius: 5,
        elevation: 3,
    },
    elevationText: {
        fontSize: 16,
        fontWeight: "bold",
    },

});
