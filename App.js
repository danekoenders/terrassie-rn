import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import SunCalc from 'suncalc';
import Slider from '@react-native-community/slider';
import * as turf from '@turf/turf';

// Replace with your public token
MapboxGL.setAccessToken('pk.eyJ1IjoiZGFuZWtvZW5kZXJzIiwiYSI6ImNtODdvNzczZDA4dmcybHF1cnltZmVkbTQifQ.aiCVa0540JxdEivA-rlDTQ');

export default function App() {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [date, setDate] = useState(new Date());
  const [hour, setHour] = useState(new Date().getHours());
  const [isInShadow, setIsInShadow] = useState(null);
  const [sunPos, setSunPos] = useState(null);
  const [bearingFromNorth, setBearingFromNorth] = useState(0);
  const [sunAltitudeDeg, setSunAltitudeDeg] = useState(0);
  const [rayCoords, setRayCoords] = useState(null);
  const [blockerFeature, setBlockerFeature] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      const position = await getCurrentPositionAsync({});
      setLocation([position.coords.longitude, position.coords.latitude]);
      setSelectedPoint([position.coords.longitude, position.coords.latitude]);
    })();
  }, []);

  useEffect(() => {
    if (selectedPoint) {
      calculateSunPosition();
    }
  }, [hour, selectedPoint]);

  const calculateSunPosition = () => {
    if (!selectedPoint) return;

    // Create a new date with the current date but chosen hour
    const dateWithHour = new Date(date);
    dateWithHour.setHours(hour, 0, 0, 0);

    // Get sun position
    const sunPosition = SunCalc.getPosition(
      dateWithHour,
      selectedPoint[1],
      selectedPoint[0]
    );

    // Convert azimuth to bearing from North
    const azimuthDeg = sunPosition.azimuth * 180 / Math.PI;
    const bearing = (180 + azimuthDeg) % 360;
    
    // Convert altitude to degrees
    const altitudeDeg = sunPosition.altitude * 180 / Math.PI;

    setSunPos(sunPosition);
    setBearingFromNorth(bearing);
    setSunAltitudeDeg(altitudeDeg);

    // Calculate ray coordinates for visualization
    calculateRayCoordinates(selectedPoint, bearing);
  };

  const calculateRayCoordinates = (point, bearing) => {
    if (!point) return;

    const origin = turf.point([point[0], point[1]]);
    const farPoint = turf.destination(origin, 0.5, bearing, { units: 'kilometers' });
    setRayCoords([origin.geometry.coordinates, farPoint.geometry.coordinates]);
  };

  const checkSunlightForPoint = async () => {
    if (!mapRef.current || !selectedPoint) return;

    try {
      // Get buildings in view
      const features = await mapRef.current.queryRenderedFeaturesInRect([], null, ['building']);
      
      // Sun already below horizon - it's night
      if (sunAltitudeDeg <= 0) {
        setIsInShadow(true);
        setBlockerFeature(null);
        return;
      }

      let inShadow = false;
      let blocker = null;

      const point = turf.point(selectedPoint);

      for (let feat of features) {
        const props = feat.properties;
        const height = props.height || 0;
        if (height <= 0) continue;

        // Calculate distance and bearing to building
        const buildingCenter = turf.center(feat);
        const dist = turf.distance(point, buildingCenter, { units: 'meters' });
        const bearingToBldg = turf.bearing(point, buildingCenter);

        // Normalize bearing values
        const bearingDiff = Math.abs(((bearingToBldg - bearingFromNorth) + 360) % 360);
        const angleFromSun = Math.min(bearingDiff, 360 - bearingDiff);
        
        // Skip buildings not in sun's direction (with some tolerance)
        if (angleFromSun > 10) {
          continue;
        }

        // Compute building elevation angle
        const buildingAngleDeg = Math.atan2(height, dist) * 180 / Math.PI;
        
        // If building angle >= sun altitude, it blocks the sun
        if (buildingAngleDeg >= sunAltitudeDeg) {
          inShadow = true;
          blocker = feat;
          break;
        }
      }

      setIsInShadow(inShadow);
      setBlockerFeature(blocker);
    } catch (error) {
      console.error("Error checking sunlight:", error);
    }
  };

  // Get center coordinates of the map view
  const onCenterChanged = async () => {
    if (!mapRef.current) return;
    
    try {
      const center = await mapRef.current.getCenter();
      setSelectedPoint(center);
    } catch (error) {
      console.error("Error getting center:", error);
    }
  };

  if (!location) {
    return (
      <View style={styles.container}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/mapbox/light-v11"
          onRegionDidChange={onCenterChanged}
          logoEnabled={false}
          pitchEnabled={true}
          onDidFinishLoadingMap={onCenterChanged}
        >
          <MapboxGL.Camera
            zoomLevel={17}
            centerCoordinate={location}
            pitch={60}
            heading={-45}
            animationDuration={1000}
          />
          
          <MapboxGL.UserLocation visible={true} />
          
          {/* Light that mimics the sun */}
          <MapboxGL.Light
            style={{
              anchor: 'map',
              position: [1.5, bearingFromNorth, 90 - sunAltitudeDeg],
              color: 'white',
              intensity: 0.8
            }}
          />

          {/* Ray visualizing sun direction */}
          {rayCoords && (
            <MapboxGL.ShapeSource id="raySource" shape={{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: rayCoords },
              properties: {}
            }}>
              <MapboxGL.LineLayer
                id="rayLine"
                style={{
                  lineColor: isInShadow ? 'rgba(255,0,0,0.8)' : 'rgba(255, 215, 0, 0.8)',
                  lineWidth: 4,
                  lineDasharray: isInShadow ? [1, 1] : [1, 0]
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Highlight blocking building if any */}
          {blockerFeature && (
            <MapboxGL.ShapeSource id="blockerSource" shape={blockerFeature}>
              <MapboxGL.FillLayer
                id="blockerFill"
                style={{ fillColor: 'red', fillOpacity: 0.3 }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>

        {/* Center pin marker */}
        <View style={styles.centerPinMarker} pointerEvents="none">
          {isInShadow === null ? (
            <View style={styles.centerPin} />
          ) : isInShadow ? (
            <View style={[styles.centerPin, styles.shadowPin]} />
          ) : (
            <View style={[styles.centerPin, styles.sunPin]} />
          )}
        </View>

        {/* Time slider and button controls */}
        <View style={styles.controls}>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Time: {hour}:00 {hour >= 12 ? 'PM' : 'AM'}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={21}
              step={1}
              value={hour}
              onValueChange={(h) => setHour(h)}
              minimumTrackTintColor="#FFDB58"
              maximumTrackTintColor="#000000"
            />
          </View>

          <TouchableOpacity style={styles.checkButton} onPress={checkSunlightForPoint}>
            <Text style={styles.buttonText}>Check Sunlight</Text>
          </TouchableOpacity>

          {isInShadow !== null && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {isInShadow ? '🌥️ In Shadow' : '☀️ In Sunlight'}
              </Text>
              {sunAltitudeDeg <= 0 && (
                <Text style={styles.resultText}>Sun is below horizon</Text>
              )}
              <Text style={styles.infoText}>
                Sun altitude: {sunAltitudeDeg.toFixed(1)}°
              </Text>
              <Text style={styles.infoText}>
                Sun direction: {bearingFromNorth.toFixed(1)}°
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  centerPinMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -20,
    zIndex: 10,
  },
  centerPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ccc',
    borderWidth: 2,
    borderColor: 'white',
  },
  sunPin: {
    backgroundColor: '#FFDB58', // Mustard yellow
  },
  shadowPin: {
    backgroundColor: '#6E7B8B', // Slate grey
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
  },
  sliderContainer: {
    marginBottom: 15,
  },
  sliderLabel: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  checkButton: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
  },
});
