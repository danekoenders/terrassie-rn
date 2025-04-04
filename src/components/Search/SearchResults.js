import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Colors, Shadows } from '../../styles/common';

export const SearchResults = ({ results = [], onSelectPlace }) => {
  if (!results || results.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.searchResultsContainer}>
      <ScrollView>
        {results.map((result, index) => (
          <TouchableOpacity
            key={index}
            style={styles.searchResultItem}
            onPress={() => onSelectPlace(result)}
          >
            <Text style={styles.searchResultName}>{result.text}</Text>
            <Text style={styles.searchResultAddress}>
              {result.place_name.replace(result.text + ', ', '')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  searchResultsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    ...Shadows.small,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  searchResultAddress: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
}); 