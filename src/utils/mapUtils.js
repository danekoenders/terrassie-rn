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
 * Get map features around a point using Mapbox Tilequery API
 * 
 * @param {Object} mapRef - Reference to the Mapbox GL map instance (not used in API approach)
 * @param {Array} center - [longitude, latitude] coordinates
 * @param {Array} layers - Array of layer ids to query (optional)
 * @returns {Promise<Array>} Promise resolving to array of features
 */
export const getMapFeaturesAround = async (mapRef, center, layers = ['building']) => {
  if (!center || !Array.isArray(center) || center.length !== 2) {
    return [];
  }
  
  try {
    // Use Mapbox's Tilequery API to get building data
    // mapbox.mapbox-streets-v8 is Mapbox's standard dataset that includes building data
    const tilesetId = 'mapbox.mapbox-streets-v8';
    const longitude = center[0];
    const latitude = center[1];
    const radius = 1000; // 1km radius around the point
    const limit = 50;   // Increase limit to get more buildings in the radius
    
    const endpoint = `https://api.mapbox.com/v4/${tilesetId}/tilequery/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&radius=${radius}&limit=${limit}&layers=building&geometry=polygon`;
    
    // Add a timeout to the fetch to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(endpoint, { 
        signal: controller.signal 
      });
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return []; // Return empty array on error
      }
      
      const data = await response.json();
      
      if (data.features && Array.isArray(data.features)) {
        // Extract height information from properties if available
        const processedFeatures = data.features.map(feature => {
          // If height property doesn't exist, try to estimate based on feature properties
          if (!feature.properties.height) {
            const levels = feature.properties.levels || feature.properties.building_levels;
            // Estimate height based on levels if available (approx 3m per level)
            if (levels) {
              feature.properties.height = levels * 3;
            } else if (feature.properties.building) {
              // Default height for buildings without specific height data
              feature.properties.height = 15; // Average 5-story building
            }
          }
          return feature;
        });
        
        return processedFeatures;
      } else {
        return [];
      }
    } catch (fetchError) {
      // Clear timeout if error occurs
      clearTimeout(timeoutId);
      return [];
    }
  } catch (error) {
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