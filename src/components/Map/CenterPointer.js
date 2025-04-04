import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CenterPointer = () => {
  return (
    <View style={styles.centerPointerContainer}>
      <Text style={styles.centerPointerIcon}>📍</Text>
      <View style={styles.centerPointerTextContainer}>
        <Text style={styles.centerPointerText}>Move to terras</Text>
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
  },
  centerPointerTextContainer: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centerPointerText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CenterPointer; 