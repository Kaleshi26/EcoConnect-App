// app.config.js

import 'dotenv/config';

// No need to import app.json here, expo-cli does it automatically when we export a function.

export default ({ config }) => {
  // `config` is the evaluated app.json | app.config.js content.
  // We can modify it and return it.

  console.log("Reading Google Maps API Key:", process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

  // Add the Google Maps API Key configuration
  config.android = {
    ...(config.android || {}),

    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION"
    ],
    
    config: {
      ...(config.android?.config || {}),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  };

  config.ios = {
    ...(config.ios || {}),
    config: {
      ...(config.ios?.config || {}),
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  };

  config.web = {
    ...(config.web || {}),
    config: {
      ...(config.web?.config || {}),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  };

  // Return the modified config.
  return {
    ...config,
  };
};