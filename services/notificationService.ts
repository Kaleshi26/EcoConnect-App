import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebaseConfig';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request notification permissions
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });

    // Create specific channels for different notification types
    await Notifications.setNotificationChannelAsync('assignments', {
      name: 'Assignments',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
      description: 'Notifications for new and updated assignments',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#d97706',
      description: 'Reminders for upcoming assignments',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Save push token to user profile
export async function savePushToken(userId: string, token: string) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      pushToken: token,
      notificationsEnabled: true,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

// Schedule a local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: any = {},
  trigger?: Notifications.NotificationTriggerInput
) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: trigger || null, // null means immediate
    });
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Send notification for new assignment
export async function sendNewAssignmentNotification(assignmentTitle: string, location: string) {
  return await scheduleLocalNotification(
    '🎯 New Assignment',
    `You have a new waste collection task at ${location}: ${assignmentTitle}`,
    {
      type: 'new_assignment',
      screen: 'wc_assignment',
      tab: 'available',
    }
  );
}

// Send notification for assignment reminder (24 hours before)
export async function scheduleAssignmentReminder(
  assignmentId: string,
  assignmentTitle: string,
  location: string,
  eventDate: Date
) {
  const now = new Date();
  const reminderTime = new Date(eventDate);
  reminderTime.setHours(reminderTime.getHours() - 24); // 24 hours before

  if (reminderTime > now) {
    const trigger = {
      date: reminderTime,
      channelId: 'reminders',
    };

    return await scheduleLocalNotification(
      '⏰ Assignment Reminder',
      `Don't forget: "${assignmentTitle}" at ${location} is tomorrow!`,
      {
        type: 'reminder',
        assignmentId,
        screen: 'wc_assignment',
        tab: 'upcoming',
      },
      trigger
    );
  }
  return null;
}

// Send notification for assignment starting soon (1 hour before)
export async function scheduleAssignmentStartingSoon(
  assignmentId: string,
  assignmentTitle: string,
  location: string,
  eventDate: Date
) {
  const now = new Date();
  const reminderTime = new Date(eventDate);
  reminderTime.setHours(reminderTime.getHours() - 1); // 1 hour before

  if (reminderTime > now) {
    const trigger = {
      date: reminderTime,
      channelId: 'assignments',
    };

    return await scheduleLocalNotification(
      '🚨 Assignment Starting Soon',
      `"${assignmentTitle}" at ${location} starts in 1 hour!`,
      {
        type: 'starting_soon',
        assignmentId,
        screen: 'wc_assignment',
        tab: 'available',
      },
      trigger
    );
  }
  return null;
}

// Send notification for assignment completion
export async function sendAssignmentCompletedNotification(assignmentTitle: string, weight: number) {
  return await scheduleLocalNotification(
    '✅ Assignment Completed',
    `Great job! You collected ${weight}kg from "${assignmentTitle}"`,
    {
      type: 'completed',
      screen: 'wc_analytics',
    }
  );
}

// Send notification for achievement unlocked
export async function sendAchievementUnlockedNotification(achievementTitle: string, achievementDesc: string) {
  return await scheduleLocalNotification(
    '🏆 Achievement Unlocked!',
    `${achievementTitle}: ${achievementDesc}`,
    {
      type: 'achievement',
      screen: 'wc_analytics',
      tab: 'achievements',
    }
  );
}

// Cancel a scheduled notification
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

// Cancel all notifications for a specific assignment
export async function cancelAssignmentNotifications(assignmentId: string) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const assignmentNotifs = scheduled.filter(
      (notif) => notif.content.data?.assignmentId === assignmentId
    );
    
    for (const notif of assignmentNotifs) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  } catch (error) {
    console.error('Error cancelling assignment notifications:', error);
  }
}

// Get all scheduled notifications
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

// Clear all notifications
export async function clearAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

// Cancel all scheduled notifications (alias for clearAllNotifications)
export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling scheduled notifications:', error);
  }
}

// Badge count management
export async function setBadgeCount(count: number) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

export async function clearBadge() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
}

