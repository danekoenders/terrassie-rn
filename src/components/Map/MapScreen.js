import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Text } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSunlight } from '../../context/SunlightContext';
import { flyToLocation } from '../../utils/mapUtils';
import { Colors, Shadows } from '../../styles/common';

// Import components
import CenterPointer from './CenterPointer';
import CheckSunlightButton from './CheckSunlightButton';
import { SearchBar } from '../Search/SearchBar';
import { SearchResults } from '../Search/SearchResults';
import { ExitButton } from '../Analysis/ExitButton';
import { TimeSlider } from '../Analysis/TimeSlider';
import { AnalysisPanel } from '../Analysis/AnalysisPanel';

const MapScreen = ({ location }) => {
  const mapRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isCameraSystemMove, setIsCameraSystemMove] = useState(false);
  const [showCenterPointer, setShowCenterPointer] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [cameraProps, setCameraProps] = useState({
    centerCoordinate: location,
    zoomLevel: 17,
    pitch: 60,
    heading: -45,
    animationDuration: 1000
  });
  
  const { 
    selectedPoint, 
    setSelectedPoint, 
    rayCoords,
    blockerFeature,
    intersectionPoint,
    isInShadow,
    isAnalysisMode,
    sunAltitudeDeg,
    bearingFromNorth,
    startSunlightAnalysis,
    exitSunlightAnalysis
  } = useSunlight();
  
  // Initialize map with user location
  useEffect(() => {
    if (location && isMapReady) {
      const coords = Array.isArray(location) ? location : [location.longitude, location.latitude];
      setCameraProps(prev => ({
        ...prev,
        centerCoordinate: coords,
        animationDuration: 1000
      }));
      setSelectedPoint(coords);
    }
  }, [location, isMapReady]);
  
  // Handle map load completion
  const onMapReady = () => {
    setIsMapReady(true);
    onCenterChanged();
  };
  
  // Get center coordinates of the map view
  const onCenterChanged = async () => {
    if (!mapRef.current || !isMapReady) return;
    
    try {
      const center = await mapRef.current.getCenter();
      setSelectedPoint(center);
      
      // If the camera move wasn't initiated by the system and we're in analysis mode
      if (!isCameraSystemMove && isAnalysisMode) {
        // Exit analysis mode if user manually moves the camera
        exitSunlightAnalysis();
      }
      
      // Get current zoom level to determine if we should show the center pointer
      const zoom = await mapRef.current.getZoom();
      setShowCenterPointer(zoom >= 17);
      
    } catch (error) {
      console.error("Error getting center:", error);
    }
  };
  
  // Fly to any location with animation
  const flyToLocation = (coords) => {
    if (!isMapReady) {
      console.warn('Map not ready');
      return;
    }

    try {
      const targetCoords = Array.isArray(coords) ? coords : [coords.longitude, coords.latitude];
      setCameraProps(prev => ({
        ...prev,
        centerCoordinate: targetCoords,
        animationDuration: 1000
      }));
    } catch (error) {
      console.warn('Error flying to location:', error);
    }
  };
  
  // Update camera to face the sun direction
  const updateCameraToFaceSun = () => {
    if (!selectedPoint) return;
    
    // Mark this as a system-initiated camera move
    setIsCameraSystemMove(true);
    
    // Update camera to face the sun's azimuth
    setCameraProps(prev => ({
      ...prev,
      centerCoordinate: selectedPoint,
      heading: bearingFromNorth,
      pitch: 60,
      animationDuration: 500
    }));
    
    // Reset the flag after camera movement is complete
    setTimeout(() => {
      setIsCameraSystemMove(false);
    }, 600);
  };
  
  // Update search results
  const updateSearchResults = (results) => {
    setSearchResults(results);
    setShowSearchResults(results.length > 0);
  };
  
  // Handle selecting a place from search results
  const handleSelectPlace = (place) => {
    if (!place || !place.geometry || !place.geometry.coordinates) return;
    
    const [longitude, latitude] = place.geometry.coordinates;
    const newLocation = [longitude, latitude];
    
    // Update selected point
    setSelectedPoint(newLocation);
    
    // Fly to the location
    flyToLocation(newLocation, 18);
    
    // Clear search results
    setSearchResults([]);
    setShowSearchResults(false);
  };
  
  // Handle check sunlight button press
  const handleCheckSunlight = () => {
    startSunlightAnalysis(mapRef.current);
    updateCameraToFaceSun();
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/danekoenders/cm8824x5800b901qr2tt8e6pz"
          onRegionDidChange={onCenterChanged}
          logoEnabled={false}
          pitchEnabled={true}
          onDidFinishLoadingMap={onMapReady}
        >
          <MapboxGL.Camera
            {...cameraProps}
          />
          
          <MapboxGL.UserLocation visible={true} />
          
          {/* Light that mimics the sun */}
          <MapboxGL.Light
            style={{
              anchor: 'map',
              position: [1.5, bearingFromNorth, 90 - sunAltitudeDeg],
              color: sunAltitudeDeg > 0 ? '#fdb' : '#555',
              intensity: Math.max(0.3, Math.min(0.8, sunAltitudeDeg / 45))
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

          {/* Intersection point marker */}
          {intersectionPoint && (
            <MapboxGL.ShapeSource id="intersectionSource" shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: intersectionPoint
              },
              properties: {}
            }}>
              <MapboxGL.CircleLayer
                id="intersectionCircle"
                style={{
                  circleRadius: 6,
                  circleColor: 'red',
                  circleStrokeWidth: 2,
                  circleStrokeColor: 'white'
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

        {/* UI Overlays */}
        
        {/* Top search bar and location button */}
        {!isAnalysisMode && (
          <View style={styles.topContainer}>
            <SearchBar 
              onUpdateResults={updateSearchResults}
              onFlyToUserLocation={() => flyToLocation(location, 18)}
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
        {isAnalysisMode && (
          <ExitButton onExit={exitSunlightAnalysis} />
        )}
        
        {/* Center pointer for selecting a point */}
        {showCenterPointer && !isAnalysisMode && (
          <CenterPointer />
        )}
        
        {/* Center pin marker in analysis mode */}
        {isAnalysisMode && (
          <View style={styles.centerPinMarker} pointerEvents="none">
            <View style={[
              styles.analyzedPin,
              isInShadow ? styles.shadowPin : styles.sunPin
            ]}>
              <Text style={styles.pinIcon}>
                {isInShadow ? '🌥️' : '☀️'}
              </Text>
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
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  centerPinMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    zIndex: 10,
  },
  analyzedPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadows.medium,
  },
  pinIcon: {
    fontSize: 20,
  },
  sunPin: {
    backgroundColor: 'rgba(255, 215, 0, 0.7)',
  },
  shadowPin: {
    backgroundColor: 'rgba(110, 123, 139, 0.7)',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.medium,
  },
  minimalPanel: {
    alignItems: 'center',
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
});

export default MapScreen; 