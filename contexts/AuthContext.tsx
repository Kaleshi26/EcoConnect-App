// contexts/AuthContext.tsx
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db } from "../services/firebaseConfig";

// Define the shape of your profile data from Firestore
export type Profile = {
  email: string;
  role: "volunteer" | "organizer" | "sponsor" | "wasteCollector" | "researcher";
  isTeam?: boolean;
  createdAt?: any;
  orgName?: string;
  displayName?: string;
};

// Define the context's value shape, including the new logout function
type AuthContextType = {
  user: User | null;
  profile: (Profile & { uid: string }) | null;
  loading: boolean;
  logout: () => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

// The AuthProvider component that will wrap your app
export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<(Profile & { uid: string }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Centralized logout function using useCallback for performance
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // Explicitly set user and profile to null for an immediate UI update
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  // Effect to manage authentication state and real-time profile updates
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    // Listen for changes in Firebase authentication state
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      // Clean up any old profile listener before setting up a new one
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      
      setUser(currentUser);

      if (currentUser) {
        // If a user is logged in, listen for real-time updates to their profile
        const profileRef = doc(db, "users", currentUser.uid);
        unsubscribeProfile = onSnapshot(
          profileRef,
          (snap) => {
            if (snap.exists()) {
              setProfile({ uid: currentUser.uid, ...(snap.data() as Profile) });
            } else {
              setProfile(null); // User exists, but no profile doc in Firestore
            }
            setLoading(false);
          },
          (error) => {
            console.error("Profile snapshot error:", error);
            setLoading(false);
          }
        );
      } else {
        // If no user is logged in, clear profile and finish loading
        setProfile(null);
        setLoading(false);
      }
    });

    // Cleanup function to run when the component unmounts
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []); // Empty dependency array ensures this runs only once when the app starts

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ user, profile, loading, logout }),
    [user, profile, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily access the auth context in any component
export const useAuth = () => useContext(AuthContext);