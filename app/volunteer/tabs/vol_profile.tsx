import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
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
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

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

interface Badge {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  earned: boolean;
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

// QR Code Modal for Events
function QrCodeModal({
  visible,
  onClose,
  eventId,
  regId,
  eventTitle,
  userUid,
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
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant permission to save to library.");
      return;
    }
    try {
      const uri = await captureRef(qrRef, { format: "png", quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Success", "QR code saved to your gallery.");
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download QR code.");
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 justify-center items-center bg-black/50" edges={['bottom']}>
        <View className="bg-white rounded-2xl p-6 w-11/12 max-w-sm shadow-xl">
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Your Registration</Text>
          <Text className="text-gray-600 mb-4 text-center">{eventTitle}</Text>
          <View className="items-center mb-6">
            <ViewShot ref={qrRef} options={{ format: "png", quality: 1 }}>
              <QRCode value={`vol-reg:${eventId}:${regId}:${userUid}`} size={200} backgroundColor="white" color="black" />
            </ViewShot>
          </View>
          <Pressable onPress={handleDownload} className="bg-[#0F828C] rounded-xl py-3 mb-3">
            <Text className="text-white font-bold text-center">Download QR Code</Text>
          </Pressable>
          <Pressable onPress={onClose} className="bg-gray-200 rounded-xl py-3">
            <Text className="text-gray-800 font-bold text-center">Close</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Private Info Form Modals (for complete/edit)
function PrivateInfoModal({
  visible,
  onClose,
  onComplete,
  existingInfo,
}: {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingInfo: PrivateInfo | null;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [step1, setStep1] = useState<PrivateInfoStep1>({
    firstName: existingInfo?.firstName || "",
    lastName: existingInfo?.lastName || "",
    phoneNumber: existingInfo?.phoneNumber || "",
    nic: existingInfo?.nic || "",
  });
  const [step2, setStep2] = useState<PrivateInfoStep2>({
    skills: existingInfo?.skills || "",
    availability: existingInfo?.availability || "",
    interests: existingInfo?.interests || "",
  });

  const handleNext = () => {
    if (step === 1) {
      if (!step1.firstName || !step1.lastName || !step1.phoneNumber || !step1.nic) {
        Alert.alert("Missing Info", "Please fill all fields in Step 1.");
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
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
      Alert.alert("Success", "Profile updated!");
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
        <SafeAreaView className="bg-white rounded-t-3xl max-h-[85%]" edges={['bottom']}>
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">{existingInfo ? "Edit Profile" : "Complete Your Profile"}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
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
                      onChangeText={(text) => setStep1((prev) => ({ ...prev, [field.key]: text }))}
                      className="border border-gray-300 rounded-xl p-3"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </View>
                ))}
                <Pressable onPress={handleNext} className="bg-[#0F828C] p-4 rounded-xl items-center">
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
                      onChangeText={(text) => setStep2((prev) => ({ ...prev, [field.key]: text }))}
                      className="border border-gray-300 rounded-xl p-3"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      multiline={field.multiline}
                      numberOfLines={field.multiline ? 3 : 1}
                      textAlignVertical={field.multiline ? "top" : "center"}
                    />
                  </View>
                ))}
                <View className="flex-row justify-between">
                  <Pressable onPress={handleBack} className="bg-gray-300 p-4 rounded-xl items-center flex-1 mr-2">
                    <Text className="text-slate-800 font-bold">Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={loading}
                    className={`bg-[#0F828C] p-4 rounded-xl items-center flex-1 ml-2 ${loading ? "opacity-50" : ""}`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold">{existingInfo ? "Update Profile" : "Complete Profile"}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Change Password Modal
function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !user.email) return;
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert("Success", "Password updated successfully");
      onClose();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Current password is incorrect");
      } else {
        Alert.alert("Error", "Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/50 justify-end"
      >
        <SafeAreaView className="bg-white rounded-t-3xl max-h-[85%]" edges={['bottom']}>
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">Change Password</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Text className="text-slate-700 mb-2">Current Password *</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                className="border border-gray-300 rounded-xl p-3"
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>
            <View className="mb-4">
              <Text className="text-slate-700 mb-2">New Password *</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                className="border border-gray-300 rounded-xl p-3"
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>
            <View className="mb-4">
              <Text className="text-slate-700 mb-2">Confirm New Password *</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="border border-gray-300 rounded-xl p-3"
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              className={`bg-[#0F828C] p-4 rounded-xl items-center ${loading ? "opacity-50" : ""}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Update Password</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Create Post Modal (unchanged but with teal colors)
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
        <SafeAreaView className="bg-white rounded-t-3xl max-h-[85%]" edges={['bottom']}>
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">{editingPost ? "Edit Post" : "Create Post"}</Text>
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
                  className={`px-4 py-2 rounded-full mr-2 ${category === cat ? "bg-[#0F828C]" : "bg-gray-100"}`}
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
              className={`bg-[#0F828C] p-4 rounded-xl items-center mb-8 ${posting ? "opacity-50" : ""}`}
            >
              {posting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">{editingPost ? "Update Post" : "Publish Post"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
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
  const [showProfile, setShowProfile] = useState(false);
  const [showVolunteerLife, setShowVolunteerLife] = useState(false);
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [qrModal, setQrModal] = useState<{ eventId: string; regId: string; eventTitle: string } | null>(null);
  const [showPrivateInfoModal, setShowPrivateInfoModal] = useState(false);
  const [privateInfo, setPrivateInfo] = useState<PrivateInfo | null>(null);
  const [privateInfoExists, setPrivateInfoExists] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [showChangePassword, setShowChangePassword] = useState(false);

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

  // Fetch registered events, private info, and compute badges
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setEventsLoading(true);
      try {
        // Registered events
        const registrationsRef = collection(db, `users/${user.uid}/registrations`);
        const snapshot = await getDocs(registrationsRef);
        const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RegisteredEvent));
        setRegisteredEvents(events);
        const completed = events.filter((e) => e.status === "completed").length;
        setCompletedCount(completed);

        // Private info
        const privateDoc = await getDoc(doc(db, "users", user.uid, "privateInfo", "info"));
        setPrivateInfoExists(privateDoc.exists());
        if (privateDoc.exists()) {
          setPrivateInfo(privateDoc.data() as PrivateInfo);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // Badges computation
  const badges: Badge[] = [
    { id: "profile", name: "Profile Complete", description: "Complete your personal info", color: "bg-green-100", icon: "checkmark-circle", earned: privateInfoExists },
    { id: "first", name: "First Volunteering", description: "Complete your first event", color: "bg-green-100", icon: "checkmark-circle", earned: completedCount >= 1 },
    { id: "five", name: "First five events", description: "Complete five events", color: "bg-yellow-100", icon: "checkmark-circle", earned: completedCount >= 5 },
    { id: "eco", name: "Eco Champion", description: "Register 10 events", color: "bg-teal-100", icon: "leaf-outline", earned: registeredEvents.length >= 10 },
    { id: "sustained", name: "Sustained Volunteer", description: "Register 20 events", color: "bg-teal-100", icon: "medal-outline", earned: registeredEvents.length >= 20 },
    { id: "platinum", name: "Platinum Volunteer", description: "Register 30 events", color: "bg-teal-100", icon: "trophy-outline", earned: registeredEvents.length >= 30 },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const availableBadges = badges.filter(b => !b.earned);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(public)/auth/login");
    } catch (error: any) {
      Alert.alert("Error", `Failed to sign out: ${error.message || "Unknown error"}`);
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setShowCreateModal(true);
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
      regId: event.id, // assuming regId == event.id in user's registration doc
      eventTitle: event.eventTitle || "Event",
    });
  };

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslate }],
        }}
        className="bg-gradient-to-r from-[#0F828C] to-teal-700"
      >
        <View className="px-6 pt-5 pb-1" />
      </Animated.View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 border-2 border-teal-200 shadow-md items-center justify-center mb-4">
              <Ionicons name="person" size={40} color="#0F828C" />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-1">
              {privateInfo ? `${privateInfo.firstName} ${privateInfo.lastName}` : (user?.email?.split("@")[0] || "Volunteer")}
            </Text>
            <Text className="text-slate-600 text-center mb-2">{user?.email}</Text>
            <Pressable className="bg-teal-100 rounded-xl px-4 py-2 flex-row items-center">
              <Text className="text-[#0F828C] font-medium mr-1">More Info</Text>
              <Ionicons name="chevron-down" size={16} color="#0F828C" />
            </Pressable>
          </View>
        </View>

        {/* My Registered Events */}
        <Pressable
          onPress={() => setShowEvents(!showEvents)}
          className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-4 flex-row justify-between items-center"
        >
          <Text className="text-lg font-bold text-slate-800">My Registered Events</Text>
          <Ionicons name={showEvents ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
        </Pressable>
        {showEvents && (
          <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
            {eventsLoading ? (
              <ActivityIndicator color="#0F828C" />
            ) : registeredEvents.length === 0 ? (
              <View className="items-center py-4">
                <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                <Text className="text-slate-500 mt-2">You haven't registered for any events yet</Text>
              </View>
            ) : (
              registeredEvents.map((event) => {
                const eventDate = tsToDate(event.eventDate);
                return (
                  <View
                    key={event.id}
                    className="mb-4 pb-4 border-b border-teal-100 last:border-b-0 last:mb-0 last:pb-0"
                  >
                    <Text className="font-semibold text-slate-800">{event.eventTitle}</Text>
                    <Text className="text-slate-600 text-sm">
                      {formatDate(eventDate)} {eventDate && formatTime(eventDate) && `• ${formatTime(eventDate)}`}
                    </Text>
                    <View className="mt-2">
                      <View
                        className={`px-3 py-1 rounded-full inline-block ${
                          event.status === "completed"
                            ? "bg-green-100"
                            : event.status === "confirmed"
                            ? "bg-[#0F828C]/10"
                            : "bg-yellow-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            event.status === "completed"
                              ? "text-green-800"
                              : event.status === "confirmed"
                              ? "text-[#0F828C]"
                              : "text-yellow-800"
                          }`}
                        >
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleViewQr(event)}
                      className="mt-2 bg-teal-100 rounded-lg py-2 px-3 w-32"
                    >
                      <Text className="text-center text-[#0F828C] font-medium">View QR Code</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* My Post */}
        <Pressable
          onPress={() => setShowPosts(!showPosts)}
          className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-4 flex-row justify-between items-center"
        >
          <Text className="text-lg font-bold text-slate-800">My Post</Text>
          <Ionicons name={showPosts ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
        </Pressable>
        {showPosts && (
          <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
            {postsLoading ? (
              <ActivityIndicator color="#0F828C" />
            ) : userPosts.length === 0 ? (
              <View className="items-center py-4">
                <Ionicons name="document-text-outline" size={32} color="#cbd5e1" />
                <Text className="text-slate-500 mt-2">You haven't created any posts yet</Text>
              </View>
            ) : (
              userPosts.map((post) => (
                <View
                  key={post.id}
                  className="mb-4 pb-4 border-b border-teal-100 last:border-b-0 last:mb-0 last:pb-0"
                >
                  <Text className="font-semibold text-slate-800 mb-1">{post.title}</Text>
                  <Text className="text-slate-600 text-sm mb-2" numberOfLines={2}>
                    {post.content}
                  </Text>
                  <View className="flex-row justify-between items-center">
                    <CategoryBadge category={post.category} />
                    <Text className="text-slate-500 text-xs">{post.createdAt?.toDate().toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row mt-2">
                    <Pressable onPress={() => handleEditPost(post)} className="p-1">
                      <Ionicons name="create-outline" size={18} color="#64748b" />
                    </Pressable>
                    <Pressable onPress={() => handleDeletePost(post.id)} className="p-1 ml-2">
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* My Profile (Personal Information) */}
        <Pressable
          onPress={() => setShowProfile(!showProfile)}
          className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-4 flex-row justify-between items-center"
        >
          <Text className="text-lg font-bold text-slate-800">My Profile</Text>
          <Ionicons name={showProfile ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
        </Pressable>
        {showProfile && (
          <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
            {privateInfoExists && privateInfo ? (
              <>
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-semibold text-slate-800">Personal Information</Text>
                  <Pressable onPress={() => setShowPrivateInfoModal(true)} className="bg-teal-100 rounded-lg px-3 py-1">
                    <Text className="text-[#0F828C] font-medium">Edit</Text>
                  </Pressable>
                </View>
                {[
                  { label: "First Name", value: privateInfo.firstName },
                  { label: "Last Name", value: privateInfo.lastName },
                  { label: "Phone Number", value: privateInfo.phoneNumber },
                  { label: "NIC / ID Number", value: privateInfo.nic },
                  { label: "Skills & Experience", value: privateInfo.skills },
                  { label: "Availability", value: privateInfo.availability },
                  { label: "Interests", value: privateInfo.interests },
                ].map((field, index) => (
                  <View key={index} className="mb-3">
                    <Text className="text-slate-700 font-medium mb-1">{field.label}</Text>
                    <Text className="text-slate-600">{field.value || "Not set"}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View className="items-center">
                <Text className="text-slate-600 mb-4 text-center">Complete your profile to unlock more features</Text>
                <Pressable
                  onPress={() => setShowPrivateInfoModal(true)}
                  className="bg-[#0F828C] rounded-xl py-3 px-6"
                >
                  <Text className="text-white font-bold">Complete Profile</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* My Volunteer Life */}
        <Pressable
          onPress={() => setShowVolunteerLife(!showVolunteerLife)}
          className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-4 flex-row justify-between items-center"
        >
          <Text className="text-lg font-bold text-slate-800">My Volunteer Life</Text>
          <Ionicons name={showVolunteerLife ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
        </Pressable>
        {showVolunteerLife && (
          <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
            <Text className="text-slate-600 mb-4">Your volunteer stats:</Text>
            <Text className="text-slate-700">- Completed Events: {completedCount}</Text>
            <Text className="text-slate-700">- Registered Events: {registeredEvents.length}</Text>
            {/* Add more stats if available */}
          </View>
        )}

        {/* Achievements and Badges */}
        <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
          <Text className="text-lg font-bold text-slate-800 mb-4">Achievements and Badges</Text>
          <Text className="text-slate-700 font-medium mb-2">Earned Badges ({earnedBadges.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {earnedBadges.map((b) => (
              <View key={b.id} className={`mr-3 p-3 rounded-xl ${b.color} items-center w-32`}>
                <Ionicons name={b.icon as any} size={24} color="#0F828C" />
                <Text className="text-slate-800 font-medium text-center mt-1">{b.name}</Text>
                <Text className="text-slate-600 text-xs text-center">{b.description}</Text>
              </View>
            ))}
          </ScrollView>
          <Text className="text-slate-700 font-medium mb-2">Available Badges</Text>
          {availableBadges.map((b) => (
            <View key={b.id} className="flex-row items-center mb-3 p-3 bg-gray-50 rounded-xl">
              <Ionicons name={b.icon as any} size={24} color="#64748b" className="mr-3" />
              <View className="flex-1">
                <Text className="text-slate-800 font-medium">{b.name}</Text>
                <Text className="text-slate-600 text-xs">{b.description}</Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="#64748b" />
            </View>
          ))}
        </View>

        {/* Account Settings */}
        <Pressable
          onPress={toggleAccountMenu}
          className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-4 flex-row justify-between items-center"
        >
          <Text className="text-lg font-bold text-slate-800">Manage Account Settings</Text>
          <Ionicons name={showAccountMenu ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
        </Pressable>
        {showAccountMenu && (
          <View className="bg-white rounded-2xl shadow-lg border border-teal-100 p-6 mb-6">
            <Pressable onPress={() => setShowChangePassword(true)} className="mb-4">
              <Text className="text-slate-800 font-medium">Change Password</Text>
            </Pressable>
            <Pressable onPress={handleLogout} className="bg-red-100 rounded-xl py-3 items-center">
              <Text className="text-red-600 font-medium">Sign Out</Text>
            </Pressable>
          </View>
        )}
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
        onComplete={() => {
          // Refresh private info
          getDoc(doc(db, "users", user!.uid, "privateInfo", "info")).then((docSnap) => {
            if (docSnap.exists()) {
              setPrivateInfo(docSnap.data() as PrivateInfo);
              setPrivateInfoExists(true);
            }
          });
        }}
        existingInfo={privateInfo}
      />

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </SafeAreaView>
  );
}