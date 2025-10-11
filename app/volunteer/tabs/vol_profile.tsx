<<<<<<< HEAD
// app/volunteer/tabs/vol_profile.tsx
=======
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/services/firebaseConfig";
>>>>>>> fb8dbdb0f0172d80c5ca05e53333166fe94dd0ee
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
<<<<<<< HEAD
  getDoc,
  setDoc,
} from "firebase/firestore";
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
=======
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
>>>>>>> fb8dbdb0f0172d80c5ca05e53333166fe94dd0ee

// Types
type PostCategory = "event" | "blog" | "achievement" | "suggestion" | "question";
type PostStatus = "published" | "draft";
interface Post {
  id: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  title: string;
  content: string;
  category: PostCategory;
  imageUrl?: string;
  location?: string;
  likes: string[];
  comments: any[];
  createdAt: any;
  updatedAt: any;
  status: PostStatus;
}

interface RegisteredEvent {
  id: string;
  eventTitle: string;
  eventDate?: Timestamp;
  registeredAt?: Timestamp;
  status: "pending" | "confirmed" | "completed";
}

interface PrivateInfoStep1 {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  nic: string;
}

interface PrivateInfoStep2 {
  skills: string;
  availability: string;
  interests: string;
}

interface PrivateInfo extends PrivateInfoStep1, PrivateInfoStep2 {
  completedAt: Timestamp;
}

// Helpers
function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

function formatDate(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d?: Date | null) {
  if (!d) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function usePressScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return { scale, onPressIn, onPressOut };
}

function CategoryBadge({ category }: { category: PostCategory }) {
  const categoryConfig = {
    event: { color: "bg-blue-100", text: "text-blue-800", icon: "calendar", label: "Event" },
    blog: { color: "bg-green-100", text: "text-green-800", icon: "pencil", label: "Blog" },
    achievement: { color: "bg-yellow-100", text: "text-yellow-800", icon: "trophy", label: "Achievement" },
    suggestion: { color: "bg-purple-100", text: "text-purple-800", icon: "lightbulb", label: "Suggestion" },
    question: { color: "bg-red-100", text: "text-red-800", icon: "help-circle", label: "Question" },
  };
  const config = categoryConfig[category] || categoryConfig.blog;
  const colorMap: Record<string, string> = {
    "text-blue-800": "#1e40af",
    "text-green-800": "#166534",
    "text-yellow-800": "#854d0e",
    "text-purple-800": "#6b21a8",
    "text-red-800": "#991b1b",
  };
  return (
    <View className={`px-3 py-1 rounded-full ${config.color} flex-row items-center`}>
      <Ionicons name={config.icon as any} size={14} color={colorMap[config.text]} />
      <Text className={`${config.text} text-xs font-medium ml-1`}>{config.label}</Text>
    </View>
  );
}

// Badge Display Component
function BadgeDisplay({ badge }: { badge: "none" | "silver" | "gold" | "platinum" }) {
  const badgeConfig = {
    none: { label: "No Badge", color: "bg-gray-200", textColor: "text-gray-700", icon: "ribbon-outline" },
    silver: { label: "Silver Volunteer", color: "bg-gray-300", textColor: "text-gray-800", icon: "ribbon" },
    gold: { label: "Gold Volunteer", color: "bg-yellow-400", textColor: "text-yellow-900", icon: "ribbon" },
    platinum: { label: "Platinum Volunteer", color: "bg-blue-500", textColor: "text-white", icon: "ribbon" },
  };
  const config = badgeConfig[badge];
  return (
    <View className="items-center mb-4">
      <View className={`w-16 h-16 ${config.color} rounded-full items-center justify-center mb-2`}>
        <Ionicons name={config.icon as any} size={24} color={config.textColor.includes("white") ? "white" : "#4b5563"} />
      </View>
      <Text className={`font-bold ${config.textColor}`}>{config.label}</Text>
    </View>
  );
}

// QR Code Modal for Events
function QrCodeModal({ 
  visible, 
  onClose, 
  eventId, 
  regId, 
  eventTitle,
  userUid 
}: { 
  visible: boolean; 
  onClose: () => void; 
  eventId: string; 
  regId: string; 
  eventTitle: string;
  userUid: string;
}) {
  const qrRef = useRef<ViewShot>(null);

  const handleDownload = async () => {
    if (!qrRef.current) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to save to library.');
      return;
    }
    try {
      const uri = await captureRef(qrRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'QR code saved to your gallery.');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download QR code.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 w-11/12 max-w-sm shadow-xl">
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Your Registration</Text>
          <Text className="text-gray-600 mb-4 text-center">{eventTitle}</Text>
          <View className="items-center mb-6">
            <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
              <QRCode
                value={`vol-reg:${eventId}:${regId}:${userUid}`}
                size={200}
                backgroundColor="white"
                color="black"
              />
            </ViewShot>
          </View>
          <Pressable onPress={handleDownload} className="bg-blue-600 rounded-xl py-3 mb-3">
            <Text className="text-white font-bold text-center">Download QR Code</Text>
          </Pressable>
          <Pressable onPress={onClose} className="bg-gray-200 rounded-xl py-3">
            <Text className="text-gray-800 font-bold text-center">Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Private Info Form Modals
function PrivateInfoModal({ 
  visible, 
  onClose, 
  onComplete 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onComplete: () => void; 
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step1, setStep1] = useState<PrivateInfoStep1>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nic: "",
  });
  const [step2, setStep2] = useState<PrivateInfoStep2>({
    skills: "",
    availability: "",
    interests: "",
  });

  useEffect(() => {
    if (visible && user) {
      // Preload existing data
      const loadPrivateInfo = async () => {
        const docSnap = await getDoc(doc(db, "users", user.uid, "privateInfo", "info"));
        if (docSnap.exists()) {
          const data = docSnap.data() as PrivateInfo;
          setStep1({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            phoneNumber: data.phoneNumber || "",
            nic: data.nic || "",
          });
          setStep2({
            skills: data.skills || "",
            availability: data.availability || "",
            interests: data.interests || "",
          });
        }
      };
      loadPrivateInfo();
    }
  }, [visible, user]);

  const handleNext = () => {
    if (step === 1) {
      if (!step1.firstName || !step1.lastName || !step1.phoneNumber || !step1.nic) {
        Alert.alert("Missing Info", "Please fill all fields in Step 1.");
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!step2.skills || !step2.availability || !step2.interests) {
      Alert.alert("Missing Info", "Please fill all fields in Step 2.");
      return;
    }
    setLoading(true);
    try {
      const fullInfo: PrivateInfo = {
        ...step1,
        ...step2,
        completedAt: Timestamp.now(),
      };
      await setDoc(doc(db, "users", user.uid, "privateInfo", "info"), fullInfo);
      Alert.alert("Success", "Profile updated! You've earned the Silver Badge!");
      onComplete();
      onClose();
    } catch (e) {
      console.error("Save private info error:", e);
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={true} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        className="flex-1 bg-black/50 justify-end"
      >
        <View className="bg-white rounded-t-3xl max-h-[85%]">
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">Complete Your Profile</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
<<<<<<< HEAD
          <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
            {step === 1 ? (
              <>
                <Text className="text-lg font-semibold mb-4">Step 1: Personal Information</Text>
                {[
                  { label: "First Name", key: "firstName" },
                  { label: "Last Name", key: "lastName" },
                  { label: "Phone Number", key: "phoneNumber" },
                  { label: "NIC / ID Number", key: "nic" },
                ].map((field) => (
                  <View key={field.key} className="mb-4">
                    <Text className="text-slate-700 mb-2">{field.label} *</Text>
                    <TextInput
                      value={step1[field.key as keyof PrivateInfoStep1]}
                      onChangeText={(text) => setStep1(prev => ({ ...prev, [field.key]: text }))}
                      className="border border-gray-300 rounded-xl p-3"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
=======
          <Text className="text-xl font-bold text-slate-800">My Registered Events</Text>
        </View>
      </View>
      <View className="p-6">
        {registeredEvents.length === 0 ? (
          <View className="items-center py-4">
            <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
            <Text className="text-slate-500 mt-2 text-center">You havet registered for any events yet</Text>
          </View>
        ) : (
          registeredEvents.map((event) => {
            const eventDate = tsToDate(event.eventDate);
            return (
              <View key={event.id} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0">
                <Text className="font-semibold text-slate-800 mb-1">{event.eventTitle}</Text>
                {eventDate && (
                  <Text className="text-slate-600 text-sm mb-2">
                    {formatDate(eventDate)} • {formatTime(eventDate)}
                  </Text>
                )}
                <View className="flex-row items-center">
                  <View className={`px-3 py-1 rounded-full ${
                    event.status === "confirmed" ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                    <Text className={`text-xs font-medium ${
                      event.status === "confirmed" ? "text-green-800" : "text-yellow-800"
                    }`}>
                      {event.status === "confirmed" ? "Confirmed" : "Pending"}
                    </Text>
>>>>>>> fb8dbdb0f0172d80c5ca05e53333166fe94dd0ee
                  </View>
                ))}
                <Pressable onPress={handleNext} className="bg-blue-600 p-4 rounded-xl items-center">
                  <Text className="text-white font-bold">Next: Volunteer Info</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text className="text-lg font-semibold mb-4">Step 2: Volunteer Details</Text>
                {[
                  { label: "Skills & Experience", key: "skills", multiline: true },
                  { label: "Availability (e.g., weekends)", key: "availability", multiline: false },
                  { label: "Interests (e.g., beach cleanups)", key: "interests", multiline: false },
                ].map((field) => (
                  <View key={field.key} className="mb-4">
                    <Text className="text-slate-700 mb-2">{field.label} *</Text>
                    <TextInput
                      value={step2[field.key as keyof PrivateInfoStep2]}
                      onChangeText={(text) => setStep2(prev => ({ ...prev, [field.key]: text }))}
                      className="border border-gray-300 rounded-xl p-3"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      multiline={field.multiline}
                      numberOfLines={field.multiline ? 3 : 1}
                      textAlignVertical={field.multiline ? "top" : "center"}
                    />
                  </View>
                ))}
                <Pressable 
                  onPress={handleSubmit} 
                  disabled={loading}
                  className={`bg-green-600 p-4 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold">Complete Profile & Get Silver Badge</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Main Profile Screen
export default function VolProfile() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [qrModal, setQrModal] = useState<{ eventId: string; regId: string; eventTitle: string } | null>(null);
  const [showPrivateInfoModal, setShowPrivateInfoModal] = useState(false);
  const [badge, setBadge] = useState<"none" | "silver" | "gold" | "platinum">("none");
  const [privateInfoExists, setPrivateInfoExists] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const completeBtnAnim = usePressScale();

  // Animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Fetch user posts
  useEffect(() => {
    if (!user) {
      setUserPosts([]);
      setPostsLoading(false);
      return;
    }
    setPostsLoading(true);
    const q = query(
      collection(db, "posts"),
      where("authorId", "==", user.uid),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = [];
      snapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setUserPosts(postsData);
      setPostsLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      Alert.alert("Error", `Failed to load posts: ${error.message || "Unknown error"}`);
      setUserPosts([]);
      setPostsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch registered events and private info
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setEventsLoading(true);
      try {
        // Registered events
        const registrationsRef = collection(db, `users/${user.uid}/registrations`);
        const snapshot = await getDocs(registrationsRef);
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegisteredEvent));
        setRegisteredEvents(events);

        // Private info
        const privateDoc = await getDoc(doc(db, "users", user.uid, "privateInfo", "info"));
        setPrivateInfoExists(privateDoc.exists());

        // Badge logic
        let newBadge: "none" | "silver" | "gold" | "platinum" = "none";
        if (privateDoc.exists()) {
          newBadge = "silver";
          const completedCount = events.filter(e => e.status === "completed").length;
          if (completedCount >= 10) newBadge = "platinum";
          else if (completedCount >= 5) newBadge = "gold";
        }
        setBadge(newBadge);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(public)/auth/login");
    } catch (error: any) {
      Alert.alert("Error", `Failed to sign out: ${error.message || "Unknown error"}`);
    }
  };

  const handleEditPost = (postId: string) => {
    const post = userPosts.find((p) => p.id === postId);
    if (post) {
      setEditingPost(post);
      setShowCreateModal(true);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete a post");
      return;
    }
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "posts", postId));
              Alert.alert("Success", "Post deleted successfully");
            } catch (error: any) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", `Failed to delete post: ${error.message || "Unknown error"}`);
            }
          },
        },
      ]
    );
  };

  const handleViewQr = (event: RegisteredEvent) => {
    if (!user) return;
    setQrModal({
      eventId: event.id,
      regId: event.id, // assuming regId == eventId in user's registration doc
      eventTitle: event.eventTitle || "Event",
    });
  };

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
  };

  // Add this inside vol_profile.tsx, before export default VolProfile
function CreatePostModal({
  visible,
  onClose,
  editingPost,
  onPostCreated,
}: {
  visible: boolean;
  onClose: () => void;
  editingPost?: Post | null;
  onPostCreated: () => void;
}) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState(editingPost?.title || "");
  const [content, setContent] = useState(editingPost?.content || "");
  const [category, setCategory] = useState<PostCategory>(editingPost?.category || "blog");
  const [location, setLocation] = useState(editingPost?.location || "");
  const [posting, setPosting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("blog");
    setLocation("");
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post");
      return;
    }
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setPosting(true);
    try {
      const postData = {
        title: title.trim(),
        content: content.trim(),
        category,
        location: category === "event" ? location.trim() : "",
        authorId: user.uid,
        authorEmail: user.email || "",
        authorName: profile?.email?.split("@")[0] || "Volunteer",
        likes: editingPost?.likes || [],
        comments: editingPost?.comments || [],
        status: "published" as PostStatus,
        updatedAt: serverTimestamp(),
        ...(editingPost ? {} : { createdAt: serverTimestamp() }),
      };

      if (editingPost) {
        await updateDoc(doc(db, "posts", editingPost.id), postData);
        Alert.alert("Success", "Post updated successfully");
      } else {
        await addDoc(collection(db, "posts"), postData);
        Alert.alert("Success", "Post published successfully");
        resetForm();
      }
      onPostCreated();
      onClose();
    } catch (error: any) {
      console.error("Error saving post:", error);
      Alert.alert("Error", `Failed to save post: ${error.message || "Unknown error"}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/50 justify-end"
      >
        <View className="bg-white rounded-t-3xl max-h-[85%]">
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">
              {editingPost ? "Edit Post" : "Create Post"}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
            <Text className="text-slate-700 font-medium mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {(["event", "blog", "achievement", "suggestion", "question"] as PostCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full mr-2 ${category === cat ? "bg-blue-600" : "bg-gray-100"}`}
                >
                  <Text className={category === cat ? "text-white" : "text-slate-700"}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text className="text-slate-700 font-medium mb-2">Title*</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a catchy title..."
              className="border border-gray-300 rounded-xl p-3 mb-4"
            />

            <Text className="text-slate-700 font-medium mb-2">Content*</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Share your thoughts or event details..."
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-xl p-3 mb-4 h-32"
              textAlignVertical="top"
            />

            {category === "event" && (
              <>
                <Text className="text-slate-700 font-medium mb-2">Location</Text>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Where will this event happen?"
                  className="border border-gray-300 rounded-xl p-3 mb-4"
                />
              </>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={posting}
              className={`bg-blue-600 p-4 rounded-xl items-center mb-8 ${posting ? "opacity-50" : ""}`}
            >
              {posting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  {editingPost ? "Update Post" : "Publish Post"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

  return (
    <View className="flex-1 bg-slate-50">
      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }],
        }}
        className="bg-gradient-to-r from-blue-600 to-slate-700"
      >
        <View className="px-6 pt-5 pb-1" />
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-slate-100 border-2 border-blue-200 shadow-md items-center justify-center mb-4">
              <Ionicons name="person" size={40} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-1">
              {user?.email?.split("@")[0] || "Volunteer"}
            </Text>
            <Text className="text-slate-600 text-center">{user?.email}</Text>
            <BadgeDisplay badge={badge} />
          </View>
        </View>

        {/* Complete Profile CTA */}
        {!privateInfoExists && (
          <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
            <View className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6">
              <View className="flex-row items-start">
                <View className="w-12 h-12 bg-yellow-100 rounded-full items-center justify-center mr-4 mt-1">
                  <Ionicons name="medal" size={24} color="#f59e0b" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-semibold mb-2">Complete Your Profile</Text>
                  <Text className="text-slate-600 leading-5 mb-3">
                    Fill in your personal and volunteer details to earn the Silver Badge!
                  </Text>
                  <Animated.View style={{ transform: [{ scale: completeBtnAnim.scale }] }}>
                    <TouchableOpacity
                      onPress={() => setShowPrivateInfoModal(true)}
                      onPressIn={completeBtnAnim.onPressIn}
                      onPressOut={completeBtnAnim.onPressOut}
                      className="bg-blue-600 rounded-xl py-3 items-center shadow-md"
                    >
                      <Text className="text-white font-bold">Complete Profile</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* My Registered Events Button */}
        <Pressable
          onPress={() => setShowEvents(!showEvents)}
          className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-4"
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-slate-800">My Registered Events</Text>
            <Ionicons name={showEvents ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
          </View>
        </Pressable>

        {/* Registered Events List */}
        {showEvents && (
          <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
            {eventsLoading ? (
              <ActivityIndicator color="#3b82f6" />
            ) : registeredEvents.length === 0 ? (
              <Text className="text-slate-500 text-center py-4">No registered events</Text>
            ) : (
              registeredEvents.map((event) => {
                const eventDate = tsToDate(event.eventDate);
                return (
                  <View key={event.id} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0">
                    <Text className="font-semibold text-slate-800">{event.eventTitle}</Text>
                    <Text className="text-slate-600 text-sm">
                      {formatDate(eventDate)} {eventDate && formatTime(eventDate) && `• ${formatTime(eventDate)}`}
                    </Text>
                    <View className="mt-2">
                      <View className={`px-3 py-1 rounded-full inline-block ${
                        event.status === "completed" ? "bg-green-100" : 
                        event.status === "confirmed" ? "bg-blue-100" : "bg-yellow-100"
                      }`}>
                        <Text className={`text-xs font-medium ${
                          event.status === "completed" ? "text-green-800" : 
                          event.status === "confirmed" ? "text-blue-800" : "text-yellow-800"
                        }`}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleViewQr(event)}
                      className="mt-2 bg-gray-100 rounded-lg py-2 px-3 w-32"
                    >
                      <Text className="text-center text-blue-700 font-medium">View QR Code</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* My Posts Button */}
        <Pressable
          onPress={() => setShowPosts(!showPosts)}
          className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-4"
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-slate-800">My Posts</Text>
            <Ionicons name={showPosts ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
          </View>
        </Pressable>

        {/* My Posts List */}
        {showPosts && (
          <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
            {postsLoading ? (
              <ActivityIndicator color="#3b82f6" />
            ) : userPosts.length === 0 ? (
<<<<<<< HEAD
              <Text className="text-slate-500 text-center py-4">You haven't created any posts yet</Text>
=======
              <View className="items-center py-4">
                <Ionicons name="document-text-outline" size={32} color="#cbd5e1" />
                <Text className="text-slate-500 mt-2">You havent created any posts yet</Text>
              </View>
>>>>>>> fb8dbdb0f0172d80c5ca05e53333166fe94dd0ee
            ) : (
              userPosts.map((post) => (
                <View key={post.id} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0">
                  <Text className="font-semibold text-slate-800 mb-1">{post.title}</Text>
                  <Text className="text-slate-600 text-sm mb-2" numberOfLines={2}>{post.content}</Text>
                  <View className="flex-row justify-between items-center">
                    <CategoryBadge category={post.category} />
                    <Text className="text-slate-500 text-xs">
                      {post.createdAt?.toDate().toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row mt-2">
                    <Pressable onPress={() => handleEditPost(post.id)} className="p-1">
                      <Ionicons name="create-outline" size={18} color="#64748b" />
                    </Pressable>
                    <Pressable onPress={() => handleDeletePost(post.id)} className="p-1 ml-1">
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Account Settings */}
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <Pressable
            onPress={toggleAccountMenu}
            className="p-6 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="settings-outline" size={20} color="#64748b" />
              </View>
              <Text className="text-xl font-bold text-slate-800">Account Settings</Text>
            </View>
            <Ionicons name={showAccountMenu ? "chevron-up" : "chevron-down"} size={24} color="#64748b" />
          </Pressable>
          {showAccountMenu && (
            <View className="px-6 pb-6 pt-4 border-t border-slate-100">
              <TouchableOpacity
                onPress={handleLogout}
                className="bg-red-500 rounded-xl py-4 items-center shadow-md"
              >
                <View className="flex-row items-center">
                  <Ionicons name="log-out-outline" size={20} color="white" />
                  <Text className="text-white font-bold ml-2">Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPost(null);
        }}
        editingPost={editingPost}
        onPostCreated={() => {
          setShowCreateModal(false);
          setEditingPost(null);
        }}
      />

      {qrModal && (
        <QrCodeModal
          visible={true}
          onClose={() => setQrModal(null)}
          eventId={qrModal.eventId}
          regId={qrModal.regId}
          eventTitle={qrModal.eventTitle}
          userUid={user?.uid || ""}
        />
      )}

      <PrivateInfoModal
        visible={showPrivateInfoModal}
        onClose={() => setShowPrivateInfoModal(false)}
        onComplete={() => setPrivateInfoExists(true)}
      />
    </View>
  );
}

// Reuse CreatePostModal from original code (already defined above in your file)
// Ensure it's available in scope or import it if separated