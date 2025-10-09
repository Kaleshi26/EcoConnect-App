// app.config.js

import 'dotenv/config'; // Loads your .env file
import appJson from './app.json'; // Imports your existing app.json

export default {
  // Start with the entire existing app.json config
  ...appJson,
  
  // Now, we'll dive into the 'expo' object to add our new keys
  expo: {
    ...appJson.expo, // Keep all existing settings from expo object

    // Safely add our new android config
    android: {
      ...(appJson.expo.android || {}), // Keep existing android settings or use an empty object
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    // Safely add our new ios config
    ios: {
      ...(appJson.expo.ios || {}), // Keep existing ios settings or use an empty object
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
};