import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VolNotification() {
  // Hardcoded notifications data with 12 entries including registered event reminders
  const notifications = [
    {
      id: "1",
      type: "post_like",
      message: "John Doe liked your post 'Beach Cleanup 2025'",
      time: "10:15 PM",
      date: "Oct 11, 2025",
      read: false,
    },
    {
      id: "2",
      type: "comment",
      message: "Jane Smith commented: Great effort! on your post 'Beach Cleanup 2025'",
      time: "09:45 PM",
      date: "Oct 11, 2025",
      read: false,
    },
    {
      id: "3",
      type: "event_reminder",
      message: "Reminder: Beach Cleanup Event starts in 2 hours",
      time: "11:00 PM",
      date: "Oct 11, 2025",
      read: true,
    },
    {
      id: "4",
      type: "post_like",
      message: "Mike Johnson liked your post 'Volunteer Day 2025'",
      time: "08:30 PM",
      date: "Oct 10, 2025",
      read: true,
    },
    {
      id: "5",
      type: "comment",
      message: "Sarah Lee commented: Looking forward to it! on your event 'Volunteer Day 2025'",
      time: "07:20 PM",
      date: "Oct 10, 2025",
      read: false,
    },
    {
      id: "6",
      type: "registered_event_reminder",
      message: "You are registered for Park Cleanup Event on Oct 13, 2025",
      time: "06:00 PM",
      date: "Oct 12, 2025",
      read: false,
    },
    {
      id: "7",
      type: "event_reminder",
      message: "Reminder: Park Cleanup Event is tomorrow at 9:00 AM",
      time: "05:30 PM",
      date: "Oct 12, 2025",
      read: false,
    },
    {
      id: "8",
      type: "post_like",
      message: "Emma Wilson liked your post 'Tree Planting 2025'",
      time: "04:15 PM",
      date: "Oct 12, 2025",
      read: true,
    },
    {
      id: "9",
      type: "comment",
      message: "David Brown commented: Awesome initiative! on your post 'Tree Planting 2025'",
      time: "03:45 PM",
      date: "Oct 12, 2025",
      read: false,
    },
    {
      id: "10",
      type: "registered_event_reminder",
      message: "You are registered for River Cleanup Event on Oct 15, 2025",
      time: "02:00 PM",
      date: "Oct 12, 2025",
      read: true,
    },
    {
      id: "11",
      type: "event_reminder",
      message: "Reminder: River Cleanup Event starts in 3 days",
      time: "01:30 PM",
      date: "Oct 12, 2025",
      read: false,
    },
    {
      id: "12",
      type: "comment",
      message: "Lisa Green commented: Can't wait! on your event 'River Cleanup Event'",
      time: "12:31 AM",
      date: "Oct 12, 2025",
      read: false,
    },
  ];

  const getIconName = (type: string) => {
    switch (type) {
      case "post_like":
        return "heart";
      case "comment":
        return "chatbubble";
      case "event_reminder":
        return "alarm";
      case "registered_event_reminder":
        return "calendar";
      default:
        return "notifications";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header (without brand color background) */}
      <View className="px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="text-xl font-bold text-slate-900">Notifications</Text>
          </View>
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <View
              key={notification.id}
              className={`bg-white rounded-xl p-4 mb-4 shadow-sm border ${
                !notification.read ? "border-teal-200" : "border-gray-200"
              }`}
            >
              <View className="flex-row items-start">
                <Ionicons
                  name={getIconName(notification.type)}
                  size={20}
                  color={!notification.read ? "#0F828C" : "#64748B"}
                  className="mr-3 mt-1"
                />
                <View className="flex-1">
                  <Text
                    className={`text-base ${
                      !notification.read ? "text-slate-900 font-medium" : "text-slate-600"
                    }`}
                  >
                    {notification.message}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-1">
                    {notification.date} • {notification.time}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className="flex-1 items-center justify-center mt-10">
            <Ionicons name="notifications-off-outline" size={40} color="#64748B" />
            <Text className="text-slate-600 text-center mt-4">
              No notifications yet. Check back later!
            </Text>
          </View>
        )}

        {/* View More Button */}
        {notifications.length > 0 && (
          <Pressable className="bg-teal-100 rounded-xl py-3 items-center mt-4">
            <Text className="text-teal-700 font-bold">View More</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}