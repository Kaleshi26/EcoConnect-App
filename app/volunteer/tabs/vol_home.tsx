import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove, where } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/firebaseConfig";

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

// UI Components
function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View className="flex-row items-center" style={style}>{children}</View>;
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden mb-4" style={style}>{children}</View>;
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

  return (
    <View className={`px-3 py-1 rounded-full ${config.color} flex-row items-center`}>
      <Ionicons name={config.icon as any} size={14} color={config.text.replace("text-", "")} />
      <Text className={`${config.text} text-xs font-medium ml-1`}>{config.label}</Text>
    </View>
  );
}

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

  return (
    <Card>
      <View className="p-4 flex-row justify-between items-center border-b border-blue-100">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#3b82f6" />
          </View>
          <View>
            <Text className="font-semibold text-slate-800">{post.authorName}</Text>
            <Text className="text-slate-500 text-xs">
              {post.createdAt?.toDate().toLocaleDateString()} • {post.category}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <CategoryBadge category={post.category} />
          {!disableEditDelete && isAuthor && (
            <View className="flex-row ml-2">
              <Pressable onPress={onEdit} className="p-1">
                <Ionicons name="create-outline" size={18} color="#64748b" />
              </Pressable>
              <Pressable onPress={onDelete} className="p-1 ml-1">
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
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
      </Pressable>
      <View className="px-4 py-3 border-t border-blue-100 flex-row justify-between">
        <Animated.View style={{ transform: [{ scale: likeAnim.scale }] }}>
          <Pressable onPress={onLike} onPressIn={likeAnim.onPressIn} onPressOut={likeAnim.onPressOut} className="flex-row items-center">
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#ef4444" : "#64748b"} />
            <Text className={`ml-1 ${isLiked ? "text-red-500" : "text-slate-500"}`}>{post.likes.length}</Text>
          </Pressable>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: commentAnim.scale }] }}>
          <Pressable onPress={onComment} onPressIn={commentAnim.onPressIn} onPressOut={commentAnim.onPressOut} className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={20} color="#64748b" />
            <Text className="text-slate-500 ml-1">{post.comments.length}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Card>
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-5/6">
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
                  className={`px-4 py-2 rounded-full mr-2 ${category === cat ? "bg-blue-600" : "bg-gray-100"}`}
                >
                  <Text className={category === cat ? "text-white" : "text-slate-700"}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
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
              {posting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{editingPost ? "Update Post" : "Publish Post"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PostDetailModal({ post, visible, onClose, onLike, currentUserId }: { post: Post; visible: boolean; onClose: () => void; onLike: () => void; currentUserId: string }) {
  const [comment, setComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const { user, profile } = useAuth();
  const isLiked = post.likes.includes(currentUserId);

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to comment");
      return;
    }
    if (!comment.trim()) {
      Alert.alert("Error", "Comment cannot be empty");
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
        createdAt: new Date().toISOString(), // Use client-side timestamp
      };

      await updateDoc(doc(db, "posts", post.id), {
        comments: arrayUnion(newComment),
      });

      setComment("");
      Alert.alert("Success", "Comment added successfully");
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
        <View className="bg-white rounded-t-3xl max-h-4/5">
          <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-slate-800">Post Details</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </Pressable>
          </View>
          <ScrollView className="p-4">
            <View className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="person" size={24} color="#3b82f6" />
              </View>
              <View>
                <Text className="font-semibold text-slate-800">{post.authorName}</Text>
                <Text className="text-slate-500 text-xs">{post.createdAt?.toDate().toLocaleDateString()}</Text>
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
            <View className="flex-row justify-between mb-6 py-3 border-t border-b border-gray-100">
              <Text className="text-slate-600">{post.likes.length} likes</Text>
              <Text className="text-slate-600">{post.comments.length} comments</Text>
            </View>
            <View className="flex-row justify-around mb-6">
              <Pressable onPress={onLike} className="flex-row items-center">
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#ef4444" : "#64748b"} />
                <Text className={`ml-2 ${isLiked ? "text-red-500" : "text-slate-600"}`}>Like</Text>
              </Pressable>
            </View>
            <Text className="text-lg font-semibold text-slate-800 mb-4">Comments</Text>
            {post.comments.length === 0 ? (
              <Text className="text-slate-500 text-center py-4">No comments yet. Be the first to comment!</Text>
            ) : (
              post.comments.map((comment) => (
                <View key={comment.id} className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <View className="flex-row items-center mb-2">
                    <Text className="font-semibold text-slate-800">{comment.authorName}</Text>
                    <Text className="text-slate-500 text-xs ml-2">{new Date(comment.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text className="text-slate-700">{comment.content}</Text>
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
                className={`bg-blue-600 p-3 rounded-xl items-center ${postingComment || !comment.trim() ? "opacity-50" : ""}`}
              >
                {postingComment ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Post Comment</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function VolHome() {
  const { user, profile } = useAuth();
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
    const q = query(collection(db, "posts"), where("status", "==", "published"), orderBy("createdAt", "desc"));

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
        Alert.alert("Error", `Failed to load posts: ${error.message || "Unknown error"}`, [{ text: "Retry", onPress: handleRefresh }]);
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to like a post");
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
      Alert.alert("Error", "You must be logged in to delete a post");
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
            Alert.alert("Success", "Post deleted successfully");
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
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-600 mt-4">Loading posts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">

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
            onEdit={() => {}}
            onDelete={() => {}}
            disableEditDelete={true}
          />
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
              <Ionicons name="document-text-outline" size={32} color="#3b82f6" />
            </View>
            <Text className="text-2xl font-bold text-slate-800 mb-3">No Posts Yet</Text>
            <Text className="text-slate-600 text-center max-w-sm leading-6 mb-6">
              Be the first to share your volunteer experiences, ask questions, or suggest ideas!
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
      />
      <Animated.View style={{ position: "absolute", bottom: 20, right: 20, transform: [{ scale: createBtnAnim.scale }] }}>
        <Pressable
          onPress={() => {
            setEditingPost(null);
            setShowCreateModal(true);
          }}
          onPressIn={createBtnAnim.onPressIn}
          onPressOut={createBtnAnim.onPressOut}
          className="w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-xl"
        >
          <Ionicons name="add" size={32} color="white" />
        </Pressable>
      </Animated.View>
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
    </View>
  );
}