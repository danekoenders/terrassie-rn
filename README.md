# Sunlight Simulator App

A React Native mobile application that simulates sunlight and shadows on 3D buildings based on time of day and location.

## Features

- Interactive 3D map with buildings
- Time slider to change sun position
- Sun ray visualization
- Detection of shadows cast by buildings
- Real-time lighting changes

## Setup

### Prerequisites

- Node.js and npm
- Xcode (for iOS)
- Android Studio (for Android)
- Mapbox account with access tokens

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

3. Configure Mapbox tokens:
   - Create a Mapbox account at https://www.mapbox.com/
   - Get a public token (starts with pk...)
   - Get a secret download token (starts with sk...)
   - Update `app.json` with your secret download token:
     ```json
     {
       "expo": {
         "plugins": [
           [
             "@rnmapbox/maps",
             {
               "RNMapboxMapsImpl": "mapbox",
               "RNMapboxMapsDownloadToken": "YOUR_MAPBOX_SECRET_DOWNLOAD_TOKEN"
             }
           ]
         ]
       }
     }
     ```
   - Update `App.js` with your public token:
     ```js
     MapboxGL.setAccessToken('YOUR_MAPBOX_PUBLIC_TOKEN');
     ```

4. Run prebuild to configure native code:
   ```
   npx expo prebuild --clean
   ```

5. Install pods (iOS):
   ```
   npx pod-install
   ```

6. Run the app:
   ```
   npm run ios
   # or
   npm run android
   ```

## How to Use

1. Move the map to select a location (the center pin)
2. Use the time slider to change the time of day
3. Press "Check Sunlight" to analyze if the point is in sunlight or shadow
4. The app will show:
   - A yellow or gray pin indicating sun/shadow
   - A ray line showing the sun's direction
   - Highlighted blocking buildings (if in shadow)

## Dependencies

- React Native
- Expo
- @rnmapbox/maps (Mapbox GL)
- SunCalc (sun position calculation)
- @turf/turf (geospatial analysis)
- expo-location (device location) 