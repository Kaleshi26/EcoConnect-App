import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/services/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  imageUrls?: string[];
  location?: string;
  likes: string[];
  comments: Comment[];
  createdAt: any;
  updatedAt: any;
  status: PostStatus;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: any;
}

// Helpers
const isWeb = Platform.OS === "web";

function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View className="flex-row items-center" style={style}>
      {children}
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View className="bg-white rounded-2xl shadow-lg border border-teal-100 overflow-hidden mb-4" style={style}>
      {children}
    </View>
  );
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

  const colorValue =
    config.text === "text-blue-800" ? "#1e40af" :
    config.text === "text-green-800" ? "#166534" :
    config.text === "text-yellow-800" ? "#854d0e" :
    config.text === "text-purple-800" ? "#6b21a8" : "#991b1b";

  return (
    <View className={`px-3 py-1 rounded-full ${config.color} flex-row items-center`}>
      <Ionicons name={config.icon as any} size={14} color={colorValue} />
      <Text className={`${config.text} text-xs font-medium ml-1`}>{config.label}</Text>
    </View>
  );
}

// Image Uploader Component
type ColorVariant = "blue" | "green" | "purple" | "orange" | "pink";

function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  title,
  color = "blue",
}: {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  title: string;
  color?: ColorVariant;
}) {
  const [uploading, setUploading] = useState(false);

  const uploadImageToFirebase = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `posts/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading to Firebase:", error);
      throw error;
    }
  };

  const pickImage = async () => {
    if (images.length >= maxImages) {
      Alert.alert("Limit Reached", `You can only upload up to ${maxImages} images.`);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant permission to access your photos.");
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      if (isWeb) {
        options.base64 = true;
      }

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setUploading(true);
      let finalUrl: string;

      if (isWeb && result.assets[0].base64) {
        finalUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      } else {
        finalUrl = await uploadImageToFirebase(result.assets[0].uri);
      }

      onImagesChange([...images, finalUrl]);
    } catch (error) {
      console.error("Image upload error:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const colorMap = {
    blue: "bg-[#0F828C]",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
  };

  return (
    <View className="mb-4">
      {title && <Text className="text-gray-900 text-base font-semibold mb-3">{title}</Text>}
      <View className="flex-row flex-wrap">
        {images.map((image, index) => (
          <View key={`image-${index}`} className="relative mr-3 mb-3">
            <Image source={{ uri: image }} className="w-20 h-20 rounded-xl" resizeMode="cover" />
            <Pressable
              onPress={() => removeImage(index)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
            >
              <Ionicons name="close" size={16} color="white" />
            </Pressable>
          </View>
        ))}
        {images.length < maxImages && (
          <Pressable
            onPress={pickImage}
            disabled={uploading}
            className={`w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center ${colorMap[color]} ${uploading ? "opacity-50" : "opacity-90"}`}
          >
            {uploading ? <ActivityIndicator color="white" /> : <Ionicons name="add" size={24} color="white" />}
          </Pressable>
        )}
      </View>
      <Text className="text-gray-500 text-sm mt-1">{images.length}/{maxImages} images selected</Text>
    </View>
  );
}

// Post Card
function PostCard({
  post,
  onPress,
  onLike,
  onComment,
  onEdit,
  onDelete,
  currentUserId,
  disableEditDelete = false,
}: {
  post: Post;
  onPress: () => void;
  onLike: () => void;
  onComment: () => void;
  onEdit: () => void;
  onDelete: () => void;
  currentUserId: string;
  disableEditDelete?: boolean;
}) {
  const likeAnim = usePressScale();
  const commentAnim = usePressScale();
  const isLiked = post.likes.includes(currentUserId);
  const isAuthor = post.authorId === currentUserId;

  const showMenu = () => {
    Alert.alert("Post Options", "", [
      { text: "Edit", onPress: onEdit },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Card>
      <View className="p-4 flex-row justify-between items-center border-b border-teal-100">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-teal-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#0F828C" />
          </View>
          <View>
            <Text className="font-semibold text-slate-800">{post.authorName}</Text>
            <Text className="text-slate-500 text-xs">
              {post.createdAt?.toDate().toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <CategoryBadge category={post.category} />
          {!disableEditDelete && isAuthor && (
            <Pressable onPress={showMenu} className="ml-2 p-1">
              <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
            </Pressable>
          )}
        </View>
      </View>
      <Pressable onPress={onPress} className="p-4">
        <Text className="text-lg font-bold text-slate-800 mb-2">{post.title}</Text>
        <Text className="text-slate-600 mb-3" numberOfLines={3}>
          {post.content}
        </Text>
        {post.location && post.category === "event" && (
          <Row style={{ marginBottom: 8 }}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
            <Text className="text-slate-600 text-sm ml-1">{post.location}</Text>
          </Row>
        )}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <Image
            source={{ uri: post.imageUrls[0] }}
            className="w-full h-40 rounded-lg mt-2"
            resizeMode="cover"
          />
        )}
      </Pressable>
      <View className="px-4 py-3 border-t border-teal-100 flex-row justify-between">
        <Animated.View style={{ transform: [{ scale: likeAnim.scale }] }}>
          <Pressable
            onPress={onLike}
            onPressIn={likeAnim.onPressIn}
            onPressOut={likeAnim.onPressOut}
            className="flex-row items-center"
          >
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#ef4444" : "#64748b"} />
            <Text className={`ml-1 ${isLiked ? "text-red-500" : "text-slate-500"}`}>{post.likes.length}</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: commentAnim.scale }] }}>
          <Pressable
            onPress={onComment}
            onPressIn={commentAnim.onPressIn}
            onPressOut={commentAnim.onPressOut}
            className="flex-row items-center"
          >
            <Ionicons name="chatbubble-outline" size={20} color="#64748b" />
            <Text className="text-slate-500 ml-1">{post.comments.length}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Card>
  );
}

// Create Post Modal
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
  const [imageUrls, setImageUrls] = useState<string[]>(editingPost?.imageUrls || []);
  const [posting, setPosting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("blog");
    setLocation("");
    setImageUrls([]);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setPosting(true);
    try {
      // Convert any base64 images to Firebase Storage URLs
      const processedImageUrls = await Promise.all(
        imageUrls.map(async (url) => {
          if (url.startsWith("data:image")) {
            const response = await fetch(url);
            const blob = await response.blob();
            const filename = `posts/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
          }
          return url;
        })
      );

      const postData = {
        title: title.trim(),
        content: content.trim(),
        category,
        location: category === "event" ? location.trim() : "",
        authorId: user.uid,
        authorEmail: user.email || "",
        authorName: profile?.email?.split("@")[0] || "Volunteer",
        imageUrls: processedImageUrls,
        imageUrl: processedImageUrls[0] || "",
        likes: editingPost?.likes || [],
        comments: editingPost?.comments || [],
        status: "published" as PostStatus,
        updatedAt: serverTimestamp(),
        ...(editingPost ? {} : { createdAt: serverTimestamp() }),
      };

      if (editingPost) {
        await updateDoc(doc(db, "posts", editingPost.id), postData);
        Alert.alert("Success", "Post updated successfully!");
      } else {
        await addDoc(collection(db, "posts"), postData);
        Alert.alert("Success", "Post published successfully!");
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
        <SafeAreaView edges={["top", "bottom"]} className="bg-white rounded-t-3xl max-h-[85%]">
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">
              {editingPost ? "Edit Post" : "Create Post"}
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView className="p-4" keyboardShouldPersistTaps="handled">
            <Text className="text-slate-700 font-medium mb-2">Category *</Text>
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

            <ImageUploader
              images={imageUrls}
              onImagesChange={setImageUrls}
              maxImages={5}
              title="📸 Add Photos (Optional)"
              color="blue"
            />

            <Text className="text-slate-700 font-medium mb-2">Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a catchy title..."
              className="border border-gray-300 rounded-xl p-3 mb-4"
            />

            <Text className="text-slate-700 font-medium mb-2">Content *</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Share your thoughts, experiences, or event details including date..."
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
                <Text className="text-white font-bold text-lg">
                  {editingPost ? "Update Post" : "Publish Post"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Post Detail Modal
function PostDetailModal({
  post,
  visible,
  onClose,
  onLike,
  currentUserId,
}: {
  post: Post;
  visible: boolean;
  onClose: () => void;
  onLike: () => void;
  currentUserId: string;
}) {
  const [comment, setComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const { user, profile } = useAuth();
  const isLiked = post.likes.includes(currentUserId);

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to comment.");
      return;
    }
    if (!comment.trim()) {
      Alert.alert("Error", "Comment cannot be empty.");
      return;
    }
    setPostingComment(true);
    try {
      const newComment = {
        id: Date.now().toString(),
        authorId: user.uid,
        authorName: profile?.email?.split("@")[0] || "Volunteer",
        authorEmail: user.email || "",
        content: comment.trim(),
        createdAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, "posts", post.id), {
        comments: arrayUnion(newComment),
      });
      setComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", `Failed to add comment: ${error.message || "Unknown error"}`);
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <SafeAreaView edges={["top", "bottom"]} className="bg-white rounded-t-3xl max-h-[90%]">
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">Post Details</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView className="p-4">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-teal-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={24} color="#0F828C" />
              </View>
              <View>
                <Text className="font-semibold text-slate-800">{post.authorName}</Text>
                <Text className="text-slate-500 text-xs">
                  {post.createdAt?.toDate().toLocaleDateString()}
                </Text>
              </View>
              <View className="ml-auto">
                <CategoryBadge category={post.category} />
              </View>
            </View>

            <Text className="text-xl font-bold text-slate-800 mb-2">{post.title}</Text>
            <Text className="text-slate-600 mb-4">{post.content}</Text>

            {post.location && post.category === "event" && (
              <Row style={{ marginBottom: 8 }}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text className="text-slate-600 ml-1">{post.location}</Text>
              </Row>
            )}

            {post.imageUrls && post.imageUrls.length > 0 && (
              <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                  {post.imageUrls.map((url, index) => (
                    <View key={`detail-image-${index}`} className="mr-2">
                      <Image
                        source={{ uri: url }}
                        className="w-64 h-64 rounded-xl"
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
                <Text className="text-slate-500 text-xs text-center">
                  {post.imageUrls.length} photo{post.imageUrls.length !== 1 ? "s" : ""}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between mb-6 py-3 border-t border-b border-gray-100">
              <Text className="text-slate-600">{post.likes.length} likes</Text>
              <Text className="text-slate-600">{post.comments.length} comments</Text>
            </View>

            <View className="flex-row justify-around mb-6">
              <Pressable onPress={onLike} className="flex-row items-center">
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={24}
                  color={isLiked ? "#ef4444" : "#64748b"}
                />
                <Text className={`ml-2 ${isLiked ? "text-red-500" : "text-slate-600"}`}>Like</Text>
              </Pressable>
            </View>

            <Text className="text-lg font-semibold text-slate-800 mb-4">Comments</Text>

            {post.comments.length === 0 ? (
              <Text className="text-slate-500 text-center py-4">
                No comments yet. Be the first to comment!
              </Text>
            ) : (
              post.comments.map((commentItem) => (
                <View key={commentItem.id} className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <View className="flex-row items-center mb-2">
                    <Text className="font-semibold text-slate-800">{commentItem.authorName}</Text>
                    <Text className="text-slate-500 text-xs ml-2">
                      {new Date(commentItem.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-slate-700">{commentItem.content}</Text>
                </View>
              ))
            )}

            <View className="mt-6">
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add a comment..."
                className="border border-gray-300 rounded-xl p-3 mb-2"
              />
              <Pressable
                onPress={handleAddComment}
                disabled={postingComment || !comment.trim()}
                className={`bg-[#0F828C] p-3 rounded-xl items-center ${postingComment || !comment.trim() ? "opacity-50" : ""}`}
              >
                {postingComment ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Post Comment</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// Main Screen
export default function VolHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const createBtnAnim = usePressScale();

  useEffect(() => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "posts"),
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
        setPosts(postsData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error fetching posts:", error);
        Alert.alert("Error", `Failed to load posts: ${error.message || "Unknown error"}`, [
          { text: "Retry", onPress: handleRefresh },
        ]);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to like a post.");
      return;
    }

    const postRef = doc(db, "posts", postId);
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(user.uid);
    try {
      if (isLiked) {
        await updateDoc(postRef, { likes: arrayRemove(user.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(user.uid) });
      }
    } catch (error: any) {
      console.error("Error updating like:", error);
      Alert.alert("Error", `Failed to update like: ${error.message || "Unknown error"}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete a post.");
      return;
    }

    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "posts", postId));
            Alert.alert("Success", "Post deleted successfully!");
          } catch (error: any) {
            console.error("Error deleting post:", error);
            Alert.alert("Error", `Failed to delete post: ${error.message || "Unknown error"}`);
          }
        },
      },
    ]);
  };

  const handleRefresh = () => {
    setRefreshing(true);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#0F828C" />
        <Text className="text-slate-600 mt-4">Loading posts...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={user?.uid || ""}
            onPress={() => {
              setSelectedPost(item);
              setShowDetailModal(true);
            }}
            onLike={() => handleLike(item.id)}
            onComment={() => {
              setSelectedPost(item);
              setShowDetailModal(true);
            }}
            onEdit={() => {
              setEditingPost(item);
              setShowCreateModal(true);
            }}
            onDelete={() => handleDeletePost(item.id)}
            disableEditDelete={false}
          />
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <View className="w-20 h-20 bg-teal-100 rounded-full items-center justify-center mb-6">
              <Ionicons name="document-text-outline" size={32} color="#0F828C" />
            </View>
            <Text className="text-2xl font-bold text-slate-800 mb-3">No Posts Yet</Text>
            <Text className="text-slate-600 text-center max-w-sm leading-6 mb-6">
              Be the first to share your volunteer experiences, ask questions, or suggest ideas!
            </Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : { padding: 16 }}
      />

      <SafeAreaView edges={["bottom", "right"]} style={{ position: "absolute", bottom: 0, right: 0 }}>
        <Animated.View
          style={{
            bottom: 20,
            right: 20,
            transform: [{ scale: createBtnAnim.scale }],
          }}
        >
          <Pressable
            onPress={() => {
              setEditingPost(null);
              setShowCreateModal(true);
            }}
            onPressIn={createBtnAnim.onPressIn}
            onPressOut={createBtnAnim.onPressOut}
            className="w-16 h-16 bg-[#0F828C] rounded-full items-center justify-center shadow-xl"
          >
            <Ionicons name="add" size={32} color="white" />
          </Pressable>
        </Animated.View>
      </SafeAreaView>

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

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          visible={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedPost(null);
          }}
          onLike={() => handleLike(selectedPost.id)}
          currentUserId={user?.uid || ""}
        />
      )}
    </SafeAreaView>
  );
}