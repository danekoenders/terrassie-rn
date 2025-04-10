import MapboxGL from '@rnmapbox/maps';
import * as turf from '@turf/turf';

// Store the access token directly
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZGFuZWtvZW5kZXJzIiwiYSI6ImNtODdvNzczZDA4dmcybHF1cnltZmVkbTQifQ.aiCVa0540JxdEivA-rlDTQ';

// Debounce variables to manage request rate
let searchTimeout = null;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // Minimum time between requests in ms

/**
 * Search for locations using Mapbox Search Box API
 * This API prioritizes POIs (restaurants, cafes, etc.) over general place names
 * 
 * @param {string} query - Search query text
 * @param {Array} userLocation - [longitude, latitude] coordinates for proximity-based results
 * @returns {Promise<Array>} Promise resolving to array of place features
 */
export const searchMapboxLocations = async (query, userLocation) => {
  if (!query || query.length < 2) {
    return [];
  }
  
  // Clear any existing timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Return a promise that will resolve after debounce
  return new Promise((resolve) => {
    // Set a new timeout
    searchTimeout = setTimeout(async () => {
      // Check if we should throttle the request
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        // Wait a bit longer if requests are coming too fast
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(r => setTimeout(r, waitTime));
      }
      
      // Update the last request time
      lastRequestTime = Date.now();
      
      try {
        // Use the suggest endpoint for better autocomplete functionality
        let endpoint = `https://api.mapbox.com/search/searchbox/v1/suggest?`;
        
        // Add query parameter
        endpoint += `q=${encodeURIComponent(query)}`;
        
        // Add access token
        endpoint += `&access_token=${MAPBOX_ACCESS_TOKEN}`;
        
        // Set session token for consistent results
        const sessionToken = Math.random().toString(36).substring(2, 15);
        endpoint += `&session_token=${sessionToken}`;
        
        // Set limits
        endpoint += `&limit=10`;
        
        // Set country bias to Netherlands for better local results
        endpoint += `&country=NL`;
        
        // Types parameter that prioritizes POIs - this gives higher priority to
        // cafes, restaurants, and other POIs over general place names
        // Using valid types according to the documentation
        endpoint += `&types=poi,address,street,neighborhood,place,district,postcode,locality,region`;
        
        // Filter to just show food and drinks POIs with higher priority
        endpoint += `&poi_category=food_and_drink`;
        
        // Language parameter
        endpoint += `&language=nl,en`;
        
        // Include proximity parameter for nearby locations
        if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
          endpoint += `&proximity=${userLocation[0]},${userLocation[1]}`;
          // Note: proximity_bias parameter is not supported by the API
        }
        
        // Make the suggest request
        const response = await fetch(endpoint);
        const data = await response.json();
        
        // Check for rate limiting
        if (data.message === "Too Many Requests") {
          console.warn("Rate limited by Mapbox API, waiting before retrying");
          // Wait and retry once after rate limit
          await new Promise(r => setTimeout(r, 1000));
          resolve([]);
          return;
        }
        
        // Check for errors in the response
        if (data.error) {
          console.error("API Error:", data.error);
          resolve([]);
          return;
        }
        
        if (!data.suggestions || data.suggestions.length === 0) {
          resolve([]);
          return;
        }
        
        // Get the top suggestions
        const suggestions = data.suggestions;
        
        // For each suggestion, get the details using the retrieve endpoint
        const detailsPromises = suggestions.map(async (suggestion) => {
          const retrieveEndpoint = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?session_token=${sessionToken}&access_token=${MAPBOX_ACCESS_TOKEN}`;
          
          try {
            const detailsResponse = await fetch(retrieveEndpoint);
            const detailsData = await detailsResponse.json();
            
            if (!detailsData.features || !detailsData.features[0]) {
              return null;
            }
            
            const feature = detailsData.features[0];
            
            // Format the result to match what our app expects
            return {
              ...feature,
              text: feature.properties?.name || feature.properties?.full_address || "Unnamed Location",
              place_name: feature.properties?.full_address || 
                         `${feature.properties?.name || ''}, ${feature.properties?.place_formatted || ''}`,
              id: feature.id || suggestion.mapbox_id,
              center: feature.geometry?.coordinates || feature.center || [0, 0],
              // Add original suggestion for reference
              suggestion: suggestion
            };
          } catch (error) {
            return null;
          }
        });
        
        // Wait for all detail requests to complete
        const results = await Promise.all(detailsPromises);
        
        // Filter out null results and return
        resolve(results.filter(result => result !== null));
      } catch (error) {
        console.error("Error searching for location:", error);
        resolve([]);
      }
    }, 300); // Wait 300ms before making the request
  });
};

/**
 * Get map features around a point using the map's rendered features
 * 
 * @param {Object} mapRef - Reference to the Mapbox GL map instance
 * @param {Array} center - [longitude, latitude] coordinates
 * @param {Array} layers - Array of layer ids to query (optional)
 * @returns {Promise<Array>} Promise resolving to array of features
 */
export const getMapFeaturesAround = async (mapRef, center) => {
  if (!center || !Array.isArray(center) || center.length !== 2) {
    return [];
  }
  
  if (!mapRef) {
    console.error("Invalid map reference");
    return [];
  }
  
  try {
    // For Mapbox v10, we can pass an empty array to query the entire visible area
    // For older versions, we need to get the visible bounds and create a rectangle
    
    // Query the rendered features in the viewport using the proper method
    const bbox = []; // Empty array will query the entire visible area in v10
    
    // Based on the sample data, we know buildings have properties like height, extrude, etc.
    // We'll look for all polygon features and filter for those with height properties
    const featureCollection = await mapRef.queryRenderedFeaturesInRect(
      bbox,
      [], // No filter
      null // Query all layers
    );
    
    // Check if we got a valid feature collection
    if (!featureCollection || !featureCollection.features) {
      return [];
    }
    
    const features = featureCollection.features;
    
    // Filter features to those that match building characteristics:
    // - Polygon geometry
    // - Has height property OR extrude property
    const buildingFeatures = features.filter(feature => {
      // Check for valid feature with polygon geometry
      if (!feature || !feature.geometry || feature.geometry.type !== 'Polygon') {
        return false;
      }
      
      // Check for building properties based on the sample we found
      const props = feature.properties || {};
      
      // Buildings typically have height, min_height, or extrude properties
      return (
        props.height !== undefined || 
        props.min_height !== undefined ||
        props.extrude === "true" ||
        props.type === "building" ||
        props.type === "apartments" ||
        props.building !== undefined
      );
    });
    
    // If we don't find any buildings, use a fallback approach
    if (buildingFeatures.length === 0) {
      // Try to find any polygons as potential buildings
      const polygonFeatures = features.filter(feature => 
        feature.geometry && 
        feature.geometry.type === 'Polygon'
      );
      
      // Process polygon features as if they were buildings with default height
      if (polygonFeatures.length > 0) {
        const processedFeatures = polygonFeatures.map(feature => {
          // Clone the feature to avoid modifying the original
          const processedFeature = JSON.parse(JSON.stringify(feature));
          
          // Add height information if missing
          processedFeature.properties = processedFeature.properties || {};
          if (processedFeature.properties.height === undefined) {
            processedFeature.properties.height = 15; // Default 5-story building height
          }
          
          return processedFeature;
        });
        
        return processedFeatures;
      }
    }
    
    // Process the identified building features
    const processedFeatures = buildingFeatures.map(feature => {
      // Clone the feature to avoid modifying the original
      const processedFeature = JSON.parse(JSON.stringify(feature));
      
      // Ensure properties object exists
      processedFeature.properties = processedFeature.properties || {};
      
      // If height property doesn't exist, try to estimate based on feature properties
      if (processedFeature.properties.height === undefined) {
        const levels = processedFeature.properties.levels || 
                      processedFeature.properties.building_levels ||
                      processedFeature.properties["building:levels"];
                     
        // Estimate height based on levels if available (approx 3m per level)
        if (levels) {
          processedFeature.properties.height = parseFloat(levels) * 3;
        } else {
          // Default height for buildings without specific height data
          processedFeature.properties.height = 15; // Average 5-story building
        }
      }
      
      // Ensure height is a number (sometimes it can be a string)
      if (typeof processedFeature.properties.height === 'string') {
        processedFeature.properties.height = parseFloat(processedFeature.properties.height);
      }
      
      return processedFeature;
    });
    
    return processedFeatures;
  } catch (error) {
    console.error("Error getting buildings from map:", error);
    
    // Fall back to an empty array
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