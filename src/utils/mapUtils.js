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
export const getMapFeaturesAround = async (mapRef, center, layers = ['building-extrusion']) => {
  if (!mapRef || !center) {
    return [];
  }
  
  try {
    // Get the current zoom level for proper scaling
    const zoom = await mapRef.getZoom();
    
    // Calculate bounding box around center point
    // We'll use a distance that varies based on zoom level
    const distance = 50 / Math.pow(2, zoom - 10); // meters, scaled by zoom
    
    // Use a simple approach with a bounding box
    const [lng, lat] = center;
    
    // Approximately convert meters to degrees
    // This is simplified and works best near the equator
    const latMeterInDegrees = 1 / 111000; // 1 meter in degrees latitude
    const lngMeterInDegrees = 1 / (111000 * Math.cos((lat * Math.PI) / 180)); // 1 meter in degrees longitude
    
    const latDistance = distance * latMeterInDegrees;
    const lngDistance = distance * lngMeterInDegrees;
    
    // Create the bounding box in format [top, right, bottom, left] as expected by Mapbox
    const bbox = [
      lat + latDistance,  // top (max lat)
      lng + lngDistance,  // right (max lng)
      lat - latDistance,  // bottom (min lat)
      lng - lngDistance   // left (min lng)
    ];
    
    // Query features within the bounding box - pass the array directly
    console.log("Querying with bbox:", bbox);
    const features = await mapRef.queryRenderedFeaturesInRect(
      bbox,
      null,
      layers
    );
    
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