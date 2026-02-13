import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './firestoreCollections';

export interface CantigaItem {
  id?: string;
  category: string;
  title?: string;
  lyrics: string;
  created_at: string;
}

export async function addCantiga(item: Omit<CantigaItem, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTIONS.CANTIGAS), item);
  return docRef.id;
}

export async function getCantigas() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.CANTIGAS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CantigaItem));
}

export async function updateCantiga(id: string, data: Partial<CantigaItem>) {
  const docRef = doc(db, COLLECTIONS.CANTIGAS, id);
  await setDoc(docRef, data, { merge: true });
}

export async function deleteCantiga(id: string) {
  const docRef = doc(db, COLLECTIONS.CANTIGAS, id);
  await deleteDoc(docRef);
}
