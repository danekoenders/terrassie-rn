import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSunlight } from '../../context/SunlightContext';
import { Colors, Typography } from '../../styles/common';

export const TimeSlider = () => {
  const { 
    timeValue, 
    sunriseHour, 
    sunsetHour, 
    exactTimeString,
    formatTimeFromDecimal,
    handleTimeChange 
  } = useSunlight();
  
  return (
    <View style={styles.enhancedSliderContainer}>
      <View style={styles.timeHeaderContainer}>
        <Text style={styles.timeHeaderText}>Time of Day</Text>
        <Text style={styles.currentTimeText}>{exactTimeString}</Text>
      </View>
      
      <View style={styles.sliderRow}>
        <Text style={[styles.sliderIcon, styles.sunriseIcon]}>🌅</Text>
        <Slider
          style={styles.timeSlider}
          minimumValue={sunriseHour}
          maximumValue={sunsetHour}
          step={1/60} // 1-minute intervals
          value={timeValue}
          onValueChange={handleTimeChange}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.black}
        />
        <Text style={[styles.sliderIcon, styles.sunsetIcon]}>🌇</Text>
      </View>
      
      <View style={styles.timeLabelsContainer}>
        <Text style={styles.timeLabel}>{formatTimeFromDecimal(sunriseHour)}</Text>
        <Text style={styles.timeLabel}>{formatTimeFromDecimal((sunriseHour + sunsetHour) / 2)}</Text>
        <Text style={styles.timeLabel}>{formatTimeFromDecimal(sunsetHour)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  enhancedSliderContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeHeaderText: {
    ...Typography.subtitle,
  },
  currentTimeText: {
    ...Typography.subtitle,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeSlider: {
    flex: 1,
    height: 40,
  },
  sliderIcon: {
    fontSize: 20,
  },
  sunriseIcon: {
    marginRight: 8,
    color: Colors.primaryDark,
  },
  sunsetIcon: {
    marginLeft: 8,
    color: Colors.shadow,
  },
  timeLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    ...Typography.caption,
  },
}); 