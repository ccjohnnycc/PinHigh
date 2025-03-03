import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
    CourseSearch: undefined;
    TeeSelectionScreen: { course: Course };
    map: { course: Course; selectedTee: string, holes: HoleData[] };

};

type Course = {
    course_name: string;
    tees: {
        [gender: string]: TeeData[];
    };
    location: {
        latitude: number;
        longitude: number;
    };
};

type TeeData = {
    tee_name: string;
    holes: HoleDataFromAPI[];
};

type HoleDataFromAPI = {
    par: number;
    yardage: number;
    handicap: number;
};

type HoleData = {
    hole_number: number;
    distance: number;
    par: number;
    handicap: number;
};


export default function TeeSelectionScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'TeeSelectionScreen'>>();

    // Check if the course data is available to prevent crashes
    if (!route.params || !route.params.course) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Error: No course data found.</Text>
            </View>
        );
    }

    // Course data from the previous screen
    const { course } = route.params;
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    // Log the course data to the console (debugging)
    //console.log("Course data received in TeeSelectionScreen:", course);

    //console.log("Full Course Data:", JSON.stringify(course, null, 2));


    // Default to "male" tees
    const [selectedGender, setSelectedGender] = useState<string>('male');
    const [availableTeeNames, setAvailableTeeNames] = useState<string[]>([]);

    useEffect(() => {
        if (course.tees[selectedGender]) {
            setAvailableTeeNames(course.tees[selectedGender].map(tee => tee.tee_name));
        }
    }, [selectedGender]);

    const handleTeeSelect = (teeName: string) => {
        // Get holes for the selected tee
        const selectedTeeData = course.tees[selectedGender].find((tee) => tee.tee_name === teeName);

        if (!selectedTeeData) {
            console.error("No data found for tee:", teeName);
            return;
        }

        // Assign hole numbers dynamically
        const holes: HoleData[] = selectedTeeData.holes.map((hole, index) => ({
            // Hole numbers start from 1
            hole_number: index + 1,
            // distance of each hole
            distance: hole.yardage,
            par: hole.par,
            handicap: hole.handicap,
        }));

        // Navigate to the MapScreen with the selected tee data
        navigation.navigate('map', { course, selectedTee: teeName, holes });

    };

    return (
        <View style={styles.container}>

            {/* Floating Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={30} color="white" />
            </TouchableOpacity>

            <Text style={styles.title}>Select a Tee</Text>

            {/* Gender Selection Buttons */}
            <View style={styles.genderSelection}>
                <TouchableOpacity
                    style={[styles.genderButton, selectedGender === 'male' && styles.selectedGender]}
                    onPress={() => setSelectedGender('male')}
                >
                    <Text style={styles.buttonText}>Male</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.genderButton, selectedGender === 'female' && styles.selectedGender]}
                    onPress={() => setSelectedGender('female')}
                >
                    <Text style={styles.buttonText}>Female</Text>
                </TouchableOpacity>
            </View>

            {/* Tee Selection */}
            <ScrollView style={styles.teeContainer}>
                {availableTeeNames.length > 0 ? (
                    availableTeeNames.map((teeName) => (
                        <TouchableOpacity
                            key={teeName}
                            style={styles.teeButton}
                            onPress={() => handleTeeSelect(teeName)}
                        >
                            <Text style={styles.teeButtonText}>{teeName}</Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text style={styles.errorText}>No tees available for this category.</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        backgroundColor: "#1E1E1E",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 80,
    },
    title: { 
        fontSize: 28,
        fontWeight: "bold",
        color: "#FFD700",
        marginBottom: 20,
        textTransform: "uppercase",
        textShadowColor: "rgba(0, 0, 0, 0.8)",
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
    },
    genderSelection: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    genderButton: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 30,
        marginHorizontal: 10,
        backgroundColor: "#444",
        alignItems: "center",
    },
    selectedGender: {
        backgroundColor: '#FF8C00',
    },
    genderText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    teeContainer: {
        width: "100%",
    },
    teeButton: {
        backgroundColor: "#FF8C00",
        paddingVertical: 15,
        borderRadius: 30,
        marginBottom: 10,
        width: width * 0.8,
        alignItems: "center",
        alignSelf: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    teeButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    buttonText: { 
        color: 'white', 
        fontWeight: 'bold' 
    },
    errorText: {
        color: "red",
        fontSize: 16,
        marginTop: 10,
        textAlign: "center",
    },

    /** === Back Button === **/
    backButton: {
        position: "absolute",
        top: 40,
        left: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        padding: 10,
        borderRadius: 50,
    },
});
