import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSunlight } from '../../context/SunlightContext';
import { Colors, Typography } from '../../styles/common';

export const AnalysisPanel = () => {
  const { 
    isInShadow,
    sunAltitudeDeg,
    bearingFromNorth,
    sunriseTime,
    sunsetTime
  } = useSunlight();
  
  return (
    <View style={styles.analysisPanel}>
      <Text style={styles.analysisPanelTitle}>Sunlight Analysis</Text>
      
      <View style={[
        styles.sunlightStatusContainer,
        isInShadow ? styles.shadowStatusContainer : styles.sunlitStatusContainer
      ]}>
        <Text style={[
          styles.sunlightStatusIcon,
          isInShadow ? styles.shadowStatusIcon : styles.sunlitStatusIcon
        ]}>
          {isInShadow ? '🌥️' : '☀️'}
        </Text>
        <Text style={[
          styles.sunlightStatusText,
          isInShadow ? styles.shadowStatusText : styles.sunlitStatusText
        ]}>
          {isInShadow ? 'In Shadow' : 'In Sunlight'}
        </Text>
      </View>
      
      <View style={styles.sunInfoContainer}>
        <Text style={styles.sunInfoText}>
          Sun altitude: {sunAltitudeDeg.toFixed(1)}°
        </Text>
        <Text style={styles.sunInfoText}>
          Sun direction: {bearingFromNorth.toFixed(1)}°
        </Text>
        {sunriseTime && sunsetTime && (
          <Text style={styles.sunInfoText}>
            Sunrise: {sunriseTime.getHours()}:{String(sunriseTime.getMinutes()).padStart(2, '0')} | 
            Sunset: {sunsetTime.getHours()}:{String(sunsetTime.getMinutes()).padStart(2, '0')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  analysisPanel: {
    padding: 16,
  },
  analysisPanelTitle: {
    ...Typography.title,
    textAlign: 'center',
    marginBottom: 12,
  },
  sunlightStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'center',
  },
  sunlitStatusContainer: {
    backgroundColor: Colors.sunlight,
  },
  shadowStatusContainer: {
    backgroundColor: Colors.shadowLight,
  },
  sunlightStatusIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sunlitStatusIcon: {
    color: Colors.primaryDark,
  },
  shadowStatusIcon: {
    color: Colors.shadow,
  },
  sunlightStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sunlitStatusText: {
    color: Colors.primaryDark,
  },
  shadowStatusText: {
    color: Colors.shadow,
  },
  sunInfoContainer: {
    alignItems: 'center',
  },
  sunInfoText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
}); 