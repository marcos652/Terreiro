import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@services/firebase';
import { getUserById, User as AppUser } from '@services/userService';

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
    const BOOTSTRAP_UID = 'rpdLNx3X4CZhFvB6O9bvXbFA72y1';

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const data = await getUserById(user.uid);
        // normaliza role para evitar case mismatch e cria fallback para bootstrap master
        if (data) {
          const normalized: AppUser = { ...data, role: (data.role || '').toUpperCase() as AppUser['role'] };
          setProfile(normalized);
        } else if (user.uid === BOOTSTRAP_UID) {
          // garante que o master de bootstrap tenha perfil mesmo sem documento
          const synthetic: AppUser = {
            id: user.uid,
            name: user.displayName || 'Bootstrap Master',
            email: user.email || 'bootstrap@local',
            role: 'MASTER',
            status: 'APROVADO',
            created_at: new Date().toISOString(),
            permissions: undefined,
          };
          setProfile(synthetic);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
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
