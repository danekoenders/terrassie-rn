import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, View, SafeAreaView, Text, ActivityIndicator } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useSunlight } from "../../context/SunlightContext";
import { Colors, Shadows } from "../../styles/common";
import * as Location from 'expo-location';

// Import components
import CenterPointer from "./CenterPointer";
import CheckSunlightButton from "./CheckSunlightButton";
import { SearchBar } from "../Search/SearchBar";
import { SearchResults } from "../Search/SearchResults";
import { ExitButton } from "../Analysis/ExitButton";
import { TimeSlider } from "../Analysis/TimeSlider";
import { AnalysisPanel } from "../Analysis/AnalysisPanel";

const MapScreen = ({ location }) => {
  const mapRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [isCameraSystemMove, setIsCameraSystemMove] = useState(false);
  const [showCenterPointer, setShowCenterPointer] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  // Add a flag to prevent automatic location updates from overriding manual actions
  const [isManuallyNavigating, setIsManuallyNavigating] = useState(false);
  // Use refs for values that shouldn't trigger re-renders
  const selectedPointRef = useRef(null);

  // Fallback to Amsterdam coordinates if location is not available
  const effectiveLocation = location || [4.9041, 52.3676];

  const [cameraProps, setCameraProps] = useState({
    centerCoordinate: [4.9041, 52.3676], // Default to Amsterdam
    zoomLevel: 12,
    animationDuration: 1000,
    animationMode: 'flyTo',
  });

  // Add a timestamp state to force camera re-render
  const [cameraKey, setCameraKey] = useState(Date.now());

  const {
    selectedPoint,
    setSelectedPoint,
    rayCoords,
    blockerFeature,
    intersectionPoint,
    isInShadow,
    isAnalysisMode,
    bearingFromNorth,
    startSunlightAnalysis,
    exitSunlightAnalysis,
  } = useSunlight();

  // Keep selectedPointRef in sync with selectedPoint
  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  // Initialize map with user location - memoize the effect dependencies
  const memoizedEffectiveLocation = useMemo(() => effectiveLocation, [
    Array.isArray(effectiveLocation) 
      ? `${effectiveLocation[0]},${effectiveLocation[1]}` 
      : `${effectiveLocation.longitude},${effectiveLocation.latitude}`
  ]);
  
  useEffect(() => {
    if (memoizedEffectiveLocation && isMapReady && !isManuallyNavigating) {
      const coords = Array.isArray(memoizedEffectiveLocation)
        ? memoizedEffectiveLocation
        : [memoizedEffectiveLocation.longitude, memoizedEffectiveLocation.latitude];
      
      // Only update if the coords are significantly different 
      if (!selectedPointRef.current || 
          Math.abs(selectedPointRef.current[0] - coords[0]) > 0.0001 || 
          Math.abs(selectedPointRef.current[1] - coords[1]) > 0.0001) {
        
        setCameraProps((prev) => ({
          ...prev,
          centerCoordinate: coords,
          animationDuration: 1000,
          animationMode: 'flyTo',
        }));
        
        // Force camera update
        setCameraKey(Date.now());
        
        // Update selectedPoint
        setSelectedPoint(coords);
      }
    }
  }, [memoizedEffectiveLocation, isMapReady, isManuallyNavigating, setSelectedPoint]);

  // Handle map load completion
  const onMapReady = useCallback(() => {
    setIsMapReady(true);
    // Add a slight delay to ensure all map resources are loaded
    setTimeout(() => setMapLoading(false), 500);
  }, []);

  // Get center coordinates of the map view - memoize to prevent unnecessary recreations
  const onCenterChanged = useCallback(async () => {
    if (!mapRef.current || !isMapReady) return;

    try {
      const center = await mapRef.current.getCenter();
      
      // Only update selectedPoint if it actually changed significantly
      if (!selectedPointRef.current || 
          Math.abs(selectedPointRef.current[0] - center[0]) > 0.0001 || 
          Math.abs(selectedPointRef.current[1] - center[1]) > 0.0001) {
        setSelectedPoint(center);
      }

      // If the camera move wasn't initiated by the system and we're in analysis mode
      if (!isCameraSystemMove && isAnalysisMode) {
        // Exit analysis mode if user manually moves the camera
        exitSunlightAnalysis();
      }

      // Get current zoom level to determine if we should show the center pointer
      const zoom = await mapRef.current.getZoom();
      setShowCenterPointer(zoom >= 17);
    } catch (error) {
      // Error handling
    }
  }, [isMapReady, isCameraSystemMove, isAnalysisMode, setSelectedPoint, exitSunlightAnalysis]);

  // Fly to any location with animation
  const flyToLocation = useCallback((coords) => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    try {
      // Set the manual navigation flag
      setIsManuallyNavigating(true);
      
      const targetCoords = Array.isArray(coords)
        ? coords
        : [coords.longitude, coords.latitude];
      
      // Use functional update to avoid stale state
      setCameraProps(prev => ({
        ...prev,
        centerCoordinate: targetCoords,
        animationDuration: 1000,
        zoomLevel: 16,
        animationMode: 'flyTo',
      }));
      
      // Force update
      setCameraKey(Date.now());
      
      // Reset the manual navigation flag after the animation completes
      setTimeout(() => {
        setIsManuallyNavigating(false);
      }, 1500);
    } catch (error) {
      setIsManuallyNavigating(false);
    }
  }, [isMapReady]);

  // Update camera to face the sun direction
  const updateCameraToFaceSun = useCallback(() => {
    if (!selectedPoint) return;

    // Mark this as a system-initiated camera move
    setIsCameraSystemMove(true);

    // Use functional update to avoid stale state
    setCameraProps(prev => ({
      ...prev,
      centerCoordinate: selectedPoint,
      heading: bearingFromNorth,
      pitch: 60,
      animationDuration: 500,
      animationMode: 'flyTo',
    }));
    
    // Force update
    setCameraKey(Date.now());

    // Reset the flag after camera movement is complete
    setTimeout(() => {
      setIsCameraSystemMove(false);
    }, 600);
  }, [selectedPoint, bearingFromNorth]);

  // Update search results
  const updateSearchResults = useCallback((results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, []);

  // Handle selecting a place from search results
  const handleSelectPlace = useCallback((place) => {
    if (!place || !place.geometry || !place.geometry.coordinates) return;

    const [longitude, latitude] = place.geometry.coordinates;
    const newLocation = [longitude, latitude];

    // Update selected point
    setSelectedPoint(newLocation);

    // Fly to the location
    flyToLocation(newLocation);

    // Clear search results
    setSearchResults([]);
    setShowSearchResults(false);
  }, [setSelectedPoint, flyToLocation]);

  // Handle check sunlight button press
  const handleCheckSunlight = useCallback(() => {
    try {
      if (!mapRef.current) {
        alert("Map not ready. Please try again in a moment.");
        return;
      }
      
      if (!selectedPoint) {
        alert("No point selected. Please move the map to select a location.");
        return;
      }
      
      startSunlightAnalysis(mapRef.current);
      updateCameraToFaceSun();
    } catch (error) {
      alert("Error checking sunlight. Please try again.");
    }
  }, [selectedPoint, startSunlightAnalysis, updateCameraToFaceSun]);

  // Set up location updates
  useEffect(() => {
    let locationSubscription;
    
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
        
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (newPosition) => {
            if (newPosition && newPosition.coords) {
              const newLocation = [newPosition.coords.longitude, newPosition.coords.latitude];
              if (!userLocation || 
                  Math.abs(userLocation[0] - newLocation[0]) > 0.00001 || 
                  Math.abs(userLocation[1] - newLocation[1]) > 0.00001) {
                setUserLocation(newLocation);
              }
            }
          }
        );
      } catch (error) {
        // Handle error
      }
    })();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [userLocation]);

  // Direct function to handle location button press
  const handleLocationButtonPress = useCallback(() => {
    // First try to use the userLocation if available
    const targetLocation = userLocation || location || [4.9041, 52.3676]; // Fallback to Amsterdam
    
    // Apply a small jitter to ensure camera animates even if at same location
    const jitter = 0.00001;
    let finalLocation;
    
    if (Array.isArray(targetLocation)) {
      finalLocation = [
        targetLocation[0] + (Math.random() * jitter),
        targetLocation[1] + (Math.random() * jitter)
      ];
    } else {
      finalLocation = {
        longitude: targetLocation.longitude + (Math.random() * jitter),
        latitude: targetLocation.latitude + (Math.random() * jitter)
      };
    }
    
    // Set camera to user location
    flyToLocation(finalLocation);
  }, [userLocation, location, flyToLocation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/danekoenders/cm8824x5800b901qr2tt8e6pz"
          onMapIdle={onCenterChanged}
          logoEnabled={false}
          pitchEnabled={true}
          onDidFinishLoadingMap={onMapReady}
          onMapLoadingError={(error) => {
            setMapLoading(false);
            // Handle error if needed
          }}
        >
          <MapboxGL.Camera 
            key={`camera-${cameraKey}`}
            {...cameraProps} 
          />

          {/* User Location Puck */}
          <MapboxGL.LocationPuck
            visible={true}
            puckBearing="heading"
            puckBearingEnabled={true}
            pulsing={{
              isEnabled: true,
              color: Colors.primary,
              radius: 'accuracy'
            }}
          />

          {/* Ray visualizing sun direction */}
          {rayCoords && (
            <MapboxGL.ShapeSource
              id="raySource"
              shape={{
                type: "Feature",
                geometry: { type: "LineString", coordinates: rayCoords },
                properties: {},
              }}
            >
              <MapboxGL.LineLayer
                id="rayLine"
                style={{
                  lineColor: isInShadow
                    ? "rgba(255,0,0,0.8)"
                    : "rgba(255,215,0,0.8)",
                  lineWidth: 4,
                  lineDasharray: isInShadow ? [1, 1] : [1, 0],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Intersection point marker */}
          {intersectionPoint && (
            <MapboxGL.ShapeSource
              id="intersectionSource"
              shape={{
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: intersectionPoint,
                },
                properties: {},
              }}
            >
              <MapboxGL.CircleLayer
                id="intersectionCircle"
                style={{
                  circleRadius: 6,
                  circleColor: "#ff0000",
                  circleStrokeWidth: 2,
                  circleStrokeColor: "#ffffff",
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Highlight blocking building if any */}
          {blockerFeature && (
            <MapboxGL.ShapeSource id="blockerSource" shape={blockerFeature}>
              <MapboxGL.FillLayer
                id="blockerFill"
                style={{ fillColor: "#ff0000", fillOpacity: 0.3 }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>

        {/* Loading Indicator */}
        {mapLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Map Loading...</Text>
          </View>
        )}

        {/* UI Overlays */}

        {/* Top search bar and location button */}
        {!isAnalysisMode && (
          <View style={styles.topContainer}>
            <SearchBar
              onUpdateResults={updateSearchResults}
              onFlyToUserLocation={handleLocationButtonPress}
            />

            {showSearchResults && (
              <SearchResults
                results={searchResults}
                onSelectPlace={handleSelectPlace}
              />
            )}
          </View>
        )}

        {/* Exit analysis mode button */}
        {isAnalysisMode && <ExitButton onExit={exitSunlightAnalysis} />}

        {/* Center pointer for selecting a point */}
        {showCenterPointer && !isAnalysisMode && <CenterPointer />}

        {/* Center pin marker in analysis mode */}
        {isAnalysisMode && (
          <View style={styles.centerPinMarker} pointerEvents="none">
            <View
              style={[
                styles.analyzedPin,
                isInShadow ? styles.shadowPin : styles.sunPin,
              ]}
            >
              <Text style={styles.pinIcon}>{isInShadow ? "🌥️" : "☀️"}</Text>
            </View>
          </View>
        )}

        {/* Check Sunlight button */}
        {showCenterPointer && !isAnalysisMode && (
          <CheckSunlightButton onCheckSunlight={handleCheckSunlight} />
        )}

        {/* Bottom panel with time slider or results */}
        <View style={styles.bottomPanel}>
          {isAnalysisMode ? (
            <View>
              <AnalysisPanel />
              <TimeSlider />
            </View>
          ) : (
            <View style={styles.minimalPanel}>
              <View style={styles.panelHandle} />
              <Text style={styles.panelText}>
                Move map to check sunlight on terraces
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    flex: 1,
  },
  topContainer: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  centerPinMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
    zIndex: 10,
  },
  analyzedPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: Colors.white,
    ...Shadows.medium,
  },
  pinIcon: {
    fontSize: 20,
  },
  sunPin: {
    backgroundColor: "rgba(255,215,0,0.7)",
  },
  shadowPin: {
    backgroundColor: "rgba(110,123,139,0.7)",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.medium,
  },
  minimalPanel: {
    alignItems: "center",
    paddingVertical: 20,
  },
  panelHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.lightGray,
    borderRadius: 3,
    marginBottom: 16,
  },
  panelText: {
    fontSize: 16,
    color: Colors.gray,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.gray,
  },
});

export default MapScreen;
