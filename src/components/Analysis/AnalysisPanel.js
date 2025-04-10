import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSunlight } from '../../context/SunlightContext';
import { Colors, Typography } from '../../styles/common';

export const AnalysisPanel = () => {
  const { 
    isInShadow,
  } = useSunlight();
  
  return (
    <View style={styles.analysisPanel}>
      <Text style={styles.analysisPanelTitle}>SolMate</Text>
      
      <View style={[
        styles.sunlightStatusContainer,
        isInShadow ? styles.shadowStatusContainer : styles.sunlitStatusContainer
      ]}>
        <Text style={[
          styles.sunlightStatusIcon,
          isInShadow ? styles.shadowStatusIcon : styles.sunlitStatusIcon
        ]}>
          {isInShadow ? '☁️' : '☀️'}
        </Text>
        <Text style={[
          styles.sunlightStatusText,
          isInShadow ? styles.shadowStatusText : styles.sunlitStatusText
        ]}>
          {isInShadow ? 'In Shadow' : 'In Sunlight'}
        </Text>
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
}); 