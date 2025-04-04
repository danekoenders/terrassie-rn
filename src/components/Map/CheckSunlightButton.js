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
  },
  checkButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  buttonText: {
    ...Typography.button,
  },
});

export default CheckSunlightButton; 