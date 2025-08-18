import { User, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../services/firebaseConfig";

type Role = "volunteer" | "organizer" | "sponsor" | "wasteCollector" | "researcher";

export type Profile = {
  email: string;
  role: Role;
  isTeam?: boolean;
  createdAt?: any;
};

type AuthContextType = {
  user: User | null;
  profile: (Profile & { uid: string }) | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<(Profile & { uid: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth listener
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      } else {
        // subscribe to the Firestore user doc
        const ref = doc(db, "users", u.uid);
        const unsubDoc = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) {
              setProfile({ uid: u.uid, ...(snap.data() as Profile) });
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          () => setLoading(false)
        );
        return () => unsubDoc();
      }
    });
    return () => unsubAuth();
  }, []);

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
