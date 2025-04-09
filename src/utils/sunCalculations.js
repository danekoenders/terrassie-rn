import SunCalc from 'suncalc';
import * as turf from '@turf/turf';

/**
 * Calculate the sun position based on date, time, and location
 * 
 * @param {Date} dateWithTime - Date object with the time to calculate for
 * @param {Array} coordinates - [longitude, latitude] coordinates
 * @returns {Object} Sun position data including azimuth and altitude in degrees
 */
export const calculateSunPosition = (dateWithTime, coordinates) => {
  if (!coordinates) return null;

  const [longitude, latitude] = coordinates;

  // Get sun position using SunCalc library
  const sunPosition = SunCalc.getPosition(
    dateWithTime,
    latitude,
    longitude
  );

  // SunCalc azimuth is measured clockwise from south, we need to convert to bearing from north
  // Convert azimuth to bearing from North
  const azimuthDeg = sunPosition.azimuth * 180 / Math.PI;
  
  // Formula: (180 + azimuthDeg) % 360 
  // - This converts from clockwise-from-south to clockwise-from-north
  const bearing = (180 + azimuthDeg) % 360;
  
  // Convert altitude to degrees
  const altitudeDeg = sunPosition.altitude * 180 / Math.PI;

  return {
    sunPosition,
    bearing,
    altitudeDeg
  };
};

/**
 * Calculate sunrise and sunset times for a specific location and date
 * 
 * @param {Date} date - Date to calculate for
 * @param {Array} coordinates - [longitude, latitude] coordinates
 * @returns {Object} Sunrise and sunset times and decimal hours
 */
export const calculateSunriseSunset = (date, coordinates) => {
  if (!coordinates) return null;

  const [longitude, latitude] = coordinates;
  
  // Use noon for consistent calculations
  const targetDate = new Date(date);
  targetDate.setHours(12, 0, 0, 0);
  
  // Get all sun times for the day
  const times = SunCalc.getTimes(
    targetDate,
    latitude,
    longitude
  );
  
  // Calculate sunrise and sunset as decimal hours for the slider
  const sunriseHour = times.sunrise.getHours() + (times.sunrise.getMinutes() / 60);
  const sunsetHour = times.sunset.getHours() + (times.sunset.getMinutes() / 60);
  
  return {
    sunriseTime: times.sunrise,
    sunsetTime: times.sunset,
    sunriseHour,
    sunsetHour
  };
};

/**
 * Format time from decimal hours to HH:MM string
 * 
 * @param {number} timeDecimal - Time in decimal hours (e.g., 14.5 for 2:30 PM)
 * @returns {string} Formatted time string (HH:MM)
 */
export const formatTimeFromDecimal = (timeDecimal) => {
  const hours = Math.floor(timeDecimal);
  const minutes = Math.round((timeDecimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calculate a 3D destination point for sun ray visualization
 * Using SunCalc altitude and azimuth data
 * 
 * @param {Array} startPoint - [longitude, latitude] coordinates
 * @param {number} distance - Distance in kilometers
 * @param {number} azimuthDegrees - Sun azimuth in degrees (bearing from north to sun)
 * @param {number} altitudeDegrees - Sun altitude in degrees
 * @returns {Object} Position and elevation of the end point
 */
export const calculate3DDestinationPoint = (startPoint, distance, azimuthDegrees, altitudeDegrees) => {
  // Convert altitude to radians
  const altitudeRadians = (altitudeDegrees * Math.PI) / 180;

  // Adjust the distance based on the altitude angle
  // When altitude is 90° (directly overhead), horizontal distance is 0
  // When altitude is 0° (horizon), horizontal distance is the full distance
  const horizontalDistance = distance * Math.cos(altitudeRadians);

  // Calculate the vertical component of the ray
  // When altitude is 90° (directly overhead), vertical distance is the full distance
  // When altitude is 0° (horizon), vertical distance is 0
  const verticalDistance = distance * Math.sin(altitudeRadians);

  // The bearing we get is from north to sun
  // For ray tracing from ground TO sun, we use this bearing directly
  // This draws the ray in the direction of the sun
  const rayBearing = azimuthDegrees;
  
  // Calculate the destination point using the horizontal distance
  const destination = turf.destination(
    startPoint,
    horizontalDistance,
    rayBearing,
    { units: "kilometers" }
  );

  // Ensure we return exactly [number, number] by extracting the coordinates
  const [lng, lat] = destination.geometry.coordinates;

  return {
    position: [lng, lat],
    elevation: verticalDistance * 1000, // Convert to meters for Mapbox elevation scale
  };
};

/**
 * Create 3D ray segments for visualization
 * 
 * @param {Array} start - [longitude, latitude] coordinates
 * @param {Array} end - [longitude, latitude] coordinates
 * @param {number} startElevation - Start elevation in meters
 * @param {number} endElevation - End elevation in meters
 * @param {number} segments - Number of segments to create
 * @returns {Array} Features representing 3D ray segments
 */
export const createRay3DSegments = (start, end, startElevation, endElevation, segments = 20) => {
  const features = [];

  // Create multiple segments to form a 3D ray
  for (let i = 0; i < segments; i++) {
    const ratio1 = i / segments;
    const ratio2 = (i + 1) / segments;

    // Interpolate positions
    const lng1 = start[0] + (end[0] - start[0]) * ratio1;
    const lat1 = start[1] + (end[1] - start[1]) * ratio1;
    const elev1 = startElevation + (endElevation - startElevation) * ratio1;

    const lng2 = start[0] + (end[0] - start[0]) * ratio2;
    const lat2 = start[1] + (end[1] - start[1]) * ratio2;
    const elev2 = startElevation + (endElevation - startElevation) * ratio2;

    // Calculate a small rectangle around the line segment for extrusion
    const angle = Math.atan2(lat2 - lat1, lng2 - lng1);
    const perpAngle = angle + Math.PI / 2;

    // Width of the ray (in meters, converted to degrees)
    const widthMeters = 0.2;
    const widthDegrees =
      widthMeters / (111320 * Math.cos((lat1 * Math.PI) / 180));

    // Calculate corners of the rectangle
    const dx = (widthDegrees * Math.cos(perpAngle)) / 2;
    const dy = (widthDegrees * Math.sin(perpAngle)) / 2;

    // Create a polygon for this segment
    const segment = {
      type: "Feature",
      properties: {
        base: elev1,
        height: elev2,
        segment: i,
        isRaySegment: true,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [lng1 - dx, lat1 - dy],
            [lng1 + dx, lat1 + dy],
            [lng2 + dx, lat2 + dy],
            [lng2 - dx, lat2 - dy],
            [lng1 - dx, lat1 - dy],
          ],
        ],
      },
    };

    features.push(segment);
  }

  return features;
};

/**
 * Enhanced 3D ray tracing for determining if a point is in shadow
 * Uses SunCalc data and Mapbox building height information
 * 
 * @param {Array} selectedPoint - [longitude, latitude] coordinates to check
 * @param {number} bearing - Sun bearing from north in degrees
 * @param {number} sunAltitudeDeg - Sun altitude in degrees
 * @param {Array} features - Array of building features to check against
 * @returns {Object} Shadow analysis results with 3D ray tracing data
 */
export const checkShadowWith3DRay = (selectedPoint, bearing, sunAltitudeDeg, features) => {
  
  // Sun already below horizon - it's night
  if (sunAltitudeDeg <= 0) {
    console.log('Sun below horizon (night time), returning shadow');
    return {
      isInShadow: true,
      blockerFeature: null,
      intersectionPoint: null,
      raySegments: null
    };
  }
  
  // No buildings to check
  if (!features || features.length === 0) {
    console.log('No building features available, creating default ray without shadows');
    // Create a ray without any intersections
    const rayEnd = calculate3DDestinationPoint(
      selectedPoint,
      0.5, // 500m
      bearing,
      sunAltitudeDeg
    );

    const raySegments = createRay3DSegments(
      selectedPoint,
      rayEnd.position,
      0,
      rayEnd.elevation
    );

    return {
      isInShadow: false,
      blockerFeature: null,
      intersectionPoint: null,
      raySegments,
      rayEnd: rayEnd.position
    };
  }

  let inShadow = false;
  let blocker = null;
  let closestIntersection = null;
  let minDistance = Infinity;
  let intersectionHeight = 0;

  const point = turf.point(selectedPoint);
  
  // Create a ray in the sun's direction
  const rayDistance = 1; // 1 km ray length
  
  const rayEnd = calculate3DDestinationPoint(
    selectedPoint,
    rayDistance,
    bearing,
    sunAltitudeDeg
  );
  
  // Create a 2D ray line for intersection checking
  // This line goes FROM sun direction TO the selected point (opposite of bearing)
  // This is important: we want to check if sunlight can reach the point
  const oppositeBearing = (bearing + 180) % 360;
  
  // Create the ray line in the RIGHT direction - from sun TO point
  const rayLine = turf.lineString([rayEnd.position, point.geometry.coordinates]);
  
  // Ensure features is iterable
  let featureArray = [];
  try {
    // Convert features to array using the same logic as in original checkShadow
    if (Array.isArray(features)) {
      featureArray = features;
    } else if (features && typeof features.forEach === 'function') {
      featureArray = Array.from(features);
    } else if (features && features.features && Array.isArray(features.features)) {
      featureArray = features.features;
    } else if (features) {
      try {
        featureArray = Array.from(features);
      } catch (err) {
        featureArray = [];
      }
    }
  } catch (error) {
    featureArray = [];
  }
  
  // Detailed feature inspection
  if (featureArray.length > 0) {
    const sampleBuilding = featureArray[0];
  }
  
  let buildingsWithHeight = 0;
  let buildingsChecked = 0;
  let buildingsWithIntersections = 0;
  
  // For each building, check if the ray intersects its footprint
  for (let i = 0; i < featureArray.length; i++) {
    const feat = featureArray[i];
    if (!feat) continue;
    
    // Extract building height information from various possible property names
    const props = feat.properties || {};
    const height = props.height || props.render_height || props.building_height || 
                  (props.building ? 15 : 0); // Default to 15m height for generic buildings
    
    if (height <= 0) continue;
    buildingsWithHeight++;
    
    // Skip buildings with no geometry
    if (!feat.geometry || !feat.geometry.coordinates || !feat.geometry.coordinates.length) {
      continue;
    }
    
    buildingsChecked++;
    
    try {
      // Handle different geometry types
      let polygons = [];
      
      if (feat.geometry.type === 'Polygon') {
        polygons = [feat.geometry];
      } else if (feat.geometry.type === 'MultiPolygon') {
        feat.geometry.coordinates.forEach(coords => {
          polygons.push({
            type: 'Polygon',
            coordinates: coords
          });
        });
      } else {
        continue; // Skip non-polygon geometries
      }
      
      // Check each polygon for intersection
      for (let polygon of polygons) {
        try {
          // Ensure valid polygon coordinates
          if (!polygon.coordinates || !polygon.coordinates.length || !polygon.coordinates[0] || polygon.coordinates[0].length < 4) {
            continue;
          }
          
          // Create a proper turf polygon with validation
          const poly = turf.polygon(polygon.coordinates);
          
          // Check if ray intersects building footprint
          const intersects = turf.booleanIntersects(rayLine, poly);
          
          if (intersects) {
            buildingsWithIntersections++;
            
            // Find the intersection point between ray and building
            try {
              const polyLine = turf.polygonToLine(poly);
              const intersection = turf.lineIntersect(rayLine, polyLine);
              
              // If there's an intersection point
              if (intersection.features.length > 0) {
                // Find the closest intersection point
                for (const intersect of intersection.features) {
                  // Calculate distance from selected point to intersection point
                  const dist = turf.distance(point, intersect, { units: 'meters' });
                  
                  // Calculate the sun ray's height at this distance based on altitude angle
                  const rayHeight = dist * Math.tan(sunAltitudeDeg * Math.PI / 180);
                  
                  // If building is taller than ray's height at this point, it blocks sun
                  if (height > rayHeight && dist < minDistance) {
                    minDistance = dist;
                    inShadow = true;
                    blocker = feat;
                    closestIntersection = intersect.geometry.coordinates;
                    intersectionHeight = rayHeight; // Save the ray height at intersection
                  }
                }
              }
            } catch (intersectionError) {
              console.log(`Error finding intersection: ${intersectionError.message}`);
            }
          }
        } catch (polygonError) {
          console.log(`Error processing polygon: ${polygonError.message}`);
        }
      }
    } catch (error) {
      console.log(`Error processing building: ${error.message}`);
    }
  }
  
  // Create ray segments based on intersection results
  let raySegments;
  if (inShadow && closestIntersection) {
    // If in shadow, create ray segments that stop at the building
    raySegments = createRay3DSegments(
      selectedPoint,
      closestIntersection,
      0,
      intersectionHeight
    );
  } else {
    // If not in shadow, create full ray segments
    raySegments = createRay3DSegments(
      selectedPoint,
      rayEnd.position,
      0,
      rayEnd.elevation
    );
  }

  return {
    isInShadow: inShadow,
    blockerFeature: blocker,
    intersectionPoint: closestIntersection,
    raySegments,
    rayEnd: inShadow ? closestIntersection : rayEnd.position
  };
};

/**
 * Check if a point is in shadow based on buildings around it
 * 
 * @param {Array} selectedPoint - [longitude, latitude] coordinates to check
 * @param {number} bearing - Sun bearing from north in degrees
 * @param {number} sunAltitudeDeg - Sun altitude in degrees
 * @param {Array} features - Array of building features to check against
 * @returns {Object} Shadow analysis results
 */
export const checkShadow = (selectedPoint, bearing, sunAltitudeDeg, features) => {
  // Sun already below horizon - it's night
  if (sunAltitudeDeg <= 0) {
    return {
      isInShadow: true,
      blockerFeature: null,
      intersectionPoint: null
    };
  }
  
  // No buildings to check
  if (!features || features.length === 0) {
    return {
      isInShadow: false,
      blockerFeature: null,
      intersectionPoint: null
    };
  }

  let inShadow = false;
  let blocker = null;
  let closestIntersection = null;
  let minDistance = Infinity;

  const point = turf.point(selectedPoint);
  
  // Create a ray line in the sun's direction
  const rayDistance = 1; // 1 km ray length
  const rayEnd = turf.destination(point, rayDistance, bearing, { units: 'kilometers' });
  const rayLine = turf.lineString([point.geometry.coordinates, rayEnd.geometry.coordinates]);
  
  // Ensure features is iterable
  let featureArray = [];
  try {
    // If features is already an array, use it
    if (Array.isArray(features)) {
      featureArray = features;
    } 
    // If features has forEach, convert to array
    else if (features && typeof features.forEach === 'function') {
      featureArray = Array.from(features);
    } 
    // If features is a GeoJSON FeatureCollection
    else if (features && features.features && Array.isArray(features.features)) {
      featureArray = features.features;
    }
    // Otherwise, try to create an array
    else if (features) {
      try {
        featureArray = Array.from(features);
      } catch (err) {
        // Keep critical error handling
        featureArray = [];
      }
    }
  } catch (error) {
    // Keep critical error handling
    featureArray = [];
  }
  
  // For each building, check if the ray intersects its footprint
  for (let i = 0; i < featureArray.length; i++) {
    const feat = featureArray[i];
    if (!feat) continue;
    
    const props = feat.properties || {};
    const height = props.height || props.render_height || 0;
    
    if (height <= 0) continue;
    
    // Skip buildings with no geometry
    if (!feat.geometry || !feat.geometry.coordinates || !feat.geometry.coordinates.length) {
      continue;
    }
    
    try {
      // Handle different geometry types
      let polygons = [];
      
      if (feat.geometry.type === 'Polygon') {
        polygons = [feat.geometry];
      } else if (feat.geometry.type === 'MultiPolygon') {
        feat.geometry.coordinates.forEach(coords => {
          polygons.push({
            type: 'Polygon',
            coordinates: coords
          });
        });
      } else {
        continue; // Skip non-polygon geometries
      }
      
      // Check each polygon for intersection
      for (let polygon of polygons) {
        const poly = turf.polygon(polygon.coordinates);
        
        // Check if ray intersects building footprint
        const intersects = turf.booleanIntersects(rayLine, poly);
        
        if (intersects) {
          // Calculate distance to intersection point
          // Find the intersection point between ray and building
          const intersection = turf.lineIntersect(rayLine, turf.polygonToLine(poly));
          
          // If there's an intersection point
          if (intersection.features.length > 0) {
            // Find the closest intersection point
            for (const intersect of intersection.features) {
              const dist = turf.distance(point, intersect, { units: 'meters' });
              
              // Calculate the sun ray's height at this distance based on altitude angle
              const rayHeight = dist * Math.tan(sunAltitudeDeg * Math.PI / 180);
              
              // If building is taller than ray's height at this point, it blocks sun
              if (height > rayHeight && dist < minDistance) {
                minDistance = dist;
                inShadow = true;
                blocker = feat;
                closestIntersection = intersect.geometry.coordinates;
              }
            }
          }
        }
      }
    } catch (error) {
      // Keep critical error handling
    }
  }

  return {
    isInShadow: inShadow,
    blockerFeature: blocker,
    intersectionPoint: closestIntersection
  };
}; 