import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSunlight } from '../../context/SunlightContext';

const BuildingMarkers = () => {
  const { buildingsForDisplay, isAnalysisMode } = useSunlight();
  
  // Don't render anything if not in analysis mode or no buildings
  if (!isAnalysisMode || !buildingsForDisplay || buildingsForDisplay.length === 0) {
    return null;
  }
  
  return (
    <>
      {/* Render building centers as point annotations */}
      {buildingsForDisplay
        .filter(item => item.type === 'center')
        .map(building => (
          <MapboxGL.PointAnnotation
            key={building.id}
            id={building.id}
            coordinate={building.coordinates}
          >
            <View style={styles.buildingMarker}>
              <Text style={styles.buildingHeight}>{Math.round(building.height)}m</Text>
            </View>
          </MapboxGL.PointAnnotation>
        ))}
      
      {/* Render building outlines as shape source and line layers */}
      {buildingsForDisplay
        .filter(item => item.type === 'outline')
        .map(building => (
          <MapboxGL.ShapeSource
            key={building.id}
            id={building.id}
            shape={{
              type: 'Feature',
              properties: {
                height: building.height
              },
              geometry: building.geometry
            }}
          >
            <MapboxGL.LineLayer
              id={`${building.id}-line`}
              style={{
                lineColor: '#ff0000',
                lineWidth: 2,
                lineOpacity: 0.8
              }}
            />
          </MapboxGL.ShapeSource>
        ))}
    </>
  );
};

const styles = StyleSheet.create({
  buildingMarker: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff'
  },
  buildingHeight: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold'
  }
});

export default BuildingMarkers; 