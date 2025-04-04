import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { searchMapboxLocations } from '../../utils/mapUtils';
import { Colors, Shadows, Buttons } from '../../styles/common';

export const SearchBar = ({ onUpdateResults, onFlyToUserLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  // Search for locations using Mapbox API
  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      onUpdateResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results = await searchMapboxLocations(query);
      onUpdateResults(results);
    } catch (error) {
      console.error("Error searching for location:", error);
      onUpdateResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    
    // Only search if there's enough text to search
    if (text.length >= 3) {
      searchLocation(text);
    } else {
      onUpdateResults([]);
    }
  };
  
  return (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputContainer}>
        <TouchableOpacity>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location..."
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#666" />
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={onFlyToUserLocation}
      >
        <Text style={styles.locationIcon}>📍</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    ...Shadows.small,
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  locationButton: {
    ...Buttons.icon,
  },
  locationIcon: {
    fontSize: 20,
  },
}); 