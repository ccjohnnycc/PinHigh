import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet } from 'react-native';
import axios from 'axios';
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';

type Course = {
    id: number;
    club_name: string;
    course_name: string;
    location: {
        city: string;
        state: string;
    };
};

type RootStackParamList = {
    CourseSearch: undefined;
    TeeSelectionScreen: { course: Course };
};

export default function CourseSearchScreen() {
    const [query, setQuery] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    const API_KEY = 'XEC2K7J62Z5ZSAHQTXGFMZS6G4';
    const API_URL = 'https://api.golfcourseapi.com/v1/search';

    const searchCourses = async () => {
        try {
            const response = await axios.get<{ courses: Course[] }>(API_URL, {
                params: { search_query: query },
                headers: {
                    Authorization: `Key ${API_KEY}`,
                },
            });
            setCourses(response.data.courses || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            alert('Failed to fetch courses. Please try again.');
        }
    };

    const handleCourseSelect = (course: Course) => {
        navigation.navigate('TeeSelectionScreen', { course });
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Search for a course"
                value={query}
                onChangeText={setQuery}
            />
            <Button title="Search" onPress={searchCourses} />
            <FlatList
                data={courses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <Text style={styles.course} onPress={() => handleCourseSelect(item)}>
                        {item.club_name} - {item.course_name}, {item.location.city}, {item.location.state}
                    </Text>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
    course: { padding: 10, borderBottomWidth: 1 },
});
