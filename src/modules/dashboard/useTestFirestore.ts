import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@services/firebase';

export function useTestFirestore() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all documents from "users".
        if (!db) {
          setError('Configuracao do Firebase nao encontrada.');
          return;
        }
        const querySnapshot = await getDocs(collection(db, 'users'));
        const docs = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setData(docs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { data, loading, error };
}
