import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

export interface EventItem {
  id?: string;
  title: string;
  date: string;
  time: string;
  leader: string;
  status: 'confirmado' | 'pendente' | 'cancelado';
  created_at: string;
}

export async function addEvent(item: Omit<EventItem, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.EVENTS), item);
  if (userEmail) await logService.addLog(userEmail, `Criou evento: ${item.title}`);
  return docRef.id;
}

export async function getEvents() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.EVENTS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as EventItem));
}

export async function updateEvent(id: string, data: Partial<EventItem>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.EVENTS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Alterou evento ${id}: ${changes}`);
  }
}

export async function deleteEvent(id: string, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.EVENTS, id);
  await deleteDoc(docRef);
  if (userEmail) await logService.addLog(userEmail, `Excluiu evento: ${id}`);
}
