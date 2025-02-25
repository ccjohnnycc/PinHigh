import React, { useEffect, useState, useCallback } from "react";
import {
    View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
    Modal, TextInput, Button, Alert, Image
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine";
import { saveClubAndDistance, getClubsAndDistances, suggestClub } from "./firebaseUtils";
import { auth } from "./firebaseConfig";
import { useRoute, RouteProp, useNavigation, NavigationProp } from '@react-navigation/native';
import axios from 'axios';
//import { getDistance } from 'geolib';

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
    const [showMenu, setShowMenu] = useState(false);


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
        const distanceInYards = distanceInMeters * 1.09361;
        return Math.round(distanceInYards);
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

    // Calculate midpoint for distance box
    const getMidpoint = () => {
        if (!location || !selectedPoint) return null;
        return {
            latitude: (location.coords.latitude + selectedPoint.latitude) / 2,
            longitude: (location.coords.longitude + selectedPoint.longitude) / 2,
        };
    };

    return (
        <View style={styles.container}>
            {!location ? (
                <ActivityIndicator size="large" />
            ) : (
                <>
                    {/* Course Info Box - Show either Dev Mode Course or Selected Course */}
                    {(devMode || (course && selectedTee && holes?.length > 0)) && (
                        <View style={styles.headerContainer}>
                            <View style={styles.headerItem}>
                                <Text style={styles.headerLabel}>Hole </Text>
                                <Text style={styles.headerValue}>#{currentHole?.hole_number || DEV_MODE_HOLE.hole_number}</Text>
                            </View>
                            <View style={styles.headerItem}>
                                <Text style={styles.headerLabel}>To Hole </Text>
                                <Text style={styles.headerValue}>{currentHole?.distance || DEV_MODE_HOLE.distance}y</Text>
                            </View>
                            <View style={styles.headerItem}>
                                <Text style={styles.headerLabel}>Par </Text>
                                <Text style={styles.headerValue}>{currentHole?.par || DEV_MODE_HOLE.par}</Text>
                            </View>
                            <View style={styles.headerItem}>
                                <Text style={styles.headerLabel}>Tee </Text>
                                <Text style={styles.headerValue}>{selectedTee || DEV_MODE_HOLE.tee}</Text>
                            </View>
                            <View style={styles.headerItem}>
                                <Text style={styles.headerLabel}>Handicap </Text>
                                <Text style={styles.headerValue}>{currentHole?.handicap || DEV_MODE_HOLE.handicap}</Text>
                            </View>
                        </View>
                    )}
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
                        {/* User current location Marker */}
                        <Marker
                            coordinate={{
                                latitude: location.coords.latitude,
                                longitude: location.coords.longitude
                            }}>
                            <Image source={require('../assets/images/golf_ball.png')} style={{ width: 30, height: 30 }} />
                        </Marker>

                        {/* Selected Point Marker */}
                        {selectedPoint && (
                            <Marker
                                coordinate={selectedPoint}
                                title="Selected Point"
                                pinColor="red"
                            />
                        )}

                        {/* Line */}
                        {location && selectedPoint && (
                            <Polyline
                                coordinates={[
                                    { latitude: location.coords.latitude, longitude: location.coords.longitude },
                                    { latitude: selectedPoint.latitude, longitude: selectedPoint.longitude }
                                ]}
                                strokeColor="#fff"
                                strokeWidth={3}
                                lineDashPattern={[4, 3]}
                            />
                        )}
                    </MapView>

                    {/* Distance Display */}
                    {selectedPoint && getDistance() !== null && (
                        <View style={styles.distanceContainer}>
                            {/* Main Distance */}
                            <View style={styles.mainDistanceBox}>
                                <Text style={styles.mainDistanceText}>
                                    {getDistance()}y
                                </Text>
                            </View>

                            {/* Plays Like Section */}
                            <View style={styles.playsLikeBox}>
                                <Text style={styles.playsLikeLabel}>Plays Like </Text>
                                <Text style={styles.playsLikeDistance}>
                                    {Math.round(
                                        getDistance()! +
                                        (markedElevation !== null && userElevation !== null
                                            ? (markedElevation - userElevation) * 1.0
                                            : 0)
                                    )}y
                                </Text>
                            </View>

                        </View>
                    )}

                    {/* Elevation */}
                    <View style={styles.elevationBox}>
                        {userElevation !== null && markedElevation !== null ? (
                            <>
                                <Text style={styles.elevationText}>
                                    {Math.round((markedElevation - userElevation) * 3.28084)} ft {
                                        markedElevation > userElevation ? "⬆️" : "⬇️"}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.elevationText}>Elevation: -- ft</Text>
                        )}
                    </View>

                    {/* club suggestion */}
                    {selectedPoint && getDistance() !== null && clubs.length > 0 && (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                Club: {suggestClub(getDistance()!, clubs)}
                            </Text>
                        </View>
                    )}

                    {/* wind */}
                    <View style={styles.weatherBox}>
                        <View style={styles.headerItem}>
                            <Text style={styles.weatherWind}>Wind</Text>
                            <Text style={styles.weatherText}>
                                {windSpeed} mph
                            </Text>
                            <Text style={styles.weatherText}>
                                From: {getCardinalDirection(windDirection || 0)}
                            </Text>
                        </View>
                    </View>


                    {/* Menu */}
                    {/* Sidebar Toggle Button */}
                    <TouchableOpacity
                        style={[
                            styles.menuToggle,
                            // Move the arrow out with the menu
                            { right: showMenu ? 150 : 10 }
                        ]}
                        onPress={() => setShowMenu(!showMenu)}
                    >
                        <Text style={styles.menuToggleText}>{showMenu ? "❮" : "❯"}</Text>
                    </TouchableOpacity>
                    {showMenu && (
                        <View style={styles.menuContainer}>
                            <TouchableOpacity style={styles.menuButton} onPress={handlePrevHole}>
                                <Text style={styles.buttonText}>Prev Hole</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuButton} onPress={handleNextHole}>
                                <Text style={styles.buttonText}>Next Hole</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('ScorecardScreen')}>
                                <Text style={styles.buttonText}>Scorecard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuButton} onPress={() => setIsTrackShotVisible(true)}>
                                <Text style={styles.buttonText}>Track Shot</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Track Shot Modal */}
                    <TrackShotModal
                        visible={isTrackShotVisible}
                        distance={getDistance()}
                        onClose={() => setIsTrackShotVisible(false)}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    /** === MAP & INFO DISPLAYS === **/
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },

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

    /** === TEXT INPUTS & LABELS === **/
    input: {
        borderWidth: 1,
        borderColor: "black",
        padding: 10,
        marginVertical: 5,
        borderRadius: 5,
        width: "100%",
    },

    /** === SIDE MENU === **/
    menuToggle: {
        position: "absolute",
        top: "50%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 15,
        borderRadius: 10,
    },
    menuToggleText: {
        color: "#fff",
        fontSize: 18
    },
    menuContainer: {
        position: "absolute",
        top: "40%",
        right: 10,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 10,
        borderRadius: 10,
    },
    menuButton: {
        backgroundColor: "green",
        padding: 10,
        marginBottom: 5,
        borderRadius: 5,
        alignItems: "center",
    },

    /** === BUTTONS === **/
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },

    /** CLUB SUGGESTION **/
    infoBox: {
        position: "absolute",
        bottom: 35,
        left: 10,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: 10,
        borderRadius: 5,
        elevation: 3,
    },
    infoText: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "bold",
    },

    /** DISTANCE BOXES **/
    distanceContainer: {
        position: "absolute",
        top: "50%",
        left: "20%",
        transform: [{ translateX: -80 }, { translateY: -20 }],
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.77)",
        borderRadius: 30,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    mainDistanceBox: {
        marginRight: -2,
        padding: 15,
        borderRadius: 30,
        backgroundColor: "rgba(0, 0, 0, 0.89)",
    },
    mainDistanceText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
    },
    playsLikeBox: {
        alignItems: "center",
        padding: 10,
    },
    playsLikeLabel: {
        color: "#000",
        fontSize: 8,
        textTransform: "uppercase",
    },
    playsLikeDistance: {
        color: "#000",
        fontSize: 15,
        fontWeight: "bold",
    },

    /** === HEADER INFO (Course details) === **/
    headerContainer: {
        position: "absolute",
        top: 10,
        left: 10,
        right: 10,
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "rgba(34, 139, 34, 0.93)",
        padding: 10,
        borderRadius: 30,
        // render last
        zIndex: 100,
    },
    headerItem: {
        alignItems: "center"
    },
    headerLabel: {
        fontSize: 12,
        color: "#ddd"
    },
    headerValue: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#fff"
    },

    /** === WEATHER BOX === **/
    weatherBox: {
        position: "absolute",
        top: 100,
        right: 10,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: 10,
        borderRadius: 30,
        elevation: 3,
    },
    weatherWind: {
        fontSize: 14,
        fontWeight: "bold",
        justifyContent: "center",
        color: "#fff",
    },
    weatherText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
    },
    /** === Elevation Box/ text === **/
    elevationBox: {
        position: "absolute",
        top: 205,
        right: 10,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        padding: 10,
        borderRadius: 30,
        elevation: 3,
    },
    elevationText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#fff",
    },
});
