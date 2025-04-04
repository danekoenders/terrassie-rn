import { StyleSheet } from 'react-native';

export const Colors = {
  primary: '#FFCF30',      // Primary yellow for sun-related elements
  primaryDark: '#d4a200',  // Darker yellow for text on light backgrounds
  shadow: '#4169E1',       // Blue for shadow-related elements
  shadowLight: 'rgba(0, 0, 255, 0.1)', // Light blue background for shadow status
  sunlight: 'rgba(255, 215, 0, 0.2)',  // Light yellow background for sunlight status
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#DDDDDD',
  background: '#FFFFFF',
  disabled: '#A9A9A9',
  border: '#EEEEEE',
  text: {
    primary: '#000000',
    secondary: '#666666',
    light: '#FFFFFF',
  }
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
};

export const Typography = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  body: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  caption: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  button: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
});

export const Buttons = StyleSheet.create({
  primary: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    ...Shadows.small,
  },
  secondary: {
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    ...Shadows.small,
  },
  disabled: {
    backgroundColor: Colors.disabled,
  },
  icon: {
    backgroundColor: Colors.white,
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
});

export const Containers = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    ...Shadows.small,
  },
  panel: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.medium,
  },
  panelHandle: {
    width: 40,
    height: 5,
    backgroundColor: Colors.lightGray,
    borderRadius: 3,
    marginVertical: 8,
    alignSelf: 'center',
  },
}); 