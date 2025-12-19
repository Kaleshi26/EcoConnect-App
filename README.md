### EcoConnect 🌱 — Connect Volunteers, Sponsors, Organizers, and Waste Collectors for Greener Impact

A modern, role-based React Native app (Expo + TypeScript) that connects communities to organize eco-events, coordinate waste collection, manage sponsorships, and track impact—powered by Firebase, Expo Router, and NativeWind (Tailwind CSS for React Native).

App Video - https://vimeo.com/1139806894?share=copy&fl=sv&fe=ci
---

## ✨ Features

- 🌍 **Role-based dashboards**: Volunteer, Organizer, Sponsor, Waste Collector, Researcher
- 🔐 **Firebase Auth**: Email/password login and session management
- 👥 **Profiles & Roles**: Team/individual volunteer flows with Firestore profiles
- 🧭 **Expo Router navigation**: File-based routing with smart redirects by role
- 🖼️ **Image uploads**: Upload event images to Firebase Storage or Cloudinary
- 🔔 **Notification settings**: Customizable preferences saved per user in Firestore
- 💸 **Multi-currency UI**: Currency selector and formatting via context
- 🗺️ **Location & Media**: Integrations available via Expo APIs
- 🎨 **NativeWind + Tailwind**: Fast, beautiful styling with a consistent design system
- 📊 **Charts & Reports (ready)**: Libraries included for impact and sponsorship analytics

---

## ⚙️ Tech Stack

- [![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)](https://reactnative.dev/)
- [![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)](https://expo.dev/)
- [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
- [![Expo Router](https://img.shields.io/badge/Expo%20Router-6.0-000000?logo=reactrouter)](https://expo.github.io/router/docs)
- [![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-FFCA28?logo=firebase)](https://firebase.google.com/)
- [![NativeWind](https://img.shields.io/badge/NativeWind-4.1-38B2AC)](https://www.nativewind.dev/)
- [![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
- [![Reanimated](https://img.shields.io/badge/Reanimated-4.1-000000)](https://docs.swmansion.com/react-native-reanimated/)
- [![Expo APIs](https://img.shields.io/badge/Expo%20APIs-Camera%20%7C%20Location%20%7C%20Notifications-1B1F23)](https://docs.expo.dev/versions/latest/)
- [![Cloudinary](https://img.shields.io/badge/Cloudinary-Image%20Upload-3448C5?logo=cloudinary)](https://cloudinary.com/)

---

## 🚀 Installation & Setup

1) Clone and install
   ```bash
git clone <your-repo-url>
cd EcoConnect-App
   npm install
   ```

2) Set environment variables  
Create a `.env` file in the project root:
```bash
# Firebase (Expo public envs must be prefixed with EXPO_PUBLIC_)
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloudinary (optional if using Cloudinary upload)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

3) Run the app
   ```bash
npm run start
# or
npm run android
npm run ios
npm run web
```

4) Lint
```bash
npm run lint
```

---

## 🧩 Folder Structure

```text
EcoConnect-App/
  app/
    _layout.tsx                    // Global layout: wraps app in AuthProvider
    global.css                     // Tailwind setup (NativeWind)
    (public)/
      _layout.tsx                  // Public stack (login/signup)
      index.tsx                    // Landing with CTA
      auth/
        login.tsx                  // Firebase email/password login
        signup.tsx                 // Role selection + team support
    (app)/
      (tabs)/
        _layout.tsx                // Role-aware redirect → role dashboards
        index.tsx                  // Generic app dashboard (fallback)
    eventorganizer/
      tabs/ ...                    // Organizer screens (events, profile, reports, volunteers)
    sponsor/
      tabs/ ...                    // Sponsor screens (dashboard, events, reports, profile)
    volunteer/
      tabs/ ...                    // Volunteer home, events, notifications, profile
    waste_collector/
      tabs/ ...                    // Waste collector home, assignments, analytics, profile
  components/
    CurrencySelector.tsx
    ImageUploader.tsx
    NotificationSettings.tsx
  contexts/
    AuthContext.tsx                // Firebase auth + Firestore profile stream
    CurrencyContext.tsx            // Currency conversion + formatting
    NotificationContext.tsx        // User notification preferences (Firestore)
  services/
    firebaseConfig.js              // Firebase: Auth, Firestore, Storage
    cloudinaryUpload.ts            // Cloudinary upload utility
  assets/
    images/                        // App icons, splash/logo
  constants/                       // (placeholders for icons/images maps)
  interfaces/                      // (placeholders for shared types)
  tailwind.config.js               // NativeWind + theme colors
  babel.config.js                  // Reanimated + NativeWind babel config
  metro.config.js                  // NativeWind + CSS input
  tsconfig.json                    // Strict TS + path aliases
  app.json                         // Expo config (icons, splash, plugins)
  package.json
```

---

## 📱 Screenshots / Preview

- `/assets/screenshot1.png`
- `/assets/screenshot2.png`
- `/assets/screenshot3.png`

> Replace with real screenshots from your app.

---

## 🔐 Environment Variables

- Firebase config via `process.env.EXPO_PUBLIC_*` in `services/firebaseConfig.js`
- Cloudinary config via `EXPO_PUBLIC_CLOUDINARY_*` in `services/cloudinaryUpload.ts`

Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` to the app runtime.

---

## 🧠 Architecture / Explanation

- **Navigation**: File-based routing with `expo-router`.  
  - Public stack in `(public)` with login/signup.  
  - Authenticated area in `(app)/(tabs)` that redirects users by `profile.role`:
    - `volunteer` → `/volunteer/tabs/vol_home`
    - `wasteCollector` → `/waste_collector/tabs/wc_home`
    - `organizer` → `/eventorganizer/tabs/org_events`
    - `sponsor` → `/sponsor/tabs/sponsorDashboard`
- **State & Context**:
  - `AuthContext`: Listens to Firebase Auth and subscribes to user profile doc in Firestore. Exposes `{ user, profile, loading, logout }`.
  - `CurrencyContext`: Provides `currency`, `convertAmount`, and `formatCurrency` with basic exchange-rate mapping.
  - `NotificationContext`: Loads and persists user notification preferences in Firestore with optimistic updates.
- **Data Layer**:
  - Firebase Auth for authentication.
  - Firestore (`users/{uid}`) for profiles and settings.
  - Firebase Storage and/or Cloudinary for image uploads.
- **Styling**:
  - NativeWind + Tailwind with custom theme colors in `tailwind.config.js`.
- **Expo APIs (available)**:
  - Camera, Image Picker, Location, Notifications (dependencies already included).

---

## 🔌 Notable Libraries

- Navigation: `expo-router`, `@react-navigation/*`
- UI/UX: `expo-image`, `expo-linear-gradient`, `lucide-react-native`, `@expo/vector-icons`
- Animations/Gestures: `react-native-reanimated`, `react-native-gesture-handler`
- Charts/Maps: `react-native-chart-kit`, `react-native-maps`
- Media/Print/Share: `expo-image-picker`, `expo-media-library`, `expo-print`, `expo-sharing`
- Utilities: `react-native-view-shot`, `react-native-qrcode-svg`
- Optional AI SDK present: `clarifai` (not wired yet)

---

## 🤝 Contributing

1) Fork the repo  
2) Create a feature branch: `git checkout -b feat/your-feature`  
3) Commit your changes: `git commit -m "feat: add your feature"`  
4) Push the branch: `git push origin feat/your-feature`  
5) Open a Pull Request

Please follow the existing code style (TypeScript, strict mode), avoid unnecessary comments, and keep functions/variables descriptive.

---

## 📜 License

This project is licensed under the MIT License.  
Add your full license text in `LICENSE` if not present.

---

## 🏷️ Project Badges

![RN](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-FFCA28?logo=firebase)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)
![NativeWind](https://img.shields.io/badge/NativeWind-4.1-38B2AC)
![Reanimated](https://img.shields.io/badge/Reanimated-4.1-000000)
![CI Ready](https://img.shields.io/badge/PRs-Welcome-brightgreen)

---

## 🧭 Build Setup & Scripts

From `package.json`:

- `npm run start` — Start Expo dev server
- `npm run android` — Launch on Android
- `npm run ios` — Launch on iOS simulator
- `npm run web` — Launch web
- `npm run lint` — ESLint (Expo config)
- `npm run reset-project` — Clean starter to a blank app (keep cautiously)

Babel config includes NativeWind and Reanimated plugin.  
Metro config adds NativeWind and reads CSS from `app/global.css`.  
Expo config (`app.json`) defines icons, splash, web bundler, and enables new architecture and typed routes.

---

Built with ❤️ to empower communities to make measurable environmental impact.
