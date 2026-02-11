import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';

export interface EventItem {
  id?: string;
  title: string;
  date: string;
  time: string;
  leader: string;
  status: 'confirmado' | 'pendente';
  created_at: string;
}

export async function addEvent(item: Omit<EventItem, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTIONS.EVENTS), item);
  return docRef.id;
}

export async function getEvents() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.EVENTS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as EventItem));
}

export async function updateEvent(id: string, data: Partial<EventItem>) {
  const docRef = doc(db, COLLECTIONS.EVENTS, id);
  await setDoc(docRef, data, { merge: true });
}

export async function deleteEvent(id: string) {
  const docRef = doc(db, COLLECTIONS.EVENTS, id);
  await deleteDoc(docRef);
}
