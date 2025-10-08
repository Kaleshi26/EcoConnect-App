import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, Image, View } from "react-native";
import { uploadImageToCloudinary } from "../services/cloudinaryUpload";
import { db } from "../services/firebaseConfig"; // your existing Firebase config

export default function ImageUploader({ userId }: { userId: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image) return;
    setUploading(true);
    try {
      const cloudUrl = await uploadImageToCloudinary(image);

      // Store the Cloudinary image URL in Firebase Firestore
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { profileImage: cloudUrl });

      Alert.alert("Success", "Image uploaded successfully!");
      setImage(null);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ alignItems: "center", marginTop: 20 }}>
      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 10 }}
        />
      )}
      {uploading ? (
        <ActivityIndicator size="large" color="#00AA88" />
      ) : (
        <>
          <Button title="Choose Image" onPress={pickImage} />
          {image && <Button title="Upload to Cloudinary" onPress={handleUpload} />}
        </>
      )}
    </View>
  );
}
