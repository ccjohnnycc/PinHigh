import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Save a club and distance
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

// Get all clubs and distances
export const getClubsAndDistances = async (
    userId: string
): Promise<{ club: string; distance: number }[]> => {
    try {
        const querySnapshot = await getDocs(
            collection(db, `users/${userId}/clubs`)
        );
        if (querySnapshot.empty) {
            console.log("No clubs found.");
            return [];
        }

        const clubs: { club: string; distance: number }[] = [];
        querySnapshot.forEach((doc) => {
            clubs.push(doc.data() as { club: string; distance: number });
        });
        return clubs;
    } catch (error) {
        console.error("Error fetching clubs and distances:", error);
        throw new Error("Failed to fetch clubs and distances.");
    }
};

// algorithm for suggesting a club based on distance
export const suggestClub = (
    distance: number,
    clubs: { club: string; distance: number }[]
): string => {
    if (clubs.length === 0) {
        return "No clubs available.";
    }

    const closest = clubs.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.distance - distance);
        const currDiff = Math.abs(curr.distance - distance);
        return currDiff < prevDiff ? curr : prev;
    });
    return closest.club;
};

// save scorecards
export const saveScorecard = async (
    userId: string,
    scorecard: { player: string; scores: number[]; data: string; course: string }
): Promise<void> => {
    if (!scorecard || !scorecard.player || !Array.isArray(scorecard.scores)) {
        throw new Error("Invalid scorecard data.");
    }

    try {
        await addDoc(collection(db, `users/${userId}/scorecards`), scorecard); 
        //{
            //...scorecard,
            //timestamp: new Date().toISOString(),
        //});
        console.log("Scorecard saved!", scorecard);
    } catch (error) {
        console.error("Error saving scorecard:", error);
        throw new Error("Failed to save scorecard.");
    }
};

// retrieve scrorecards
export const getScorecards = async (
    userId: string
): Promise<{ player: string; scores: number[] }[]> => {
    try {
        const querySnapshot = await getDocs(
            collection(db, `users/${userId}/scorecards`)
        );
        if (querySnapshot.empty) {
            console.log("No scorecards found.");
            return [];
        }

        const scorecards: { player: string; scores: number[] }[] = [];
        querySnapshot.forEach((doc) => {
            scorecards.push(doc.data() as { player: string; scores: number[] });
        });
        return scorecards;
    } catch (error) {
        console.error("Error fetching scorecards:", error);
        throw new Error("Failed to fetch scorecards.");
    }
};