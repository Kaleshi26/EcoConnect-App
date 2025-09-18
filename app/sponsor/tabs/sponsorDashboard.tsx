import { db } from "@/services/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";

const SponsorDashboard = () => {
  const [sponsorEvents, setSponsorEvents] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "events"),
      where("sponsorshipRequired", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events: any[] = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      setSponsorEvents(events);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Sponsor Dashboard</Text>

      {sponsorEvents.length === 0 ? (
        <Text className="text-gray-500 text-base">
          No sponsorship events available.
        </Text>
      ) : (
        <FlatList
          data={sponsorEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="bg-gray-100 p-4 mb-3 rounded-2xl shadow">
              <Text className="text-lg font-semibold mb-1">{item.title}</Text>
              <Text className="text-base text-gray-700 mb-1">
                {item.description}
              </Text>
              <Text className="text-sm text-gray-600">
                Date: {item.eventAt?.toDate?.().toDateString()}
              </Text>
              <Text className="text-sm text-gray-600">
                Location: {item.location?.label}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default SponsorDashboard;
