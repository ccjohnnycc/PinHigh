import { collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

//default clubs for new users or fallback
export const DEFAULT_CLUBS = [
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

// save a tracked shot to Firebase
export const saveTrackedShot = async (userId: string, club: string, distance: number): Promise<void> => {
    if (!userId || !club || distance <= 0) throw new Error("Invalid shot data.");

    try {
        await addDoc(collection(db, `users/${userId}/trackedShots`), {
            club,
            distance,
            timestamp: new Date().toISOString(),
        });
        console.log(`✅ Tracked shot saved: ${club} - ${distance} yards.`);
    } catch (error) {
        console.error("Error saving tracked shot:", error);
        throw new Error("Failed to save tracked shot.");
    }
};

// fetch all tracked shots for the user
export const getTrackedShots = async (userId: string): Promise<{ id: string; club: string; 
    distance: number; timestamp: string }[]> => {
    if (!userId) return [];

    try {
        const querySnapshot = await getDocs(collection(db, `users/${userId}/trackedShots`));
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            club: doc.data().club,
            distance: doc.data().distance,
            timestamp: doc.data().timestamp,
        }));
    } catch (error) {
        console.error("Error fetching tracked shots:", error);
        return [];
    }
};

// delete a specific tracked shot
export const deleteTrackedShot = async (userId: string, shotId: string): Promise<void> => {
    if (!userId || !shotId) throw new Error("Invalid input for shot deletion.");

    try {
        await deleteDoc(doc(db, `users/${userId}/trackedShots`, shotId));
        console.log(`✅ Deleted tracked shot: ${shotId}`);
    } catch (error) {
        console.error("Error deleting tracked shot:", error);
        throw new Error("Failed to delete tracked shot.");
    }
};

// save a club and distance
export const saveClubAndDistance = async (
    userId: string,
    club: string,
    distance: number
): Promise<void> => {
    if (!club || distance <= 0) {
        throw new Error("Invalid club or distance.");
    }

    try {
        await addDoc(collection(db, `users/${userId}/clubs`), {
            club,
            distance,
            timestamp: new Date().toISOString(),
        });
        console.log("Club and distance saved!");
    } catch (error) {
        console.error("Error saving club and distance:", error);
        throw new Error("Failed to save club and distance.");
    }
};

// get all clubs and distances
export const getClubsAndDistances = async (
    userId: string
): Promise<{ club: string; distance: number }[]> => {
    if (!userId) return DEFAULT_CLUBS;
    try {
        const querySnapshot = await getDocs(
            collection(db, `users/${userId}/clubs`)
        );
        if (querySnapshot.empty) {
            console.log("No clubs found.");
            return DEFAULT_CLUBS;
        }

        return querySnapshot.docs.map((doc) => doc.data() as { club: string; distance: number });
    } catch (error) {
        console.error("Error fetching clubs and distances:", error);
        return DEFAULT_CLUBS;
    }
};

// save or update a club distance
export const updateUserClub = async (userId: string, club: string, distance: number): Promise<void> => {
    if (!userId || !club || distance <= 0) throw new Error("Invalid input for club update.");

    try {
        const clubRef = doc(db, `users/${userId}/clubs`, club);
        await setDoc(clubRef, { club, distance }, { merge: true });

        console.log(`✅ Updated: ${club} to ${distance} yards.`);
    } catch (error) {
        console.error("Error updating club distance:", error);
        throw new Error("Failed to update club.");
    }
};

// fetch user clubs or fallback to default clubs
export const getUserClubs = async (userId: string): Promise<{ club: string; distance: number }[]> => {
    if (!userId) return DEFAULT_CLUBS;

    try {
        const querySnapshot = await getDocs(collection(db, `users/${userId}/clubs`));
        if (querySnapshot.empty) {
            console.log("No user clubs found. Returning defaults.");
            return DEFAULT_CLUBS;
        }

        return querySnapshot.docs.map((doc) => doc.data() as { club: string; distance: number });
    } catch (error) {
        console.error("Error fetching user clubs:", error);
        return DEFAULT_CLUBS;
    }
};


// delete a specific club
export const deleteUserClub = async (userId: string, club: string): Promise<void> => {
    if (!userId || !club) throw new Error("Invalid input for club deletion.");

    try {
        const clubRef = doc(db, `users/${userId}/clubs`, club);
        await deleteDoc(clubRef);

        console.log(`✅ Deleted club: ${club}`);
    } catch (error) {
        console.error("Error deleting club:", error);
        throw new Error("Failed to delete club.");
    }
};

// algorithm for suggesting a club based on distance
export const suggestClub = (distance: number, clubs: { club: string; distance: number }[]): string => {
    if (!clubs.length) return "No clubs available.";

    const closest = clubs.reduce((prev, curr) =>
        Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev
    );

    return closest.club;
};

// save scorecards
export const saveScorecard = async (
    userId: string,
    scorecard: { players: { name: string; scores: number[] }[]; data: string; course: string }
): Promise<void> => {
    if (!userId || !scorecard?.players?.length) throw new Error("Invalid scorecard data");

    try {
        await addDoc(collection(db, `users/${userId}/scorecards`), {
            ...scorecard,
            timestamp: new Date().toISOString(),
        });
        console.log("Scorecard saved");
    } catch (error) {
        console.error("Error saving scorecard:", error);
        throw new Error("Failed to save scorecard");
    }
};

// retrieve scrorecards
export const getScorecards = async (userId: string): Promise<any[]> => {
    if (!userId) return [];

    try {
        const querySnapshot = await getDocs(collection(db, `users/${userId}/scorecards`));
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching scorecards:", error);
        throw new Error("Failed to fetch scorecards.");
    }
};

// delete a scorecard
export const deleteScorecard = async (userId: string, scorecardId: string): Promise<void> => {
    if (!userId || !scorecardId) throw new Error("Invalid input for scorecard deletion.");

    try {
        await deleteDoc(doc(db, `users/${userId}/scorecards`, scorecardId));
        console.log(`Scorecard ${scorecardId} deleted.`);
    } catch (error) {
        console.error("Error deleting scorecard:", error);
        throw new Error("Failed to delete scorecard.");
    }
};