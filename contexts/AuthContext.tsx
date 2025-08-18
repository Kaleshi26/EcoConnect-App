import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../services/firebaseConfig";

type UserRole = "volunteer" | "organizer" | "sponsor" | "wasteCollector" | "researcher";

type UserProfile = {
  email: string;
  role: UserRole;
  isTeam?: boolean;
  createdAt?: any;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setProfile((snap.exists() ? (snap.data() as UserProfile) : null));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => sub();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(() => ({ user, profile, loading, logout }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
