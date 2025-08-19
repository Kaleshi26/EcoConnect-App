// app/_layout.tsx
import { Slot } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import "./global.css"; // ✅ This activates Tailwind / NativeWind

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
