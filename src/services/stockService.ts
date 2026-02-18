import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { COLLECTIONS } from './firestoreCollections';
import { logService } from './logService';

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

export async function addStockItem(item: Omit<StockItem, 'id'>, userEmail?: string) {
  const docRef = await addDoc(collection(db, COLLECTIONS.STOCK_ITEMS), item);
  if (userEmail) await logService.addLog(userEmail, `Criou item de estoque: ${item.name}`);
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

export async function updateStockItem(id: string, data: Partial<StockItem>, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.STOCK_ITEMS, id);
  await setDoc(docRef, data, { merge: true });
  if (userEmail) {
    const changes = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
    await logService.addLog(userEmail, `Alterou item de estoque ${id}: ${changes}`);
  }
}

export async function deleteStockItem(id: string, userEmail?: string) {
  const docRef = doc(db, COLLECTIONS.STOCK_ITEMS, id);
  await deleteDoc(docRef);
  if (userEmail) await logService.addLog(userEmail, `Excluiu item de estoque: ${id}`);
}

export async function clearStockItems(userEmail?: string) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.STOCK_ITEMS));
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
  if (userEmail) await logService.addLog(userEmail, `Limpou todos os itens de estoque`);
  return snapshot.size;
}
