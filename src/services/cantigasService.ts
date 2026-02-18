import { collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

export interface CantigaItem {
  id?: string;
  category: string;
  title?: string;
  lyrics: string;
  created_at: string;
}

export async function addCantiga(item: Omit<CantigaItem, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.CANTIGAS), item);
  if (userEmail) await logService.addLog(userEmail, `Criou cantiga: ${item.title}`);
  return docRef.id;
}

export async function getCantigas() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.CANTIGAS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CantigaItem));
}

export async function updateCantiga(id: string, data: Partial<CantigaItem>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.CANTIGAS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Alterou cantiga ${id}: ${changes}`);
  }
}

export async function deleteCantiga(id: string, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.CANTIGAS, id);
  await deleteDoc(docRef);
  if (userEmail) await logService.addLog(userEmail, `Excluiu cantiga: ${id}`);
}
