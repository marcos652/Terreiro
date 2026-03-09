import {
  collection,
  type CollectionReference,
  type DocumentData,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from './userService';
import type { EventItem } from './eventService';
import type { CashTransaction } from './transactionService';
import type { MembershipItem } from './membershipService';
import type { StockItem } from './stockService';
import type { CantigaItem } from './cantigasService';

// Helper to create typed collections
const createCollection = <T = DocumentData>(collectionName: string) =>
  collection(db, collectionName) as CollectionReference<T>;

// Nomes centralizados das coleções do Firestore
export const COLLECTIONS = {
  USERS: 'users',
  STOCK_ITEMS: 'stock_items',
  EVENTS: 'events',
  CASH_TRANSACTIONS: 'cash_transactions',
  MEMBERSHIPS: 'memberships',
  FOCUS_NOTES: 'focus_notes',
  CANTIGAS: 'cantigas',
  FUNDAMENTALS: 'fundamentals',
  ACTION_ITEMS: 'action_items',
  LOGS: 'logs',
} as const;

// Coleções tipadas
export const usersCollection = createCollection<User>(COLLECTIONS.USERS);
export const stockCollection = createCollection<StockItem>(COLLECTIONS.STOCK_ITEMS);
export const eventsCollection = createCollection<EventItem>(COLLECTIONS.EVENTS);
export const transactionsCollection = createCollection<CashTransaction>(COLLECTIONS.CASH_TRANSACTIONS);
export const membershipsCollection = createCollection<MembershipItem>(COLLECTIONS.MEMBERSHIPS);
export const cantigasCollection = createCollection<CantigaItem>(COLLECTIONS.CANTIGAS);
// Fundamentals reutiliza estrutura de pastas/textos semelhante a cantigas
export const fundamentalsCollection = createCollection(COLLECTIONS.FUNDAMENTALS);

export type LogEntry = {
  id?: string;
  timestamp: FieldValue | Timestamp;
  userEmail: string;
  action: string;
};

export const logsCollection = createCollection<LogEntry>(COLLECTIONS.LOGS);
