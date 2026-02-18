import { addDoc, serverTimestamp } from "firebase/firestore";
import { logsCollection } from "./firestoreCollections";

export const logService = {
  async addLog(userEmail: string, action: string) {
    try {
      await addDoc(logsCollection, {
        userEmail,
        action,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding log:", error);
      // Optionally, handle the error more gracefully
    }
  },
};
