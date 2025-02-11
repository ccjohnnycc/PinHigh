import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';

type RootStackParamList = {
    CourseSearch: undefined;
    TeeSelectionScreen: { course: Course };
    map: { course: Course; selectedTee: string };
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


export default function TeeSelectionScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'TeeSelectionScreen'>>();
    // Course data from the previous screen
    const { course } = route.params;
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    // Get tee options "blue", "red", "female"
    const availableTees = Object.keys(course.tees);

    const handleTeeSelect = (teeName: string) => {
        // Navigate to the MapScreen with the selected tee data
        navigation.navigate('map', { course, selectedTee: teeName });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select a Tee</Text>
            {availableTees.map((teeName) => (
                <TouchableOpacity
                    key={teeName}
                    style={styles.teeButton}
                    onPress={() => handleTeeSelect(teeName)}
                >
                    <Text style={styles.buttonText}>{teeName}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
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
