import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

export interface User {
  id?: string;
  name: string;
  email: string;
  password?: string; // hash
  role: 'MASTER' | 'EDITOR' | 'VISUALIZADOR';
  status: 'PENDENTE' | 'APROVADO' | 'BLOQUEADO' | 'DESATIVADO';
  permissions?: string[]; // usado para EDITOR
  created_at: string;
}

export async function addUser(user: Omit<User, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.USERS), user);
  if (userEmail) await logService.addLog(userEmail, `Criou usuário: ${user.email}`);
  return docRef.id;
}

export async function upsertUserById(id: string, data: Omit<User, 'id'>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) await logService.addLog(userEmail, `Upsert usuário ${id}: ${data.email}`);
  return id;
}

export async function getUsers() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

export async function getUserById(id: string) {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as User;
    const normalizedRole = (data.role || 'VISUALIZADOR').toUpperCase() as User['role'];
    // fallback para garantir status/role ativos
    const role = normalizedRole;
    const status = (data.status || 'APROVADO') as User['status'];
    return { id: docSnap.id, ...data, role, status };
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

export async function deleteUser(id: string, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await deleteDoc(docRef);
  if (userEmail) await logService.addLog(userEmail, `Removeu usuário: ${id}`);
}
