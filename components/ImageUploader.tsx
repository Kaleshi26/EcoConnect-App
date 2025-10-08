// org_event.tsx
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { useState } from 'react';
import { Button, Image } from 'react-native';
import { db } from '../services/firebaseConfig'; // your firestore instance

const storage = getStorage();

export default function OrgEvent() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images, // NEW API
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      // Convert local file to blob
      let blob: Blob;
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        const response = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const byteCharacters = atob(response);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/jpeg' });
      }

      // Upload to Firebase Storage
      const filename = `events/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      setImageUrl(downloadURL);

      // Save URL to Firestore (example, adapt as needed)
      await setDoc(doc(db, 'events', 'YOUR_EVENT_ID'), { image: downloadURL }, { merge: true });

      console.log('Image uploaded successfully:', downloadURL);
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };

  return (
    <>
      <Button title="Pick Image" onPress={pickImage} />
      {imageUrl && <Image source={{ uri: imageUrl }} style={{ width: 200, height: 200 }} />}
    </>
  );
}
