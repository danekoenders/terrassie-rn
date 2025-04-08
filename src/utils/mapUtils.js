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
    // This matches the implementation seen in the Mapbox RN source code
    const buildingLayers = ['building', 'building-extrusion', 'buildings', 'structure']; 
    
    // Create an empty bbox array for v10, or a valid bbox for older versions
    // Using empty array will query the entire visible map area in v10
    const bbox = [];
    
    console.log("Querying rendered features with layer IDs:", buildingLayers);
    
    // Use the queryRenderedFeaturesInRect method as seen in the Mapbox source code
    const featureCollection = await mapRef.queryRenderedFeaturesInRect(
      bbox,       // Empty array queries entire visible area in v10
      [],         // No filter
      buildingLayers  // Building-related layers
    );
    
    console.log("Query complete, processing results...");
    
    // Check if we got a valid feature collection
    if (!featureCollection || !featureCollection.features) {
      console.log("No features found in query result");
      return [];
    }
    
    const features = featureCollection.features;
    console.log(`Found ${features.length} features in the current map view`);
    
    // Log some sample features to understand their structure
    if (features.length > 0) {
      console.log("Sample feature types:");
      const sampleSize = Math.min(5, features.length);
      for (let i = 0; i < sampleSize; i++) {
        const feature = features[i];
        console.log(feature);
        console.log(feature.geometry.coordinates)
        console.log(`Feature ${i}:`);
        console.log(`- Type: ${feature.geometry?.type}`);
        console.log(`- Layer ID: ${feature.layer?.id || 'unknown'}`);
        console.log(`- Source: ${feature.source || 'unknown'}`);
        console.log(`- Properties:`, feature.properties ? Object.keys(feature.properties) : 'none');
        if (feature.properties) {
          console.log(`- Building property: ${feature.properties.building ? 'Yes' : 'No'}`);
          console.log(`- Class: ${feature.properties.class || 'unknown'}`);
          console.log(`- Type: ${feature.properties.type || 'unknown'}`);
        }
      }
    }
    
    // // Try a more lenient approach to finding buildings
    // console.log("Identifying buildings with lenient criteria...");
    
    // // Filter features that might be buildings using multiple criteria
    // const buildingFeatures = features.filter(feature => {
    //   // Make sure it's a valid feature with geometry
    //   if (!feature.geometry || !feature.geometry.coordinates) {
    //     return false;
    //   }
      
    //   const props = feature.properties || {};
    //   const isBuilding = 
    //     // Check for explicit building property
    //     props.building || 
    //     // Check for building in class
    //     props.class === 'building' ||
    //     // Check for building in type
    //     props.type === 'building' ||
    //     // Check in layer id
    //     (feature.layer && feature.layer.id && 
    //       (feature.layer.id.includes('building') || 
    //        feature.layer.id.includes('structure'))) ||
    //     // Check for 3D building extrusion
    //     (props.height && props.min_height) ||
    //     // Check for structure
    //     props.structure;
      
    //   // For lenient checking, also consider all polygons within 200m as potential buildings
    //   if (!isBuilding && feature.geometry.type === 'Polygon') {
    //     try {
    //       // Calculate distance from center to feature
    //       const featureCenter = turf.center(feature);
    //       const distance = turf.distance(
    //         center,
    //         featureCenter.geometry.coordinates,
    //         { units: 'meters' }
    //       );
          
    //       // If it's close enough, treat it as a building
    //       if (distance < 200) {
    //         console.log(`Found polygon within 200m: type=${props.type}, class=${props.class}`);
    //         return true;
    //       }
    //     } catch (e) {
    //       // If distance calculation fails, skip this feature
    //       return false;
    //     }
    //   }
      
    //   return isBuilding;
    // });
    
    console.log(`Identified ${buildingFeatures.length} potential buildings`);
    
    // If we still don't have buildings, try an even more lenient approach
    if (buildingFeatures.length === 0) {
      console.log("No buildings found with standard criteria, trying polygon-based approach");
      
      // Try to find any polygons, which might be buildings
      const polygonFeatures = features.filter(feature => 
        feature.geometry && 
        feature.geometry.type === 'Polygon'
      );
      
      console.log(`Found ${polygonFeatures.length} polygon features that might be buildings`);
      
      // If we have polygons, use them as buildings
      if (polygonFeatures.length > 0) {
        // Process the polygon features
        const processedFeatures = polygonFeatures.map(feature => {
          // Clone the feature to avoid modifying the original
          const processedFeature = JSON.parse(JSON.stringify(feature));
          
          // Add height information
          processedFeature.properties = processedFeature.properties || {};
          processedFeature.properties.building = true;
          processedFeature.properties.height = 15; // Default height
          
          return processedFeature;
        });
        
        console.log(`Created ${processedFeatures.length} simulated buildings from polygons`);
        return processedFeatures;
      }
    }
    
    // Process the identified building features
    const processedFeatures = buildingFeatures.map(feature => {
      // Clone the feature to avoid modifying the original
      const processedFeature = JSON.parse(JSON.stringify(feature));
      
      // If height property doesn't exist, try to estimate based on feature properties
      if (!processedFeature.properties.height) {
        const levels = processedFeature.properties.levels || 
                     processedFeature.properties.building_levels ||
                     processedFeature.properties["building:levels"];
                     
        // Estimate height based on levels if available (approx 3m per level)
        if (levels) {
          processedFeature.properties.height = parseFloat(levels) * 3;
        } else if (processedFeature.properties.building) {
          // Default height for buildings without specific height data
          processedFeature.properties.height = 15; // Average 5-story building
        }
      }
      
      return processedFeature;
    });
    
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