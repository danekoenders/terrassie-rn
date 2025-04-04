import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
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
    handleTimeChange,
    shouldUpdateCamera,
    setShouldUpdateCamera
  } = useSunlight();
  
  // Function to handle slider value change
  const onSliderValueChange = (value) => {
    // Normal slider behavior - don't update camera while dragging
    handleTimeChange(value, false);
  };
  
  // Function to handle slider value change when complete
  const onSliderValueComplete = (value) => {
    // When slider is released, update with camera
    handleTimeChange(value, true);
    
    // Force immediate camera update
    setTimeout(() => {
      setShouldUpdateCamera(true);
    }, 100);
  };
  
  // Button to follow the sun orientation
  const handleFollowSun = () => {
    // First make sure we update with current time value
    handleTimeChange(timeValue, false);
    
    // Directly trigger camera update with minimal delay
    setTimeout(() => {
      setShouldUpdateCamera(true);
    }, 100);
  };
  
  return (
    <View style={styles.enhancedSliderContainer}>
      <View style={styles.timeHeaderContainer}>
        <Text style={styles.timeHeaderText}>Time of Day</Text>
        <TouchableOpacity 
          style={styles.followSunButton}
          onPress={handleFollowSun}
        >
          <Text style={styles.followSunButtonText}>Follow Sun</Text>
        </TouchableOpacity>
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
          onValueChange={onSliderValueChange}
          onSlidingComplete={onSliderValueComplete}
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
    flex: 1,
  },
  currentTimeText: {
    ...Typography.subtitle,
    textAlign: 'right',
    flex: 1,
  },
  followSunButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginHorizontal: 8,
  },
  followSunButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 12,
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