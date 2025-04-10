import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, View, SafeAreaView, Text, ActivityIndicator, TouchableOpacity, TouchableWithoutFeedback, Keyboard } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { useSunlight } from "../../context/SunlightContext";
import { Colors, Shadows } from "../../styles/common";
import * as Location from 'expo-location';
import * as turf from '@turf/turf';

// Import components
import CenterPointer from "./CenterPointer";
import CheckSunlightButton from "./CheckSunlightButton";
import { SearchBar } from "../Search/SearchBar";
import { SearchResults } from "../Search/SearchResults";
import { ExitButton } from "../Analysis/ExitButton";
import { TimeSlider } from "../Analysis/TimeSlider";
import { AnalysisPanel } from "../Analysis/AnalysisPanel";
import BuildingMarkers from "./BuildingMarkers";

const MapScreen = ({ initialLocation }) => {
  const mapRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [isCameraSystemMove, setIsCameraSystemMove] = useState(false);
  const [showCenterPointer, setShowCenterPointer] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [location, setLocation] = useState(initialLocation);
  // Add a flag to prevent automatic location updates from overriding manual actions
  const [isManuallyNavigating, setIsManuallyNavigating] = useState(false);
  // Use refs for values that shouldn't trigger re-renders
  const selectedPointRef = useRef(null);

  // Add state to track if search is focused
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Fallback to Amsterdam coordinates if location is not available
  const effectiveLocation = location || [4.9041, 52.3676];

  const [cameraProps, setCameraProps] = useState({
    centerCoordinate: effectiveLocation, // Use effectiveLocation instead of hardcoded Amsterdam
    zoomLevel: 16, // Start with a closer zoom
    animationDuration: 0, // No initial animation
    animationMode: 'none',
    pitch: 45, // Add an initial pitch for a more dynamic view
  });

  // Add a timestamp state to force camera re-render
  const [cameraKey, setCameraKey] = useState(Date.now());

  const {
    selectedPoint,
    setSelectedPoint,
    raySegments,
    blockerFeature,
    intersectionPoint,
    isInShadow,
    isAnalysisMode,
    bearingFromNorth,
    sunAltitudeDeg,
    startSunlightAnalysis,
    exitSunlightAnalysis,
    shouldUpdateCamera,
    setShouldUpdateCamera,
    cachedBuildings,
    showBuildingPoints,
    setShowBuildingPoints
  } = useSunlight();

  // Keep selectedPointRef in sync with selectedPoint
  useEffect(() => {
    selectedPointRef.current = selectedPoint;
  }, [selectedPoint]);

  // Initialize map with user location
  useEffect(() => {
    const initializeMapLocation = async () => {
      try {
        // Check if permissions were already granted
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          // Get the current position
          const currentPosition = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          
          if (currentPosition && currentPosition.coords) {
            const userCoords = [currentPosition.coords.longitude, currentPosition.coords.latitude];
            
            // Update location state
            setLocation(userCoords);
            setUserLocation(userCoords);
            
            // Update camera to user location
            setCameraProps(prev => ({
              ...prev,
              centerCoordinate: userCoords,
              zoomLevel: 16,
              animationDuration: 0,
              animationMode: 'none',
              pitch: 45, // Add pitch here as well
            }));
            
            // Force camera update
            setCameraKey(Date.now());
          }
        }
      } catch (error) {
        console.log('Error getting initial location:', error);
      }
    };

    // Only initialize if map is ready and we don't have a location yet
    if (isMapReady && !location) {
      initializeMapLocation();
    }
  }, [isMapReady]);

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

  // Use a fixed max zoom level since getMaxZoomLevel is not available
  const MAX_ZOOM = 18;

  // Add state for current zoom level to directly reference in rendering
  const [currentZoom, setCurrentZoom] = useState(12);

  // Handle map load completion
  const onMapReady = useCallback(() => {
    setIsMapReady(true);
    
    // Don't delay hiding the loading indicator - hide it immediately
    setMapLoading(false);
  }, []);

  // Create a separate ref to store analysis position
  const analysisPointRef = useRef(null);

  // Get center coordinates of the map view - memoize to prevent unnecessary recreations
  const onCenterChanged = useCallback(async () => {
    if (!mapRef.current || !isMapReady) return;

    try {
      // Dismiss keyboard and search results when user moves map
      if (isSearchFocused || showSearchResults) {
        Keyboard.dismiss();
        setShowSearchResults(false);
        setIsSearchFocused(false);
      }

      const center = await mapRef.current.getCenter();
      const zoom = await mapRef.current.getZoom();
      
      // Set current zoom for rendering
      setCurrentZoom(zoom);
      
      // Only update selectedPoint if we're not in analysis mode
      // This prevents drift during analysis
      if (!isAnalysisMode) {
        // Only update selectedPoint if it actually changed significantly
        if (!selectedPointRef.current || 
            Math.abs(selectedPointRef.current[0] - center[0]) > 0.0001 || 
            Math.abs(selectedPointRef.current[1] - center[1]) > 0.0001) {
          setSelectedPoint(center);
        }

        // When not in analysis mode, also update the analysis point ref
        if (center) {
          analysisPointRef.current = [...center];
        }
      }

      // If the camera move wasn't initiated by the system and we're in analysis mode
      if (!isCameraSystemMove && isAnalysisMode) {
        // Exit analysis mode if user manually moves the camera
        exitSunlightAnalysis();
      }

      // Determine if we should show the center pointer
      // Use just the zoom threshold of 18 for analysis mode
      const isHighZoom = zoom >= 18;
      const newShowCenterPointer = isHighZoom;
      
      // Force update if different
      if (newShowCenterPointer !== showCenterPointer) {
        setShowCenterPointer(newShowCenterPointer);
      }
    } catch (error) {
      // Critical error handling
    }
  }, [isMapReady, isCameraSystemMove, isAnalysisMode, setSelectedPoint, exitSunlightAnalysis, showCenterPointer, isSearchFocused, showSearchResults]);

  // Fly to any location with animation
  const flyToLocation = useCallback(async (coords) => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    try {
      // Set the manual navigation flag
      setIsManuallyNavigating(true);
      
      const targetCoords = Array.isArray(coords)
        ? coords
        : [coords.longitude, coords.latitude];
      
      // Get current zoom level
      const currentZoom = await mapRef.current.getZoom();
      
      // Use functional update to avoid stale state
      setCameraProps(prev => ({
        ...prev,
        centerCoordinate: targetCoords,
        animationDuration: 1000,
        // Set zoom to at least 18 to help users get to the analysis UI faster
        zoomLevel: Math.max(currentZoom, 18),
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
    if (!selectedPoint || !mapRef.current) return;

    // Mark this as a system-initiated camera move
    setIsCameraSystemMove(true);

    try {
      // Use Camera#setCamera instead of MapView.setCamera (which is deprecated)
      const camera = mapRef.current.getCamera();
      camera.setCamera({
        heading: bearingFromNorth,
        pitch: 60,
        zoomLevel: 17,
        centerCoordinate: selectedPoint,
        animationDuration: 1000,
      });
    } catch (err) {
      // Critical error, keep error handling
    }

    // Reset the flag after camera movement is complete
    setTimeout(() => {
      setIsCameraSystemMove(false);
    }, 1200);
  }, [selectedPoint, bearingFromNorth]);

  // Update search results
  const updateSearchResults = useCallback((results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  }, []);

  // Handle selecting a place from search results
  const handleSelectPlace = useCallback((place) => {
    if (!place) return;

    // Extract coordinates from the place object
    let coordinates = null;
    
    // Try different possible coordinate locations in the result
    if (place.geometry && place.geometry.coordinates) {
      coordinates = place.geometry.coordinates;
    } else if (place.center) {
      coordinates = place.center;
    } else if (place.properties && place.properties.coordinates) {
      coordinates = place.properties.coordinates;
    }
    
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return;
    }

    const [longitude, latitude] = coordinates;
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
  const handleCheckSunlight = useCallback(async () => {
    try {
      if (!mapRef.current) {
        alert("Map not ready. Please try again in a moment.");
        return;
      }
      
      // Get the exact center of the screen at the time of clicking
      const exactCenter = await mapRef.current.getCenter();
      
      if (!exactCenter) {
        alert("Could not determine center point. Please try again.");
        return;
      }
      
      // Update the selected point with the exact center from the map
      setSelectedPoint(exactCenter);
      
      // Store the exact analysis point when starting analysis
      analysisPointRef.current = [...exactCenter];
      
      // Small delay to ensure state is updated before starting analysis
      setTimeout(() => {
        startSunlightAnalysis(mapRef.current);
        updateCameraToFaceSun();
      }, 50);
    } catch (error) {
      console.error("Error in handleCheckSunlight:", error);
      alert("Error checking sunlight. Please try again.");
    }
  }, [setSelectedPoint, startSunlightAnalysis, updateCameraToFaceSun]);

  // Set up location updates
  useEffect(() => {
    let locationSubscription;
    
    // Only set up location tracking if we're not already manually navigating
    // AND we're not in analysis mode
    if (!isManuallyNavigating && !isAnalysisMode) {
      (async () => {
        try {
          // Check if permissions were already granted
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            // We don't need to request permissions here - App.js already did that
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
                
                // Only update user location
                setUserLocation(newLocation);
                
                // Only update general location if we're not in analysis mode
                if (!isAnalysisMode) {
                  setLocation(newLocation);
                }
              }
            }
          );
        } catch (error) {
          // Handle error silently
        }
      })();
    }
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isManuallyNavigating, isAnalysisMode]); // Add isAnalysisMode as dependency

  // Direct function to handle location button press
  const handleLocationButtonPress = useCallback(() => {
    // We now prioritize the location state since it's updated from both initial and watch position
    const targetLocation = location || userLocation || [4.9041, 52.3676]; // Fallback to Amsterdam
    
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
    
    // Set camera to user location with a higher zoom level for better visibility
    flyToLocation(finalLocation);
  }, [location, userLocation, flyToLocation]);

  // Effect to update camera when shouldUpdateCamera flag changes in analysis mode
  useEffect(() => {
    if (isAnalysisMode && shouldUpdateCamera && analysisPointRef.current) {
      // Always ensure the selected point matches our stored analysis point
      // This ensures we're analyzing the correct location after time changes
      setSelectedPoint([...analysisPointRef.current]);
    }
  }, [isAnalysisMode, shouldUpdateCamera, setSelectedPoint]);

  // Toggle building points visibility
  const toggleBuildingPoints = useCallback(() => {
    setShowBuildingPoints(!showBuildingPoints);
  }, [showBuildingPoints, setShowBuildingPoints]);

  // Handle search focus
  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
  }, []);

  // Handle tap on map to dismiss search
  const handleMapPress = useCallback(() => {
    if (isSearchFocused || showSearchResults) {
      Keyboard.dismiss();
      setShowSearchResults(false);
      setIsSearchFocused(false);
    }
  }, [isSearchFocused, showSearchResults]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/danekoenders/cm9b9z6vk003401r3as94c641"
          onMapIdle={onCenterChanged}
          onCameraChanged={onCenterChanged}
          logoEnabled={false}
          pitchEnabled={true}
          onDidFinishLoadingMap={onMapReady}
          onMapLoadingError={(error) => {
            setMapLoading(false);
            // Handle error if needed
          }}
          onPress={handleMapPress}
        >
          <MapboxGL.Camera 
            key={`camera-${cameraKey}`}
            {...cameraProps}
            followUserLocation={false}
            followUserMode="normal"
            followPitch={60}
            followZoomLevel={cameraProps.zoomLevel || 16}
            followHeading={cameraProps.heading}
            animationMode={cameraProps.animationMode || 'flyTo'}
            animationDuration={cameraProps.animationDuration || 1000}
          />

          {/* Directional Light for the Sun */}
          {isAnalysisMode && (
            <MapboxGL.Light 
              style={{
                anchor: 'viewport',
                // Convert bearing and altitude to light position
                // Format is [radial distance, azimuth angle, polar angle]
                // Where:
                // - radial distance is typically 1-1.5
                // - azimuth is the bearing
                // - polar angle is 90-altitude (0° = directly above, 90° = horizon)
                position: [
                  1.15, // radial distance (standard value)
                  bearingFromNorth, // azimuth - use our sun bearing
                  Math.max(10, 90 - sunAltitudeDeg) // polar angle - convert altitude to polar angle
                ],
                color: "rgba(255, 255, 255, 1.0)", // white light as rgba
                intensity: 0.9, // bright light for better visibility
              }}
            />
          )}

          {/* User Location Puck */}
          <MapboxGL.LocationPuck
            visible={true}
            puckBearing="heading"
            puckBearingEnabled={true}
            pulsing={{
              isEnabled: true,
              radius: 'accuracy'
            }}
          />

          {/* Building Point Annotations */}
          {showBuildingPoints && cachedBuildings && cachedBuildings.length > 0 && (
            <MapboxGL.ShapeSource
              id="buildingsSource"
              shape={{
                type: "FeatureCollection",
                features: cachedBuildings.map(building => {
                  // Create a point at the center of the building polygon
                  const center = turf.center(building);
                  return {
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: center.geometry.coordinates,
                    },
                    properties: {
                      id: building.id || Math.random().toString(36).substring(7),
                      height: building.properties.height || 15,
                    },
                  };
                }),
              }}
            >
              <MapboxGL.CircleLayer
                id="buildingsCircleLayer"
                style={{
                  circleRadius: 4,
                  circleColor: "rgba(0, 128, 255, 0.8)",
                  circleStrokeWidth: 1,
                  circleStrokeColor: "white",
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* 3D Ray Segments - Only shown when in shadow */}
          {isAnalysisMode && isInShadow && raySegments && raySegments.length > 0 && (
            <MapboxGL.ShapeSource
              id="raySegmentsSource"
              shape={{
                type: "FeatureCollection",
                features: raySegments,
              }}
            >
              <MapboxGL.FillExtrusionLayer
                id="raySegmentsLayer"
                style={{
                  fillExtrusionColor: Colors.shadow,
                  fillExtrusionOpacity: 0.7,
                  fillExtrusionBase: ["get", "base"],
                  fillExtrusionHeight: ["get", "height"],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Sun Position Indicator - Only shown when in sunlight */}
          {isAnalysisMode && !isInShadow && (
            <>
              {/* Sun position azimuth line */}
              <MapboxGL.ShapeSource
                id="sunPositionSource"
                shape={useSunlight().sunPositionIndicator || {
                  type: "FeatureCollection",
                  features: []
                }}
              >
                <MapboxGL.LineLayer
                  id="sunPositionLine"
                  style={{
                    lineColor: "rgba(255,215,0,0.8)",
                    lineWidth: 3,
                    lineDasharray: [2, 2]
                  }}
                />
              </MapboxGL.ShapeSource>

              {/* Direct ray to sun (3D visualization) */}
              {useSunlight().directSunRay && useSunlight().directSunRay.length > 0 && (
                <MapboxGL.ShapeSource
                  id="directSunRaySource"
                  shape={{
                    type: "FeatureCollection",
                    features: useSunlight().directSunRay,
                  }}
                >
                  <MapboxGL.FillExtrusionLayer
                    id="directSunRayLayer"
                    style={{
                      fillExtrusionColor: "rgba(255,215,0,0.8)",
                      fillExtrusionOpacity: 0.8,
                      fillExtrusionBase: ["get", "base"],
                      fillExtrusionHeight: ["get", "height"],
                    }}
                  />
                </MapboxGL.ShapeSource>
              )}
            </>
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

          {/* Visualize buildings found in radius */}
          <BuildingMarkers />
          
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
              userLocation={userLocation}
              onFocus={handleSearchFocus}
            />

            {showSearchResults && (
              <TouchableWithoutFeedback onPress={(event) => event.stopPropagation()}>
                <View>
                  <SearchResults
                    results={searchResults}
                    onSelectPlace={(place) => {
                      handleSelectPlace(place);
                      Keyboard.dismiss();
                      setIsSearchFocused(false);
                    }}
                  />
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        )}

        {/* Exit analysis mode button */}
        {isAnalysisMode && <ExitButton onExit={exitSunlightAnalysis} />}

        {/* Building points toggle button */}
        {isAnalysisMode && cachedBuildings && cachedBuildings.length > 0 && (
          <TouchableOpacity 
            style={styles.buildingsToggleButton}
            onPress={toggleBuildingPoints}
          >
            <Text style={styles.buildingsToggleText}>
              {showBuildingPoints ? "Hide Buildings" : "Show Buildings"}
            </Text>
          </TouchableOpacity>
        )}

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
              <Text style={styles.pinIcon}>{isInShadow ? "☁️" : "☀️"}</Text>
            </View>
          </View>
        )}

        {/* Check Sunlight button */}
        {(showCenterPointer || currentZoom >= 18 ) && !isAnalysisMode && (
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
              {showCenterPointer || currentZoom >= 18 ? (
                <Text style={styles.panelText}>
                  Move closer to a terrace and tap "Check Sunlight"
                </Text>
              ) : (
                <Text style={styles.panelText}>
                  Zoom in closer to check sunlight on terraces
                </Text>
              )}
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
    backgroundColor: Colors.white,
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
  buildingsToggleButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    ...Shadows.small,
    backgroundColor: Colors.white, // Explicit background color for shadow
  },
  buildingsToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray,
  },
});

export default MapScreen;
