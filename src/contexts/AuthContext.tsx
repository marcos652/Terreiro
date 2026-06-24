import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@services/firebase';
import { User as AppUser } from '@services/userService';
import { isBootstrapMasterUid } from '@services/constants';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@services/firestoreCollections';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  profile: AppUser | null;
}

const AuthContext = createContext<AuthContextProps>({ user: null, loading: true, profile: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubProfile: (() => void) | null = null;
    let presenceInterval: ReturnType<typeof setInterval> | null = null;

    const updatePresence = (uid: string, online: boolean, profileData?: { name?: string; photoURL?: string }) => {
      try {
        if (!db) return;
        const ref = doc(db, COLLECTIONS.USER_PRESENCE, uid);
        setDoc(ref, { 
          online, 
          last_seen: serverTimestamp(),
          ...(profileData?.name ? { name: profileData.name } : {}),
          ...(profileData?.photoURL ? { photoURL: profileData.photoURL } : {})
        }, { merge: true }).catch(() => {});
      } catch {}
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Limpa listener anterior
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (presenceInterval) { clearInterval(presenceInterval); presenceInterval = null; }

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Marcar online (inicialmente sem perfil)
      updatePresence(firebaseUser.uid, true, { name: firebaseUser.displayName || '', photoURL: firebaseUser.photoURL || '' });
      
      // Atualizar last_seen a cada 60s
      let lastProfileData: any = null;
      presenceInterval = setInterval(() => updatePresence(firebaseUser.uid, true, lastProfileData), 60_000);

      // Marcar offline ao sair da página
      const handleBeforeUnload = () => updatePresence(firebaseUser.uid, false);
      window.addEventListener('beforeunload', handleBeforeUnload);

      // Listener em tempo real no documento do usuário
      const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
      unsubProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          const normalizedRole = (data.role || '').trim().toUpperCase() as AppUser['role'];
          const profileData = {
            id: docSnap.id,
            name: data.name || '',
            email: data.email || '',
            role: normalizedRole,
            status: data.status || 'PENDENTE',
            permissions: data.permissions,
            photoURL: data.photoURL,
            created_at: data.created_at || '',
          };
          setProfile(profileData);
          lastProfileData = { name: profileData.name, photoURL: profileData.photoURL };
          updatePresence(firebaseUser.uid, true, lastProfileData);
        } else if (isBootstrapMasterUid(firebaseUser.uid)) {
          const profileData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Bootstrap Master',
            email: firebaseUser.email || 'bootstrap@local',
            role: 'MASTER' as const,
            status: 'APROVADO' as const,
            created_at: new Date().toISOString(),
          };
          setProfile(profileData);
          lastProfileData = { name: profileData.name };
          updatePresence(firebaseUser.uid, true, lastProfileData);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
      if (presenceInterval) clearInterval(presenceInterval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
