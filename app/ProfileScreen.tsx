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

        try {
            const userClubs = await getUserClubs(userId);
            const trackedShots = await getTrackedShots(userId);

            // group tracked shots by club
            const clubAverages: Record<string, { totalDistance: number; count: number }> = {};

            trackedShots.forEach((shot) => {
                const clubName = shot.club;

                // Match by first number OR first letter (for wedges)
                const clubKey = clubName.match(/\d+/)?.[0] ?? clubName.slice(0, 2).toUpperCase();

                if (!clubAverages[clubKey]) {
                    clubAverages[clubKey] = { totalDistance: 0, count: 0 };
                }

                clubAverages[clubKey].totalDistance += shot.distance;
                clubAverages[clubKey].count += 1;
            });

            // Merge default clubs with user averages
            const mergedClubs = DEFAULT_CLUBS.map((defaultClub) => {
                // Extract number from default club 9 from 9I
                const clubKey = defaultClub.club.match(/\d+/)?.[0] ??
                    defaultClub.club.slice(0, 2).toUpperCase();

                if (clubKey && clubAverages[clubKey]) {
                    const { totalDistance, count } = clubAverages[clubKey];
                    const averageDistance = Math.round(totalDistance / count);

                    // Return merged club with average distance
                    return { ...defaultClub, distance: averageDistance };
                }

                // If no tracked shots, keep the default distance
                return defaultClub;
            });

            setClubs(mergedClubs);
        } catch (error) {
            console.error("Error fetching clubs and tracked shots:", error);
            // Fallback to default if any error
            setClubs(DEFAULT_CLUBS);
        }
    };

    // fetch tracked shots
    const fetchTrackedShots = async () => {
        if (!userId) {
            console.error("User not signed in.");
            return;
        }
        try {
            const shots = await getTrackedShots(userId);
            setTrackedShots(shots);
        } catch (error) {
            console.error("Error fetching tracked shots:", error);
        }
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
                trackedShots.map((shot, index) => (
                    <View key={shot.id} style={styles.trackedShotRow}>
                        <Text>{`${shot.club}: ${shot.distance} yards`}</Text>
                        <Text style={styles.timestamp}>Tracked: {new Date(shot.timestamp).toLocaleString()}</Text>
                    </View>
                ))
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
