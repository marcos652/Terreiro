import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';

export interface MembershipItem {
  id?: string;
  name: string;
  value: number;
  status: 'pago' | 'pendente';
  lastPayment: string;
  created_at: string;
}

export async function addMembership(item: Omit<MembershipItem, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTIONS.MEMBERSHIPS), item);
  return docRef.id;
}

export async function getMemberships() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.MEMBERSHIPS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as MembershipItem));
}

export async function updateMembership(id: string, data: Partial<MembershipItem>) {
  const docRef = doc(db, COLLECTIONS.MEMBERSHIPS, id);
  await setDoc(docRef, data, { merge: true });
}
