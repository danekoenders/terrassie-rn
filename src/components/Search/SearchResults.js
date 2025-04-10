import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Colors, Shadows } from '../../styles/common';

export const SearchResults = ({ results = [], onSelectPlace }) => {
  if (!results || results.length === 0) {
    return null;
  }
  
  // Helper function to get category icon based on POI category
  const getCategoryIcon = (result) => {
    // Check for category in the new API format
    let category = '';
    
    // Try to get category from different possible locations in the result
    if (result.properties?.category) {
      category = result.properties.category;
    } else if (result.properties?.poi_category) {
      category = result.properties.poi_category;
    } else if (result.suggestion?.poi_category) {
      category = result.suggestion.poi_category;
    } else if (result.properties?.class) {
      category = result.properties.class;
    }
    
    // Return emoji based on category
    if (category.includes('coffee') || category.includes('cafe')) {
      return '☕';
    } else if (category.includes('restaurant') || category.includes('food')) {
      return '🍽️';
    } else if (category.includes('bar') || category.includes('pub')) {
      return '🍸';
    } else if (category.includes('hotel') || category.includes('lodging')) {
      return '🏨';
    } else if (category.includes('store') || category.includes('shop') || category.includes('retail')) {
      return '🛍️';
    } else if (category.includes('gas') || category.includes('fuel')) {
      return '⛽';
    } else if (category.includes('parking')) {
      return '🅿️';
    } else if (category.includes('hospital') || category.includes('medical')) {
      return '🏥';
    } else if (category.includes('pharmacy')) {
      return '💊';
    } else if (category.includes('school') || category.includes('education')) {
      return '🏫';
    } else if (category.includes('park')) {
      return '🌳';
    } else if (category.includes('bank') || category.includes('atm')) {
      return '🏦';
    } else if (result.properties?.type === 'address' || result.suggestion?.type === 'address') {
      return '🏠';
    } else if (result.properties?.type === 'poi' || result.suggestion?.type?.startsWith('poi')) {
      return '📍';
    } else {
      return '📍';
    }
  };
  
  // Helper function to get the result type badge
  const getResultType = (result) => {
    // Check for type in the new API format
    let type = '';
    
    // Try to get type from different possible locations in the result
    if (result.properties?.type) {
      type = result.properties.type;
    } else if (result.suggestion?.type) {
      type = result.suggestion.type;
    } else if (result.place_type && result.place_type.length > 0) {
      type = result.place_type[0];
    }
    
    // Create user-friendly type label
    if (type.startsWith('poi')) {
      if (result.properties?.poi_category === 'food_and_drink') {
        return 'Restaurant/Cafe';
      } else if (result.properties?.category) {
        // Capitalize first letter and convert underscores to spaces
        return result.properties.category
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else {
        return 'Point of Interest';
      }
    } else if (type === 'address') {
      return 'Address';
    } else if (type === 'street') {
      return 'Street';
    } else if (type === 'neighborhood') {
      return 'Neighborhood';
    } else if (type === 'place') {
      return 'Place';
    } else if (type === 'district') {
      return 'District';
    } else if (type === 'region') {
      return 'Region';
    } else if (type === 'country') {
      return 'Country';
    } else {
      return 'Location';
    }
  };
  
  // Get the address display text
  const getAddressText = (result) => {
    const name = result.text || result.properties?.name || '';
    const address = result.place_name || result.properties?.full_address || result.properties?.place_formatted || '';
    
    if (name && address && address.includes(name)) {
      return address;
    } else if (name && address) {
      return address.replace(name + ', ', '');
    } else {
      return address;
    }
  };
  
  return (
    <View style={styles.searchResultsContainer}>
      <ScrollView>
        {results.map((result, index) => (
          <TouchableOpacity
            key={index}
            style={styles.searchResultItem}
            onPress={() => onSelectPlace(result)}
          >
            <View style={styles.resultContent}>
              <Text style={styles.categoryIcon}>{getCategoryIcon(result)}</Text>
              <View style={styles.resultTextContainer}>
                <Text style={styles.searchResultName}>{result.text}</Text>
                <Text style={styles.searchResultAddress}>
                  {getAddressText(result)}
                </Text>
              </View>
            </View>
            
            <View style={styles.resultTypeBadge}>
              <Text style={styles.resultTypeText}>{getResultType(result)}</Text>
            </View>
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
    maxHeight: 300, // Increased to show more results
    ...Shadows.small,
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  resultTextContainer: {
    flex: 1,
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
  resultTypeBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  resultTypeText: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
}); 