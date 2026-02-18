import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string; // hash
  role: 'MASTER' | 'MEMBER';
  status: 'PENDENTE' | 'APROVADO';
  created_at: string;
}

export async function addUser(user: Omit<User, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.USERS), user);
  if (userEmail) await logService.addLog(userEmail, `Criou usuário: ${user.email}`);
  return docRef.id;
}

export async function getUsers() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function getUserById(id: string) {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  }
  return null;
}

export async function updateUser(id: string, data: Partial<User>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Alterou usuário ${id}: ${changes}`);
  }
}

export async function upsertUser(id: string, data: Partial<User>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Upsert usuário ${id}: ${changes}`);
  }
}
