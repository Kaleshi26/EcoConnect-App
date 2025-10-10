import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/services/firebaseConfig";
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

// Helper functions for date formatting
function tsToDate(ts?: Timestamp) {
  try {
    if (!ts) return null;
    // @ts-ignore
    if (typeof ts.toDate === "function") return ts.toDate();
  } catch {}
  return null;
}

function formatDate(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d?: Date | null) {
  if (!d) return undefined;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Custom hook for press animations
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

  return (
    <View className={`px-3 py-1 rounded-full ${config.color} flex-row items-center`}>
      <Ionicons name={config.icon as any} size={14} color={config.text.replace("text-", "")} />
      <Text className={`${config.text} text-xs font-medium ml-1`}>{config.label}</Text>
    </View>
  );
}

function VolVolunteerProfile({ isTeam, teamName }: { isTeam?: boolean; teamName?: string }) {
  return (
    <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
      <View className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 pb-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person-outline" size={20} color="#3b82f6" />
          </View>
          <Text className="text-xl font-bold text-slate-800">Volunteer Profile</Text>
        </View>
      </View>
      <View className="p-6">
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="people-outline" size={16} color="#3b82f6" />
            </View>
            <View>
              <Text className="text-slate-700 font-medium">Mode</Text>
              <Text className="text-slate-800 font-semibold">{isTeam ? "Team/Community" : "Individual"}</Text>
            </View>
          </View>
          {isTeam && teamName && (
            <View className="flex-row items-center mb-3">
              <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="business-outline" size={16} color="#3b82f6" />
              </View>
              <View>
                <Text className="text-slate-700 font-medium">Team</Text>
                <Text className="text-slate-800 font-semibold">{teamName}</Text>
              </View>
            </View>
          )}
        </View>
        <View className="pt-4 border-t border-blue-100">
          <Text className="text-slate-600 font-medium mb-3">Volunteer Benefits:</Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
              <Text className="text-slate-700">Browse & join clean-up events</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
              <Text className="text-slate-700">Track your impact & earn badges</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
              <Text className="text-slate-700">Connect with local community</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// Registered Events Section Component
function RegisteredEventsSection() {
  const { user } = useAuth();
  const [registeredEvents, setRegisteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRegisteredEvents = async () => {
      try {
        const registrationsRef = collection(db, `users/${user.uid}/registrations`);
        const snapshot = await getDocs(registrationsRef);
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRegisteredEvents(events);
      } catch (error) {
        console.error("Error fetching registered events:", error);
        Alert.alert("Error", "Failed to load your registered events");
      } finally {
        setLoading(false);
      }
    };

    fetchRegisteredEvents();
  }, [user]);

  if (loading) {
    return (
      <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
        <View className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 pb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-800">My Registered Events</Text>
          </View>
        </View>
        <View className="p-6">
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
      <View className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 pb-4">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
          </View>
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
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

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
        <View className="bg-white rounded-t-3xl max-h-5/6">
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
              placeholder="Share your thoughts, experiences, or event details including date..."
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-xl p-3 mb-4 h-32"
              style={{ textAlignVertical: "top" }}
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
                <Text className="text-white font-bold text-lg">{editingPost ? "Update Post" : "Publish Post"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function VolProfile() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;
  const completeBtnAnim = usePressScale();
  const accountBtnAnim = usePressScale();
  const logoutBtnAnim = usePressScale();
  const menuOpacity = useRef(new Animated.Value(0)).current;

  // Header animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Menu animation
  useEffect(() => {
    Animated.timing(menuOpacity, {
      toValue: showAccountMenu ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showAccountMenu]);

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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsData: Post[] = [];
        snapshot.forEach((doc) => {
          postsData.push({ id: doc.id, ...doc.data() } as Post);
        });
        setUserPosts(postsData);
        setPostsLoading(false);
      },
      (error) => {
        console.error("Error fetching posts:", error);
        Alert.alert(
          "Error",
          `Failed to load posts: ${error.message || "Unknown error"}`,
          [{ text: "Retry", onPress: () => setPostsLoading(true) }]
        );
        setUserPosts([]);
        setPostsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/(public)/auth/login");
    } catch (error: any) {
      Alert.alert("Error", `Failed to sign out: ${error.message || "Unknown error"}`);
    }
  };

  const handleCompleteAccount = () => {
    console.log("[VolProfile] Complete account clicked");
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

  const toggleAccountMenu = () => {
    setShowAccountMenu(!showAccountMenu);
  };

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
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-slate-100 border-2 border-blue-200 shadow-md items-center justify-center mb-4">
              <Ionicons name="person" size={40} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-800 mb-1">
              {user?.email?.split("@")[0] || "Volunteer"}
            </Text>
            <Text className="text-slate-600 text-center">{user?.email}</Text>
            <View className="flex-row items-center mt-3 px-3 py-1.5 bg-blue-50 rounded-full">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-blue-700 font-medium text-sm">Active Volunteer</Text>
            </View>
          </View>
        </View>
        
        {/* Registered Events Section */}
        <RegisteredEventsSection />
        
        <View className="mb-6">
          {profile ? (
            <VolVolunteerProfile isTeam={profile?.isTeam} teamName={(profile as any)?.teamName} />
          ) : (
            <View className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
              <View className="items-center py-4">
                <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="alert-circle-outline" size={32} color="#64748b" />
                </View>
                <Text className="text-slate-700 text-center">No profile found. Please contact admin for assistance.</Text>
              </View>
            </View>
          )}
        </View>
        
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
          <View className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 pb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
              </View>
              <Text className="text-xl font-bold text-slate-800">My Posts</Text>
            </View>
          </View>
          <View className="p-6">
            {postsLoading ? (
              <ActivityIndicator color="#3b82f6" />
            ) : userPosts.length === 0 ? (
              <View className="items-center py-4">
                <Ionicons name="document-text-outline" size={32} color="#cbd5e1" />
                <Text className="text-slate-500 mt-2">You havent created any posts yet</Text>
              </View>
            ) : (
              userPosts.slice(0, 3).map((post) => (
                <View
                  key={post.id}
                  className="mb-4 pb-4 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0"
                >
                  <Text className="font-semibold text-slate-800 mb-1">{post.title}</Text>
                  <Text className="text-slate-600 text-sm mb-2" numberOfLines={2}>
                    {post.content}
                  </Text>
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
            {userPosts.length > 3 && (
              <Pressable
                onPress={() => {
                  Alert.alert("View All Posts", "This would show all your posts in a dedicated screen");
                }}
                className="mt-4 bg-blue-50 p-3 rounded-xl items-center"
              >
                <Text className="text-blue-700 font-medium">View All Posts ({userPosts.length})</Text>
              </Pressable>
            )}
          </View>
        </View>
        
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-6">
          <View className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 pb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </View>
              <Text className="text-xl font-bold text-slate-800">Earn Your Badge</Text>
            </View>
          </View>
          <View className="p-6">
            <View className="flex-row items-start mb-4">
              <View className="w-12 h-12 bg-yellow-100 rounded-full items-center justify-center mr-4 mt-1">
                <Ionicons name="medal" size={24} color="#f59e0b" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-800 font-semibold mb-2">Golden Volunteer Badge</Text>
                <Text className="text-slate-600 leading-5">
                  Complete your account profile to unlock exclusive features and earn recognition in the community.
                </Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ scale: completeBtnAnim.scale }] }}>
              <TouchableOpacity
                onPress={handleCompleteAccount}
                onPressIn={completeBtnAnim.onPressIn}
                onPressOut={completeBtnAnim.onPressOut}
                className="bg-blue-600 rounded-xl py-4 items-center shadow-md"
              >
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-bold ml-2 text-base">Complete Account</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
        
        <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
          <Animated.View style={{ transform: [{ scale: accountBtnAnim.scale }] }}>
            <Pressable
              onPress={toggleAccountMenu}
              onPressIn={accountBtnAnim.onPressIn}
              onPressOut={accountBtnAnim.onPressOut}
              className="p-6 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="settings-outline" size={20} color="#64748b" />
                </View>
                <Text className="text-xl font-bold text-slate-800">Account Settings</Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: showAccountMenu ? "180deg" : "0deg" }] }}>
                <Ionicons name="chevron-down" size={24} color="#64748b" />
              </Animated.View>
            </Pressable>
          </Animated.View>
          {showAccountMenu && (
            <Animated.View style={{ opacity: menuOpacity }} className="px-6 pb-6">
              <View className="pt-4 border-t border-slate-100">
                <Animated.View style={{ transform: [{ scale: logoutBtnAnim.scale }] }}>
                  <TouchableOpacity
                    onPress={handleLogout}
                    onPressIn={logoutBtnAnim.onPressIn}
                    onPressOut={logoutBtnAnim.onPressOut}
                    className="bg-red-500 rounded-xl py-4 items-center shadow-md"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="log-out-outline" size={20} color="white" />
                      <Text className="text-white font-bold ml-2 text-base">Sign Out</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>
      
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
    </View>
  );
}