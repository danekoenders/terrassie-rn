import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useSunlight } from '../../context/SunlightContext';
import { Colors, Shadows, Buttons, Typography } from '../../styles/common';

const CheckSunlightButton = ({ onCheckSunlight }) => {
  const { analyzing } = useSunlight();
  
  return (
    <View style={styles.checkButtonContainer}>
      <TouchableOpacity 
        style={[
          styles.checkButton, 
          analyzing && styles.checkButtonDisabled
        ]}
        onPress={onCheckSunlight}
        disabled={analyzing}
      >
        <Text style={styles.buttonIcon}>{analyzing ? '⏳' : '☀️'}</Text>
        <Text style={styles.buttonText}>
          {analyzing ? 'Analyzing...' : 'Check Sunlight'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  checkButtonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  checkButton: {
    ...Buttons.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    ...Shadows.medium,
  },
  checkButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    ...Typography.button,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CheckSunlightButton; 