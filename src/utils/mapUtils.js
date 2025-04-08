import MapboxGL from '@rnmapbox/maps';
import * as turf from '@turf/turf';

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
 * Get map features around a point using the map's rendered features
 * 
 * @param {Object} mapRef - Reference to the Mapbox GL map instance
 * @param {Array} center - [longitude, latitude] coordinates
 * @param {Array} layers - Array of layer ids to query (optional)
 * @returns {Promise<Array>} Promise resolving to array of features
 */
export const getMapFeaturesAround = async (mapRef, center, layers = ['building']) => {
  if (!center || !Array.isArray(center) || center.length !== 2) {
    return [];
  }
  
  if (!mapRef) {
    console.error("Invalid map reference");
    return [];
  }
  
  try {
    console.log("Getting buildings directly from the map...");
    
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
      console.log("No features found in query result");
      return [];
    }
    
    const features = featureCollection.features;
    console.log(`Found ${features.length} features in the current map view`);
    
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
    
    console.log(`Identified ${buildingFeatures.length} building features`);
    
    // If we don't find any buildings, use a fallback approach
    if (buildingFeatures.length === 0) {
      console.log("No buildings found with standard criteria, looking for any polygons");
      
      // Try to find any polygons as potential buildings
      const polygonFeatures = features.filter(feature => 
        feature.geometry && 
        feature.geometry.type === 'Polygon'
      );
      
      // Log the first few polygon features if available
      if (polygonFeatures.length > 0) {
        const sampleSize = Math.min(3, polygonFeatures.length);
        console.log(`Found ${polygonFeatures.length} polygons. Sample properties:`);
        for (let i = 0; i < sampleSize; i++) {
          console.log(`Polygon ${i} properties:`, polygonFeatures[i].properties);
        }
      }
      
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
        
        console.log(`Processed ${processedFeatures.length} polygon features as buildings`);
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
    
    console.log(`Successfully processed ${processedFeatures.length} building features`);
    return processedFeatures;
  } catch (error) {
    console.error("Error getting buildings from map:", error);
    console.log("Error details:", error.message);
    
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