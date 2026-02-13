import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';

export interface CashTransaction {
  id?: string;
  label: string;
  type: 'entrada' | 'saida';
  amount: number;
  date: string;
  method: string;
  created_at: string;
}

export async function addCashTransaction(item: Omit<CashTransaction, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTIONS.CASH_TRANSACTIONS), item);
  return docRef.id;
}

export async function getCashTransactions() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CashTransaction));
}

export async function updateCashTransaction(id: string, data: Partial<CashTransaction>) {
  const docRef = doc(db, COLLECTIONS.CASH_TRANSACTIONS, id);
  await setDoc(docRef, data, { merge: true });
}

export async function clearCashTransactions() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
  return snapshot.size;
}
