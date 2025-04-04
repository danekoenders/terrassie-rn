import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Colors, Shadows, Buttons, Typography } from '../../styles/common';

export const ExitButton = ({ onExit }) => {
  return (
    <TouchableOpacity style={styles.exitButton} onPress={onExit}>
      <Text style={styles.exitButtonText}>✕ Exit</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  exitButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    ...Buttons.secondary,
    zIndex: 10,
  },
  exitButtonText: {
    ...Typography.subtitle,
  },
}); 