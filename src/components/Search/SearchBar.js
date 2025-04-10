import React, { useState, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator, Keyboard } from 'react-native';
import { searchMapboxLocations } from '../../utils/mapUtils';
import { Colors, Shadows, Buttons } from '../../styles/common';

export const SearchBar = ({ onUpdateResults, onFlyToUserLocation, userLocation, onFocus }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef(null);
  
  // Search for locations using Mapbox API
  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      onUpdateResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Pass userLocation to searchMapboxLocations for proximity-based results
      const results = await searchMapboxLocations(query, userLocation);
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

  // Method to clear search and dismiss keyboard
  const clearSearch = () => {
    setSearchQuery('');
    onUpdateResults([]);
    Keyboard.dismiss();
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
    setIsFocused(false);
  };

  // Handle focus of search input
  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };
  
  return (
    <View style={styles.searchBarContainer}>
      <View style={[styles.searchInputContainer, isFocused]}>
        <TouchableOpacity>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search for a location..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={handleFocus}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
        {isSearching && (
          <ActivityIndicator size="small" color="#666" />
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={() => {
          clearSearch();
          onFlyToUserLocation();
        }}
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
  clearIcon: {
    fontSize: 16,
    marginHorizontal: 8,
    color: Colors.gray,
  },
  locationButton: {
    ...Buttons.icon,
  },
  locationIcon: {
    fontSize: 20,
  },
}); 