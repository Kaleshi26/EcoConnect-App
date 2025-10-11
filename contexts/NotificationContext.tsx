import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../services/firebaseConfig';
import { useAuth } from './AuthContext';

export interface NotificationSettings {
  // Email Notifications
  emailSponsorshipUpdates: boolean;
  emailEventInvites: boolean;
  emailImpactReports: boolean;
  emailPaymentReminders: boolean;
  emailNewsletter: boolean;
  
  // Push Notifications
  pushSponsorshipStatus: boolean;
  pushNewEvents: boolean;
  pushEventReminders: boolean;
  pushPaymentReminders: boolean;
  
  // Frequency
  notificationFrequency: 'instant' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: NotificationSettings = {
  // Email - all enabled by default
  emailSponsorshipUpdates: true,
  emailEventInvites: true,
  emailImpactReports: true,
  emailPaymentReminders: true,
  emailNewsletter: true,
  
  // Push - important ones enabled
  pushSponsorshipStatus: true,
  pushNewEvents: true,
  pushEventReminders: false,
  pushPaymentReminders: false,
  
  // Frequency
  notificationFrequency: 'instant',
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load settings from Firebase
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().notificationSettings) {
          setSettings({
            ...defaultSettings,
            ...userDoc.data().notificationSettings
          });
        } else {
          // Initialize with default settings
          await setDoc(userDocRef, { 
            notificationSettings: defaultSettings 
          }, { merge: true });
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error("Error loading notification settings:", error);
        Alert.alert("Error", "Failed to load notification settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      // Save to Firebase
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        notificationSettings: updatedSettings,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save notification settings");
      // Revert on error
      setSettings(settings);
    }
  };

  return (
    <NotificationContext.Provider value={{
      settings,
      updateSettings,
      loading
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}