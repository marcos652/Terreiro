import {
  collection,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./userService";
import type { Event } from "./eventService";
import type { Transaction } from "./transactionService";
import type { Membership } from "./membershipService";
import type { StockEntry } from "./stockService";
import type { Cantiga } from "./cantigasService";
import { FieldValue } from "firebase/firestore";

// THIS IS THE HELPER FUNCTION
const createCollection = <T = DocumentData>(collectionName: string) => {
  return collection(db, collectionName) as CollectionReference<T>;
};

// Definição dos nomes das coleções do Firestore
export const COLLECTIONS = {
  USERS: 'users',
  STOCK_ITEMS: 'stock_items',
  EVENTS: 'events',
  CASH_TRANSACTIONS: 'cash_transactions',
  MEMBERSHIPS: 'memberships',
  FOCUS_NOTES: 'focus_notes',
  CANTIGAS: 'cantigas',
  ACTION_ITEMS: 'action_items',
};

export const usersCollection = createCollection<User>("users");
export const stockCollection = createCollection<StockEntry>("stock");
export const cantigasCollection = createCollection<Cantiga>("cantigas");

export type LogEntry = {
  id?: string;
  timestamp: FieldValue;
  userEmail: string;
  action: string;
};

export const logsCollection = createCollection<LogEntry>("logs");
