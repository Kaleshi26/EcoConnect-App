import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/firebaseConfig';
import * as NotificationService from '../services/notificationService';

type NotificationContextType = {
  notificationsEnabled: boolean;
  remindersEnabled: boolean;
  scheduledCount: number;
  setNotificationsEnabled: (value: boolean) => void;
  setRemindersEnabled: (value: boolean) => void;
  refreshScheduledCount: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type EventDoc = {
  id: string;
  title: string;
  eventAt?: Timestamp;
  location?: { label?: string; lat?: number; lng?: number };
  status?: "Pending" | "In-progress" | "Completed";
  assignedTo?: string;
};

function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

export function NotificationProvider({ 
  children, 
  userId 
}: { 
  children: React.ReactNode;
  userId: string;
}) {
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [remindersEnabled, setRemindersEnabledState] = useState(true);
  const [scheduledCount, setScheduledCount] = useState(0);

  // Wrapper to handle notification enable/disable
  const setNotificationsEnabled = async (value: boolean) => {
    setNotificationsEnabledState(value);
    if (!value) {
      await NotificationService.cancelAllScheduledNotifications();
      setScheduledCount(0);
    }
  };

  const setRemindersEnabled = (value: boolean) => {
    setRemindersEnabledState(value);
  };

  const refreshScheduledCount = async () => {
    const scheduled = await NotificationService.getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  // Listen to events and schedule notifications
  useEffect(() => {
    if (!notificationsEnabled || !remindersEnabled || !userId) return;

    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const events: EventDoc[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((ev) => ev.assignedTo === userId);

      // Cancel existing scheduled notifications
      await NotificationService.cancelAllScheduledNotifications();

      // Schedule new notifications for upcoming assignments
      for (const event of events) {
        if (event.status !== "Completed" && event.eventAt) {
          const eventDate = tsToDate(event.eventAt);
          if (eventDate && eventDate > new Date()) {
            // Schedule 24-hour reminder
            await NotificationService.scheduleAssignmentReminder(
              event.id,
              event.title,
              event.location?.label || 'Unknown location',
              eventDate
            );
            
            // Schedule 1-hour reminder
            await NotificationService.scheduleAssignmentStartingSoon(
              event.id,
              event.title,
              event.location?.label || 'Unknown location',
              eventDate
            );
          }
        }
      }

      // Update scheduled count
      await refreshScheduledCount();
    });

    return () => unsub();
  }, [userId, notificationsEnabled, remindersEnabled]);

  // Update scheduled count when settings change
  useEffect(() => {
    refreshScheduledCount();
  }, [notificationsEnabled, remindersEnabled]);

  return (
    <NotificationContext.Provider
      value={{
        notificationsEnabled,
        remindersEnabled,
        scheduledCount,
        setNotificationsEnabled,
        setRemindersEnabled,
        refreshScheduledCount,
      }}
    >
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

