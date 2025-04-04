import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  calculateSunPosition, 
  calculateSunriseSunset, 
  calculateRayCoordinates, 
  formatTimeFromDecimal,
  checkShadow
} from '../utils/sunCalculations';
import { getMapFeaturesAround } from '../utils/mapUtils';

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
  const [blockerFeature, setBlockerFeature] = useState(null);
  const [intersectionPoint, setIntersectionPoint] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  
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
    
    // Calculate ray coordinates for visualization
    const rays = calculateRayCoordinates(selectedPoint, bearing, intersectionPoint, isInShadow);
    setRayCoords(rays);
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
   * Check if the selected point is in shadow
   * @param {Object} mapRef - Reference to the map instance
   * @param {boolean} skipAnalyzing - Whether to skip setting analyzing state (for auto-updates)
   */
  const checkSunlightForPoint = async (mapRef, skipAnalyzing = false) => {
    if ((!mapRef || !selectedPoint) && !skipAnalyzing) {
      return;
    }
    
    if (!skipAnalyzing) {
      setAnalyzing(true);
      setIntersectionPoint(null);
    }
    
    try {
      // Get map features to check for shadows
      const features = await getMapFeaturesAround(mapRef, selectedPoint);
      
      if (!features || (Array.isArray(features) && features.length === 0)) {
        setIsInShadow(false);
        setBlockerFeature(null);
        setIntersectionPoint(null);
        
        // Update ray visualization without intersection point
        const rays = calculateRayCoordinates(
          selectedPoint, 
          bearingFromNorth, 
          null, 
          false
        );
        setRayCoords(rays);
        return;
      }
      
      // Check shadow using utility function
      const shadowResult = checkShadow(selectedPoint, bearingFromNorth, sunAltitudeDeg, features);
      
      setIsInShadow(shadowResult.isInShadow);
      setBlockerFeature(shadowResult.blockerFeature);
      setIntersectionPoint(shadowResult.intersectionPoint);
      
      // Update ray visualization with intersection point if found
      const rays = calculateRayCoordinates(
        selectedPoint, 
        bearingFromNorth, 
        shadowResult.intersectionPoint, 
        shadowResult.isInShadow
      );
      setRayCoords(rays);
    } catch (error) {
      console.error("Error checking sunlight:", error);
      // Set safe default values in case of error
      setIsInShadow(false);
      setBlockerFeature(null);
      setIntersectionPoint(null);
      
      // Update ray visualization without intersection point
      const rays = calculateRayCoordinates(
        selectedPoint, 
        bearingFromNorth, 
        null, 
        false
      );
      setRayCoords(rays);
    } finally {
      if (!skipAnalyzing) {
        setAnalyzing(false);
      }
    }
  };
  
  /**
   * Handle time slider change
   * @param {number} value - Time value in decimal hours
   */
  const handleTimeChange = (value) => {
    // Clamp value between sunrise and sunset
    const clampedValue = Math.max(sunriseHour, Math.min(sunsetHour, value));
    setTimeValue(clampedValue);
    
    // Extract hours and minutes
    const h = Math.floor(clampedValue);
    const m = Math.round((clampedValue - h) * 60);
    
    // Update time state
    setHour(h);
    setMinute(m);
  };
  
  /**
   * Start sunlight analysis mode
   * @param {Object} mapRef - Reference to the map instance
   */
  const startSunlightAnalysis = async (mapRef) => {
    if (!selectedPoint) {
      return;
    }
    
    if (!mapRef) {
      return;
    }
    
    try {
      setIsAnalysisMode(true);
      await checkSunlightForPoint(mapRef);
    } catch (error) {
      console.error("Error starting sunlight analysis:", error);
      // Ensure we exit analysis mode if there's an error
      setIsAnalysisMode(false);
    }
  };
  
  /**
   * Exit sunlight analysis mode
   */
  const exitSunlightAnalysis = () => {
    setIsAnalysisMode(false);
    
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
    blockerFeature,
    intersectionPoint,
    analyzing,
    isAnalysisMode,
    
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