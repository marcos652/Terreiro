import { useEffect, useState } from 'react';
import { db } from '@services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export function useTestFirestore() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Busca todos os documentos da coleção "users"
        const querySnapshot = await getDocs(collection(db, 'users'));
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
