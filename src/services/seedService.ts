import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './firestoreCollections';

export async function seedFirestoreBaseData() {
  const now = new Date().toISOString();

  await Promise.all([
    addDoc(collection(db, COLLECTIONS.USERS), {
      name: 'Administrador',
      email: 'admin@terreiro.com',
      role: 'MASTER',
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.STOCK_ITEMS), {
      name: 'Vela Branca Pequena',
      category: 'Velas',
      quantity: 24,
      unit: 'un',
      supplier: 'Casa das Velas',
      color: 'Branca',
      price: 2.5,
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.STOCK_ITEMS), {
      name: 'Defumador de Arruda',
      category: 'Defumadores',
      quantity: 6,
      unit: 'pct',
      supplier: 'Ervas do Norte',
      color: 'Verde',
      price: 18,
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.EVENTS), {
      title: 'Gira de Gratidão',
      date: '15/02/2026',
      time: '19:00',
      leader: 'Mãe Joana',
      status: 'confirmado',
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.EVENTS), {
      title: 'Estudo de Cantigas',
      date: '17/02/2026',
      time: '20:00',
      leader: 'Pai Marcelo',
      status: 'pendente',
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.CASH_TRANSACTIONS), {
      label: 'Ofertas do culto',
      type: 'entrada',
      amount: 420,
      date: '09/02/2026',
      method: 'Dinheiro',
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.CASH_TRANSACTIONS), {
      label: 'Compra de velas',
      type: 'saida',
      amount: 180,
      date: '08/02/2026',
      method: 'Pix',
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.MEMBERSHIPS), {
      name: 'Ana Souza',
      value: 70,
      status: 'pago',
      lastPayment: '08/02/2026',
      created_at: now,
    }),
    addDoc(collection(db, COLLECTIONS.MEMBERSHIPS), {
      name: 'Bruno Lima',
      value: 70,
      status: 'pendente',
      lastPayment: '01/02/2026',
      created_at: now,
    }),
  ]);
}
