import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  calculateSunPosition, 
  calculateSunriseSunset, 
  formatTimeFromDecimal,
  checkShadow,
  checkShadowWith3DRay,
  createRay3DSegments,
  calculate3DDestinationPoint
} from '../utils/sunCalculations';
import { getMapFeaturesAround } from '../utils/mapUtils';
import * as turf from '@turf/turf';

// Create context
const SunlightContext = createContext();

// Custom hook to use the sunlight context
export const useSunlight = () => useContext(SunlightContext);

export const SunlightProvider = ({ children }) => {
  // Date and time state
  const [date, setDate] = useState(new Date());
  const [hour, setHour] = useState(new Date().getHours());
  const [minute, setMinute] = useState(new Date().getMinutes());
  const [timeValue, setTimeValue] = useState(new Date().getHours() + (new Date().getMinutes() / 60));
  const [exactTimeString, setExactTimeString] = useState('');
  
  // Sun position state
  const [sunPos, setSunPos] = useState(null);
  const [bearingFromNorth, setBearingFromNorth] = useState(0);
  const [sunAltitudeDeg, setSunAltitudeDeg] = useState(0);
  const [sunriseTime, setSunriseTime] = useState(null);
  const [sunsetTime, setSunsetTime] = useState(null);
  const [sunriseHour, setSunriseHour] = useState(6);
  const [sunsetHour, setSunsetHour] = useState(18);
  
  // Analysis state
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isInShadow, setIsInShadow] = useState(null);
  const [rayCoords, setRayCoords] = useState(null);
  const [raySegments, setRaySegments] = useState(null);
  const [blockerFeature, setBlockerFeature] = useState(null);
  const [intersectionPoint, setIntersectionPoint] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  
  // Add state to cache building features
  const [cachedBuildings, setCachedBuildings] = useState(null);
  const [cachedBuildingPoint, setCachedBuildingPoint] = useState(null);
  
  // Add state to store building data for visualization
  const [buildingsForDisplay, setBuildingsForDisplay] = useState([]);
  
  // Store a reference to the map
  const [activeMapRef, setActiveMapRef] = useState(null);
  
  // Add a callback for camera updates
  const [shouldUpdateCamera, setShouldUpdateCamera] = useState(false);
  
  // Add a flag to control visibility of building points
  const [showBuildingPoints, setShowBuildingPoints] = useState(true);
  
  // Reset analysis state to ensure it doesn't get stuck
  useEffect(() => {
    setAnalyzing(false);
    setIsAnalysisMode(false);
  }, []);
  
  // Update exact time string when hour or minute changes
  useEffect(() => {
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');
    setExactTimeString(`${hourStr}:${minuteStr}`);
    
    // Update timeValue for slider
    setTimeValue(hour + (minute / 60));
  }, [hour, minute]);
  
  // Calculate sun position when time or selected point changes
  useEffect(() => {
    if (selectedPoint) {
      calculateSunPositionForPoint();
    }
  }, [hour, minute, selectedPoint]);
  
  // Initialize sunrise/sunset times when location changes
  useEffect(() => {
    if (selectedPoint) {
      calculateSunriseSunsetTimes();
    }
  }, [selectedPoint, date]);
  
  /**
   * Calculate sun position for the currently selected point
   * and update ray tracing if in analysis mode
   */
  const calculateSunPositionForPoint = () => {
    if (!selectedPoint) return;
    
    // Create a new date with the current date and exact hour/minute
    const dateWithTime = new Date(date);
    dateWithTime.setHours(hour, minute, 0, 0);
    
    // Get sun position using utility function
    const result = calculateSunPosition(dateWithTime, selectedPoint);
    if (!result) return;
    
    const { sunPosition, bearing, altitudeDeg } = result;
    
    setSunPos(sunPosition);
    setBearingFromNorth(bearing);
    setSunAltitudeDeg(altitudeDeg);
    
    // We no longer calculate rayCoords here as we'll only use 3D ray segments
    // for unified ray tracing and visualization
    setRayCoords(null);
    
    // If we're in analysis mode, update the ray tracing with the new sun position
    // This ensures the ray updates when the time slider changes
    if (isAnalysisMode && cachedBuildings && !analyzing) {
      // Use a timeout to ensure state updates have happened
      setTimeout(() => {
        // Use cached buildings instead of fetching from API again
        updateShadowCalculation(cachedBuildings);
      }, 50);
    }
  };
  
  /**
   * Calculate sunrise and sunset times for the selected point
   */
  const calculateSunriseSunsetTimes = () => {
    if (!selectedPoint) return;
    
    const result = calculateSunriseSunset(date, selectedPoint);
    if (!result) return;
    
    const { sunriseTime: sunrise, sunsetTime: sunset, sunriseHour: riseHour, sunsetHour: setHour } = result;
    
    setSunriseTime(sunrise);
    setSunsetTime(sunset);
    setSunriseHour(riseHour);
    setSunsetHour(setHour);
  };
  
  /**
   * Update shadow calculation using already fetched building data
   * @param {Array} buildingFeatures - Building features to use for calculation
   */
  const updateShadowCalculation = (buildingFeatures) => {
    console.log(`Recalculating shadows at time ${exactTimeString} with sun at bearing ${bearingFromNorth.toFixed(1)}° and altitude ${sunAltitudeDeg.toFixed(1)}°`);
    console.log(`Using ${buildingFeatures ? buildingFeatures.length : 0} cached buildings`);
    
    // Perform 3D ray tracing shadow check with the building data
    const shadowResult = checkShadowWith3DRay(
      selectedPoint, 
      bearingFromNorth, 
      sunAltitudeDeg, 
      buildingFeatures
    );
    
    console.log(`Ray tracing result: ${shadowResult.isInShadow ? 'IN SHADOW' : 'IN SUNLIGHT'}`);
    
    // Update state with results
    setIsInShadow(shadowResult.isInShadow);
    setBlockerFeature(shadowResult.blockerFeature);
    setIntersectionPoint(shadowResult.intersectionPoint);
    setRaySegments(shadowResult.raySegments);
  };
  
  /**
   * Check if the selected point is in shadow using enhanced 3D ray tracing
   * @param {Object} mapRef - Reference to the map instance
   * @param {boolean} skipAnalyzing - Whether to skip setting analyzing state (for auto-updates)
   */
  const checkSunlightForPoint = async (mapRef, skipAnalyzing = false) => {
    if ((!mapRef || !selectedPoint) && !skipAnalyzing) {
      return;
    }
    
    // Safety timeout to ensure analyzing state doesn't get stuck
    let safetyTimeoutId = null;
    
    if (!skipAnalyzing) {
      setAnalyzing(true);
      setIntersectionPoint(null);
      setRaySegments(null);
      setRayCoords(null); // Clear 2D ray coords since we're only using 3D segments
      
      // Set a safety timeout to reset analyzing state after 15 seconds
      safetyTimeoutId = setTimeout(() => {
        setAnalyzing(false);
      }, 15000);
    }
    
    try {
      // Check if we already have cached buildings for this location (within ~10m)
      const shouldFetchBuildings = !cachedBuildingPoint || 
        !selectedPoint || 
        turf.distance(
          cachedBuildingPoint, 
          selectedPoint, 
          { units: 'meters' }
        ) > 10;
      
      let buildingFeatures;
      
      if (shouldFetchBuildings) {
        // Get building features within 1km radius using Mapbox Tilequery API
        console.log(`Fetching buildings for point [${selectedPoint[0].toFixed(5)}, ${selectedPoint[1].toFixed(5)}]`);
        buildingFeatures = await getMapFeaturesAround(mapRef, selectedPoint);
        console.log(`Retrieved ${buildingFeatures ? buildingFeatures.length : 0} buildings from Mapbox Tilequery API`);
        
        // Create visualization features for each building
        const buildingVisualizations = [];
        
        if (buildingFeatures && buildingFeatures.length > 0) {
          buildingFeatures.forEach((feature, index) => {
            try {
              if (feature.geometry && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) {
                // Add center point for each building
                const center = turf.center(feature);
                const height = feature.properties.height || feature.properties.render_height || 
                              (feature.properties.building ? 15 : 0);
                
                buildingVisualizations.push({
                  id: `building-center-${index}`,
                  type: 'center',
                  coordinates: center.geometry.coordinates,
                  height: height
                });
                
                // Add polygon outline for each building
                buildingVisualizations.push({
                  id: `building-outline-${index}`,
                  type: 'outline',
                  geometry: feature.geometry,
                  height: height
                });
              }
            } catch (error) {
              console.log(`Error creating visualization for building: ${error.message}`);
            }
          });
        }
        
        // Store the visualizations
        setBuildingsForDisplay(buildingVisualizations);
        
        // Log the buildings found
        console.log(`Found ${buildingFeatures.length} buildings around ${selectedPoint}`);
        
        // Log building details for ray tracing
        console.log("Starting ray tracing with these building parameters:");
        console.log(`Sun altitude: ${sunAltitudeDeg}°, bearing: ${bearingFromNorth}°`);
        
        if (buildingFeatures.length > 0) {
          // Log a few sample buildings
          const sampleSize = Math.min(3, buildingFeatures.length);
          for (let i = 0; i < sampleSize; i++) {
            const building = buildingFeatures[i];
            console.log(`Building ${i}:`);
            console.log(`- Height: ${building.properties.height}m`);
            console.log(`- Coordinates: Polygon with ${building.geometry.coordinates[0].length} points`);
          }
        }
        
        // Cache the building features and location for future use
        setCachedBuildings(buildingFeatures);
        setCachedBuildingPoint(selectedPoint);
      } else {
        // Use cached buildings if available and we're at the same location
        buildingFeatures = cachedBuildings;
        console.log(`Using ${buildingFeatures ? buildingFeatures.length : 0} cached buildings for ray tracing`);
      }
      
      // Ensure features is always an array
      const validFeatures = buildingFeatures || [];
      
      console.log(`Performing shadow analysis with ${validFeatures.length} buildings...`);
      
      // Perform 3D ray tracing shadow check with the building data
      const shadowResult = checkShadowWith3DRay(
        selectedPoint, 
        bearingFromNorth, 
        sunAltitudeDeg, 
        validFeatures
      );
      
      // Log the shadow analysis result
      console.log(`Shadow analysis result: ${shadowResult.isInShadow ? 'IN SHADOW' : 'IN SUNLIGHT'}`);
      if (shadowResult.isInShadow && shadowResult.blockerFeature) {
        console.log(`Blocking building height: ${shadowResult.blockerFeature.properties.height}m`);
      }
      
      // Update state with results
      setIsInShadow(shadowResult.isInShadow);
      setBlockerFeature(shadowResult.blockerFeature);
      setIntersectionPoint(shadowResult.intersectionPoint);
      setRaySegments(shadowResult.raySegments);
      
    } catch (error) {
      console.error("Error in shadow analysis:", error);
      
      // Fall back to basic ray without shadow detection
      try {
        // When building data can't be fetched, create a simple ray without intersections
        if (sunAltitudeDeg > 0) {
          const rayEnd = calculate3DDestinationPoint(
            selectedPoint, 
            0.5, // 500m ray
            bearingFromNorth, 
            sunAltitudeDeg
          );
          
          const segments = createRay3DSegments(
            selectedPoint,
            rayEnd.position,
            0,
            rayEnd.elevation
          );
          
          setRaySegments(segments);
          setIsInShadow(false);
          setBlockerFeature(null);
          setIntersectionPoint(null);
        } else {
          // Night time - no rays
          setRaySegments(null);
          setRayCoords(null);
          setIsInShadow(true);
          setBlockerFeature(null);
          setIntersectionPoint(null);
        }
      } catch (fallbackError) {
        // Set safe default values in case of error
        setIsInShadow(false);
        setBlockerFeature(null);
        setIntersectionPoint(null);
        setRaySegments(null);
        setRayCoords(null);
      }
    } finally {
      if (!skipAnalyzing) {
        // Clear safety timeout since we're finishing now
        if (safetyTimeoutId) {
          clearTimeout(safetyTimeoutId);
        }
        
        setAnalyzing(false);
      }
    }
  };
  
  /**
   * Handle time slider change
   * @param {number} value - Time value in decimal hours
   * @param {boolean} updateCamera - Whether to also update the camera position
   */
  const handleTimeChange = (value, updateCamera = false) => {
    // Clamp value between sunrise and sunset
    const clampedValue = Math.max(sunriseHour, Math.min(sunsetHour, value));
    setTimeValue(clampedValue);
    
    // Extract hours and minutes
    const h = Math.floor(clampedValue);
    const m = Math.round((clampedValue - h) * 60);
    
    // Update time state
    setHour(h);
    setMinute(m);
    
    // Set the flag to update camera if requested
    setShouldUpdateCamera(updateCamera);
  };
  
  /**
   * Start sunlight analysis mode
   * @param {Object} mapRef - Reference to the map instance
   * @param {boolean} updateCamera - Whether to update camera position
   */
  const startSunlightAnalysis = async (mapRef, updateCamera = false) => {
    if (!selectedPoint) {
      return;
    }
    
    if (!mapRef) {
      return;
    }
    
    try {
      // Store the map reference for future updates
      setActiveMapRef(mapRef);
      setIsAnalysisMode(true);
      await checkSunlightForPoint(mapRef);
      
      // Return updateCamera flag for the caller to use
      return updateCamera;
    } catch (error) {
      // Ensure we exit analysis mode and reset analyzing state
      setIsAnalysisMode(false);
      setAnalyzing(false);
      return false;
    }
  };
  
  /**
   * Exit sunlight analysis mode and clear all visualization elements
   */
  const exitSunlightAnalysis = () => {
    setIsAnalysisMode(false);
    
    // Clear all visualizations
    setRaySegments(null);
    setRayCoords(null);
    setBlockerFeature(null);
    setIntersectionPoint(null);
    
    // Reset to current time
    const now = new Date();
    setHour(now.getHours());
    setMinute(now.getMinutes());
    setTimeValue(now.getHours() + (now.getMinutes() / 60));
  };
  
  // Create context value with state and functions
  const value = {
    // Time and date state
    date,
    setDate,
    hour,
    setHour,
    minute,
    setMinute,
    timeValue,
    setTimeValue,
    exactTimeString,
    
    // Sun position state
    sunPos,
    bearingFromNorth,
    sunAltitudeDeg,
    sunriseTime,
    sunsetTime,
    sunriseHour,
    sunsetHour,
    
    // Analysis state
    selectedPoint,
    setSelectedPoint,
    isInShadow,
    rayCoords,
    raySegments,
    blockerFeature,
    intersectionPoint,
    analyzing,
    isAnalysisMode,
    shouldUpdateCamera,
    setShouldUpdateCamera,
    
    // Building data
    cachedBuildings,
    showBuildingPoints,
    setShowBuildingPoints,
    
    // Functions
    calculateSunPositionForPoint,
    calculateSunriseSunsetTimes,
    checkSunlightForPoint,
    handleTimeChange,
    startSunlightAnalysis,
    exitSunlightAnalysis,
    formatTimeFromDecimal,
  };

  return (
    <SunlightContext.Provider value={value}>
      {children}
    </SunlightContext.Provider>
  );
}; 