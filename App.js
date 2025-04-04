import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { SunlightProvider } from './src/context/SunlightContext';
import MapScreen from './src/components/Map/MapScreen';

// Set Mapbox access token
MapboxGL.setAccessToken('pk.eyJ1IjoiZGFuZWtvZW5kZXJzIiwiYSI6ImNtODdvNzczZDA4dmcybHF1cnltZmVkbTQifQ.aiCVa0540JxdEivA-rlDTQ');

export default function App() {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Request location permissions and get initial location
    const getLocation = async () => {
      try {
        const { status } = await requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        const position = await getCurrentPositionAsync({});
        setLocation([position.coords.longitude, position.coords.latitude]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error getting location:', error);
        setIsLoading(false);
      }
    };

    getLocation();
  }, []);

  // Show loading indicator while getting location
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  return (
    <SunlightProvider>
      <MapScreen location={location} />
    </SunlightProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
