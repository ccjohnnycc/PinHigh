import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, FlatList, Button, StyleSheet,
    Alert
} from 'react-native';
import {
    DEFAULT_CLUBS, getUserClubs, updateUserClub, getTrackedShots,
    deleteTrackedShot, getScorecards, deleteScorecard
} from './firebaseUtils';
import { auth } from './firebaseConfig';

type TrackedShot = {
    id: string;
    club: string;
    distance: number;
    timestamp: string;
  };

  type Scorecard = {
    id: string;
    course: string;
    date: string;
    player: string;
    scores: number[];
  };

export default function ProfileScreen() {
    const [clubs, setClubs] = useState(DEFAULT_CLUBS);
    const [trackedShots, setTrackedShots] = useState<TrackedShot[]>([]);
    const [scorecards, setScorecards] = useState<Scorecard[]>([]);
    const userId = auth.currentUser?.uid;

    // fetch user data
    useEffect(() => {
        if (userId) {
            fetchClubs();
            fetchTrackedShots();
            fetchScorecards();
        }
    }, [userId]);

    // fetch user clubs
    const fetchClubs = async () => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }

        const userClubs = await getUserClubs(userId);
        setClubs(userClubs.length > 0 ? userClubs : DEFAULT_CLUBS);
    };

    // fetch tracked shots
    const fetchTrackedShots = async () => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }
        const shots = await getTrackedShots(userId);
        setTrackedShots(shots);
    };

    // fetch saved scorecards
    const fetchScorecards = async () => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }
        const cards = await getScorecards(userId);
        setScorecards(cards);
    };

    // update club distance
    const handleClubDistanceChange = (club: string, newDistance: string) => {
        const updatedClubs = clubs.map((c) =>
            c.club === club ? { ...c, distance: parseInt(newDistance) || 0 } : c
        );
        setClubs(updatedClubs);
    };

    // save updated club to Firebase
    const saveClubDistance = async (club: string, distance: number) => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }
        await updateUserClub(userId, club, distance);
        Alert.alert('Success', `${club} distance updated to ${distance} yards.`);
    };

    // delete a tracked shot
    const handleDeleteTrackedShot = async (shotId: string) => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }
        await deleteTrackedShot(userId, shotId);
        // Refresh after deletion
        fetchTrackedShots();
    };

    // delete scorecard
    const handleDeleteScorecard = async (id: string) => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }
        await deleteScorecard(userId, id);
        fetchScorecards();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Profile</Text>

            {/* club Management */}
            <Text style={styles.sectionTitle}>Default Clubs</Text>
            <FlatList
                data={clubs}
                keyExtractor={(item) => item.club}
                renderItem={({ item }) => (
                    <View style={styles.clubRow}>
                        <Text style={styles.clubText}>{item.club}</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={item.distance.toString()}
                            onChangeText={(value) => handleClubDistanceChange(item.club, value)}
                            onBlur={() => saveClubDistance(item.club, item.distance)}
                        />
                        <Text style={styles.unitText}>yards</Text>
                    </View>
                )}
            />

            {/* tracked Shots Section */}
            <Text style={styles.sectionTitle}>Tracked Shots</Text>
            {trackedShots.length > 0 ? (
                <FlatList
                    data={trackedShots}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.trackedShotRow}>
                            <Text>{item.club}: {item.distance} yards </Text>
                            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
                            <Button title="Delete" onPress={() => handleDeleteTrackedShot(item.id)} color="red" />
                        </View>
                    )}
                />
            ) : (
                <Text>No tracked shots yet.</Text>
            )}

            {/* scorecards */}
            <Text style={styles.sectionTitle}>Saved Scorecards</Text>
            {scorecards.length > 0 ? (
                scorecards.map((card) => (
                    <View key={card.id} style={styles.scorecardRow}>
                        <Text>{card.course} - {card.date}</Text>
                        <Button title="Delete" onPress={() => handleDeleteScorecard(card.id)} color="red" />
                    </View>
                ))
            ) : (
                <Text>No saved scorecards yet.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container:
    {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff'
    },
    title:
    {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 24,
        marginTop: 20,
        marginBottom: 10
    },
    clubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    clubText: {
        flex: 1,
        fontSize: 18
    },
    input: {
        borderWidth: 1,
        padding: 5,
        width: 80,
        textAlign: 'center'
    },
    unitText: {
        marginLeft: 5
    },
    trackedShotRow: {
        flexDirection: 'column',
        marginVertical: 5
    },
    timestamp: {
        fontSize: 12,
        color: 'gray'
    },
    scorecardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 5
    },
});
