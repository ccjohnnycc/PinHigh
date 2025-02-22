import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
    Modal, TextInput, Button, Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine";
import { saveClubAndDistance, getClubsAndDistances, suggestClub } from "./firebaseUtils";
import { auth } from "./firebaseConfig";
import { useRoute, RouteProp, useNavigation, NavigationProp } from '@react-navigation/native';
import axios from 'axios';

type RootStackParamList = {
    CourseSearchScreen: undefined;
    ProfileScreen: undefined;
    ScorecardScreen: undefined;
    SignInScreen: undefined;
    TeeSelectionScreen: { course: Course };
    map: {
        course?: Course; selectedTee?: string;
        holes?: HoleData[]; devMode?: boolean
    };
};

type Club = {
    club: string;
    distance: number;
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

// example data for dev mode
// rio pinar, orlando fl
const DEV_MODE_LOCATION = {
    latitude: 28.5257,
    longitude: -81.2644,
};

const DEV_MODE_HOLE = {
    tee: "BLUE",
    hole_number: 1,
    distance: 520,
    par: 5,
    handicap: 1,
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


// =========================Main Map Screen=========================
export default function MapScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'map'>>();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const { devMode, course = null, selectedTee = "", holes = [] } = route.params || {};
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [windSpeed, setWindSpeed] = useState<number | null>(null);
    const [windDirection, setWindDirection] = useState<number | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isTrackShotVisible, setIsTrackShotVisible] = useState(false);
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

    useEffect(() => {
        //create variable to store location subscription
        let locationSubscription: Location.LocationSubscription | null = null;

        // Fetch location updates
        const startLocationUpdates = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert("Error", "Location permission is required.");
                    return;
                }

                // Start watching location updates
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        // Updates every 5 seconds
                        timeInterval: 5000,
                        // Updates every 5 yards moved
                        distanceInterval: 5,
                    },
                    async (newLocation) => {
                        //if dev mode is enabled, use dev mode location
                        if (devMode) {
                            setLocation({
                                coords: {
                                    latitude: DEV_MODE_LOCATION.latitude,
                                    longitude: DEV_MODE_LOCATION.longitude,
                                    altitude: 0,
                                    accuracy: 0,
                                    altitudeAccuracy: 0,
                                    heading: 0,
                                    speed: 0,
                                },
                                timestamp: Date.now(),
                            });

                            //grabs elevatoin for dev mode location
                            const elevation = await getElevation(DEV_MODE_LOCATION.latitude, DEV_MODE_LOCATION.longitude);
                            if (elevation !== null) setUserElevation(elevation);

                        } else {
                            //no dev mode, update location 
                            setLocation(newLocation);

                            // Fetch elevation dynamically
                            const elevation = await getElevation(newLocation.coords.latitude, newLocation.coords.longitude);
                            if (elevation !== null) setUserElevation(elevation);
                        }
                    }
                );
            } catch (error) {
                Alert.alert("Error", "An error occurred while fetching location updates.");
            }
        };

        //start function to get updates
        startLocationUpdates();

        //cleanup function
        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
        //allows function to run again once dev mode changes
    }, [devMode]);

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
                    {/* Course Info Box - Show either Dev Mode Course or Selected Course */}
                    <View style={styles.headerContainer}>
                        {devMode ? (
                            <>
                                <Text style={styles.headerText}>Tee: {DEV_MODE_HOLE.tee}</Text>
                                <Text style={styles.headerText}>Hole: #{DEV_MODE_HOLE.hole_number}</Text>
                                <Text style={styles.headerText}>Distance: {DEV_MODE_HOLE.distance} yards</Text>
                                <Text style={styles.headerText}>Par: {DEV_MODE_HOLE.par}</Text>
                                <Text style={styles.headerText}>Handicap: {DEV_MODE_HOLE.handicap}</Text>
                            </>
                        ) : (
                            course && selectedTee && holes ? (
                                <>
                                    <Text style={styles.headerText}>Tee: {selectedTee}</Text>
                                    <Text style={styles.headerText}>Hole: #{holes[currentHoleIndex]?.hole_number}</Text>
                                    <Text style={styles.headerText}>Distance: {holes[currentHoleIndex]?.distance} yards</Text>
                                    <Text style={styles.headerText}>Par: {holes[currentHoleIndex]?.par}</Text>
                                    <Text style={styles.headerText}>Handicap: {holes[currentHoleIndex]?.handicap}</Text>
                                </>
                            ) : (
                                <Text style={styles.headerText}>No course selected</Text>
                            )
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
                            From: {windDirection !== null ? getCardinalDirection(windDirection) : "--"}
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
                        onPress={() => navigation.navigate('ScorecardScreen')}
                    >
                        <Text style={styles.buttonText}>Scorecard</Text>
                    </TouchableOpacity>

                    <TrackShotModal
                        visible={isTrackShotVisible}
                        distance={parseFloat(getDistance() || "0")}
                        onClose={() => setIsTrackShotVisible(false)}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    /** === modals Track Shot === **/
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
