import MapboxGL from '@rnmapbox/maps';

// Store the access token directly
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGFuZWtvZW5kZXJzIiwiYSI6ImNtODdvNzczZDA4dmcybHF1cnltZmVkbTQifQ.aiCVa0540JxdEivA-rlDTQ';

/**
 * Search for locations using Mapbox Geocoding API
 * 
 * @param {string} query - Search query text
 * @returns {Promise<Array>} Promise resolving to array of place features
 */
export const searchMapboxLocations = async (query) => {
  if (!query || query.length < 3) {
    return [];
  }
  
  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`;
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.features) {
      return data.features;
    }
    return [];
  } catch (error) {
    console.error("Error searching for location:", error);
    return [];
  }
};

/**
 * Get map features around a point
 * 
 * @param {Object} mapRef - Reference to the Mapbox GL map instance
 * @param {Array} center - [longitude, latitude] coordinates
 * @param {Array} layers - Array of layer ids to query
 * @returns {Promise<Array>} Promise resolving to array of features
 */
export const getMapFeaturesAround = async (mapRef, center, layers = ['building', '3d-buildings']) => {
  if (!mapRef || !center) {
    return [];
  }
  
  try {
    // Query rendered features in the viewport
    const features = await mapRef.queryRenderedFeaturesInRect([], null, layers);
    
    // The error is likely happening because the result isn't directly iterable
    // Ensure we're returning a proper array
    if (features && typeof features.forEach === 'function') {
      // It's already an array-like object with forEach, so we can convert it to an array
      return Array.from(features);
    } else if (features && features.features && Array.isArray(features.features)) {
      // It may be a GeoJSON FeatureCollection
      return features.features;
    } else if (features) {
      // Try converting to array if it's iterable
      try {
        return Array.from(features);
      } catch (err) {
        // If that fails, return an empty array
        console.error("Error converting features to array:", err);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("Error getting map features:", error);
    return [];
  }
};

/**
 * Fly to a location on the map with animation
 * 
 * @param {Object} mapRef - Reference to the Mapbox GL map instance
 * @param {Array} coords - [longitude, latitude] coordinates to fly to
 * @param {number} duration - Animation duration in milliseconds
 * @param {number} zoom - Target zoom level
 * @param {number} bearing - Optional bearing angle in degrees
 * @param {number} pitch - Optional pitch angle in degrees
 * @returns {Promise} Promise that resolves when animation completes
 */
export const flyToLocation = (mapRef, coords, duration = 1000, zoom = 16, bearing, pitch) => {
  if (!mapRef || !coords) {
    return Promise.reject(new Error('Invalid mapRef or coordinates'));
  }
  
  return mapRef.flyTo(
    coords,
    duration,
    zoom,
    bearing,
    pitch
  );
};

/**
 * Get user's current geographical position
 * 
 * @returns {Promise<Array>} Promise resolving to [longitude, latitude] coordinates
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.longitude, position.coords.latitude]);
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}; 