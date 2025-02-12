import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';

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
                <Text style={{ color: "red", fontSize: 18 }}>Error: No course data found.</Text>
            </View>
        );
    }

    // Course data from the previous screen
    const { course } = route.params;
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    // Log the course data to the console (debugging)
    //console.log("Course data received in TeeSelectionScreen:", course);

    console.log("Full Course Data:", JSON.stringify(course, null, 2));


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

            {/* Tee Name Selection */}
            {availableTeeNames.length > 0 ? (
                availableTeeNames.map((teeName) => (
                    <TouchableOpacity
                        key={teeName}
                        style={styles.teeButton}
                        onPress={() => handleTeeSelect(teeName)}
                    >
                        <Text style={styles.buttonText}>{teeName}</Text>
                    </TouchableOpacity>
                ))
            ) : (
                <Text style={{ color: "red", marginTop: 10 }}>No tees available for this category.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    
    genderSelection: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    genderButton: {
        backgroundColor: '#888',
        padding: 10,
        marginHorizontal: 10,
        borderRadius: 5,
    },
    selectedGender: {
        backgroundColor: '#2196F3',
    },
    teeButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        marginVertical: 10,
        borderRadius: 5,
        width: '80%',
        alignItems: 'center',
    },
    buttonText: { color: 'white', fontWeight: 'bold' },
});
