import { db } from './firebase';
import { collection, addDoc, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

export interface CashTransaction {
  id?: string;
  label: string;
  type: 'entrada' | 'saida';
  amount: number;
  date: string;
  method: string;
  created_at: string;
}

export async function addCashTransaction(item: Omit<CashTransaction, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.CASH_TRANSACTIONS), item);
  if (userEmail) await logService.addLog(userEmail, `Criou transação: ${item.label} (${item.type})`);
  return docRef.id;
}

export async function getCashTransactions() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
  return querySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CashTransaction));
}

export async function updateCashTransaction(id: string, data: Partial<CashTransaction>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.CASH_TRANSACTIONS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Alterou transação ${id}: ${changes}`);
  }
}

export async function clearCashTransactions(userEmail?: string) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.CASH_TRANSACTIONS));
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
  if (userEmail) await logService.addLog(userEmail, `Limpou todas as transações do caixa`);
  return snapshot.size;
}
