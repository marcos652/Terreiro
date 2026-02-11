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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const data = await getUserById(user.uid);
        setProfile(data);
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
