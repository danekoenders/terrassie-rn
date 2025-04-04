import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { SunlightProvider } from './src/context/SunlightContext';
import MapScreen from './src/components/Map/MapScreen';
import * as Location from 'expo-location';

// Set Mapbox access token
MapboxGL.setAccessToken('pk.eyJ1IjoiZGFuZWtvZW5kZXJzIiwiYSI6ImNtODdvNzczZDA4dmcybHF1cnltZmVkbTQifQ.aiCVa0540JxdEivA-rlDTQ');

export default function App() {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setIsLoading(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation([position.coords.longitude, position.coords.latitude]);
        setIsLoading(false);
        
        // Set up location updates
        const locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (newPosition) => {
            setLocation([newPosition.coords.longitude, newPosition.coords.latitude]);
          }
        );
        
        // Clean up subscription when component unmounts
        return () => {
          if (locationSubscription) {
            locationSubscription.remove();
          }
        };
      } catch (error) {
        setError(error.message);
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <SunlightProvider>
      {isLoading ? (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading location...</Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Using default location (Amsterdam)</Text>
        </View>
      ) : (
        <MapScreen location={location} />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
  },
  errorSubtext: {
    fontSize: 16,
    color: 'gray',
  },
});
