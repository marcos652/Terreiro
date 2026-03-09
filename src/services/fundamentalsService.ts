import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

export interface FundamentalItem {
  id?: string;
  category: string;
  title?: string;
  content: string;
  created_at: string;
}

export async function addFundamental(item: Omit<FundamentalItem, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.FUNDAMENTALS), item);
  if (userEmail) await logService.addLog(userEmail, `Criou fundamento: ${item.category}`);
  return docRef.id;
}

export async function getFundamentals() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.FUNDAMENTALS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as FundamentalItem));
}

export async function updateFundamental(id: string, data: Partial<FundamentalItem>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.FUNDAMENTALS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Alterou fundamento ${id}: ${changes}`);
  }
}

export async function deleteFundamental(id: string, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.FUNDAMENTALS, id);
  await deleteDoc(docRef);
  if (userEmail) await logService.addLog(userEmail, `Removeu fundamento: ${id}`);
}
