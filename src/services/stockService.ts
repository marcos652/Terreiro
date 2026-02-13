import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';

export interface StockItem {
  id?: string;
  category: string; // Ex: 'Velas'
  name: string;
  color?: string;
  quantity: number;
  unit: string; // unidade, caixa, pacote
  price?: number;
  supplier?: string;
  created_at: string;
}

export async function addStockItem(item: Omit<StockItem, 'id'>) {
  const docRef = await addDoc(collection(db, COLLECTIONS.STOCK_ITEMS), item);
  return docRef.id;
}

export async function getStockItems() {
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.STOCK_ITEMS));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem));
}

export async function getStockItemById(id: string) {
  const docRef = doc(db, COLLECTIONS.STOCK_ITEMS, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as StockItem;
  }
  return null;
}

export async function updateStockItem(id: string, data: Partial<StockItem>) {
  const docRef = doc(db, COLLECTIONS.STOCK_ITEMS, id);
  await setDoc(docRef, data, { merge: true });
}

export async function deleteStockItem(id: string) {
  const docRef = doc(db, COLLECTIONS.STOCK_ITEMS, id);
  await deleteDoc(docRef);
}

export async function clearStockItems() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.STOCK_ITEMS));
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
  return snapshot.size;
}
