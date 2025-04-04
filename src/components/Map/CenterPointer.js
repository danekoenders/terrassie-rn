import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows } from '../../styles/common';

const CenterPointer = () => {
  return (
    <View style={styles.centerPointerContainer}>
      <Text style={styles.centerPointerIcon}>📍</Text>
      <View style={styles.centerPointerTextContainer}>
        <Text style={styles.centerPointerText}>Position the pin and check sunlight</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerPointerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -10 },
      { translateY: -40 }
    ],
    alignItems: 'center',
  },
  centerPointerIcon: {
    fontSize: 40,
    color: '#FFCF30',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerPointerTextContainer: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    ...Shadows.small,
  },
  centerPointerText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
});

export default CenterPointer; 