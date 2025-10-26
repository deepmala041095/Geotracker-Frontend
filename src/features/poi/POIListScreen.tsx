import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl, 
  Alert,
  Platform,
  ActionSheetIOS
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { POIStackParamList } from '../../navigation/types';
import { MaterialIcons } from '@expo/vector-icons';
import { poiService, type POI, type Paginated } from '../../api/poiService';

type POIListScreenNavigationProp = NativeStackNavigationProp<POIStackParamList, 'POIList'>;

interface POIListScreenProps {
  navigation: POIListScreenNavigationProp;
}

export default function POIListScreen({ navigation: nav }: POIListScreenProps) {
  const navigation = useNavigation<POIListScreenNavigationProp>();
  const [data, setData] = useState<POI[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radius, setRadius] = useState<number | 'all'>(5);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  
  const isMounted = useRef(true);
  const loadingRef = useRef(false);
  const isInitialMount = useRef(true);

  // Get user location on component mount
  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (isCancelled) return;
        
        if (status !== 'granted') {
          setLocationError('Permission to access location was denied');
          setLocationLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isCancelled) return;

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setLocationError(null);
      } catch (error) {
        console.error('Error getting location:', error);
        if (!isCancelled) {
          setLocationError('Could not get your location');
        }
      } finally {
        if (!isCancelled) {
          setLocationLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Load POIs function with proper error handling
  const loadPOIs = useCallback(async (isRefresh: boolean = false) => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('Load already in progress, skipping...');
      return;
    }

    try {
      loadingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else if (data.length === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let result: POI[] = [];
      let totalCount = 0;

      if (radius === 'all') {
        // Fetch all POIs
        const allPOIs = await poiService.getPOIs(1, 100);
        result = allPOIs;
        totalCount = allPOIs.length;
      } else if (userLocation) {
        // Fetch nearby POIs
        const nearbyResponse = await poiService.nearby(
          userLocation.latitude,
          userLocation.longitude,
          radius
        );
        result = nearbyResponse.data || [];
        totalCount = result.length;
      } else {
        // Fallback to regular list
        const allPOIs = await poiService.getPOIs(1, 100);
        result = allPOIs;
        totalCount = allPOIs.length;
      }

      if (!isMounted.current) return;

      setData(result);
      setTotal(totalCount);
      setPage(1);

    } catch (error) {
      console.error('Error loading POIs:', error);
      
      if (!isMounted.current) return;

      // Show error alert only on initial load or refresh
      if (isRefresh || data.length === 0) {
        Alert.alert(
          'Error Loading POIs',
          'Failed to load POIs. Please check your connection and try again.',
          [
            { text: 'Retry', onPress: () => loadPOIs(isRefresh) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      if (isMounted.current) {
        loadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [data.length, radius, userLocation]);

  // Initial load when location is ready
  useEffect(() => {
    if (locationLoading) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadPOIs(false);
    }
  }, [locationLoading, loadPOIs]);

  // Reload when radius changes
  useEffect(() => {
    if (!isInitialMount.current && !locationLoading) {
      console.log('Radius changed, reloading data...');
      loadPOIs(false);
    }
  }, [radius]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isInitialMount.current && !locationLoading) {
        console.log('Screen focused, refreshing data...');
        loadPOIs(true);
      }
    }, [loadPOIs, locationLoading])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle manual refresh
  const onRefresh = useCallback(() => {
    if (!refreshing && !loading) {
      console.log('Manual refresh triggered');
      loadPOIs(true);
    }
  }, [loadPOIs, refreshing, loading]);

  // Handle delete with proper error handling
  const handleDelete = async (id: string) => {
    try {
      // Show loading indicator
      const itemIndex = data.findIndex(item => item.id === id);
      if (itemIndex === -1) return;

      await poiService.deletePOI(id);
      
      // Remove item optimistically
      setData(prev => prev.filter(item => item.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      
      Alert.alert('Success', 'POI deleted successfully');
    } catch (error) {
      console.error('Error deleting POI:', error);
      Alert.alert(
        'Delete Failed',
        'Failed to delete POI. Please try again.',
        [
          { text: 'Retry', onPress: () => handleDelete(id) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      
      // Refresh to ensure data consistency
      loadPOIs(true);
    }
  };

  const showActionSheet = (id: string | number) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'View', 'Edit', 'Delete'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            navigation.navigate('POIDetail', { id });
          } else if (buttonIndex === 2) {
            navigation.navigate('POIForm', { id: String(id) });
          } else if (buttonIndex === 3) {
            showDeleteConfirmation(String(id));
          }
        }
      );
    } else {
      Alert.alert(
        'POI Actions',
        'Choose an action',
        [
          { text: 'View', onPress: () => navigation.navigate('POIDetail', { id }) },
          { text: 'Edit', onPress: () => navigation.navigate('POIForm', { id: String(id) }) },
          {
            text: 'Delete',
            onPress: () => showDeleteConfirmation(String(id)),
            style: 'destructive',
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  const showDeleteConfirmation = (id: string) => {
    Alert.alert(
      'Delete POI',
      'Are you sure you want to delete this POI? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(id),
        },
      ],
      { cancelable: true }
    );
  };

  // Handle radius change
  const handleRadiusChange = (newRadius: number | 'all') => {
    if (newRadius === radius) return;
    
    console.log('Changing radius to:', newRadius);
    setRadius(newRadius);
    setData([]);
    setPage(1);
  };

  // Radius selector component
  const RadiusSelector = () => (
    <View style={styles.radiusContainer}>
      <Text style={styles.radiusLabel}>
        {radius === 'all' ? 'Showing all POIs' : `Search Radius: ${radius} km`}
      </Text>
      <View style={styles.radiusButtons}>
        {[1, 5, 10, 20, 'all'].map((km) => (
          <TouchableOpacity
            key={km}
            style={[
              styles.radiusButton,
              radius === km && styles.radiusButtonActive
            ]}
            onPress={() => handleRadiusChange(km === 'all' ? 'all' : Number(km))}
            disabled={loading || refreshing}
          >
            <Text style={[
              styles.radiusButtonText,
              radius === km && styles.radiusButtonTextActive
            ]}>
              {km === 'all' ? 'All' : `${km}km`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: POI }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('POIDetail', { id: item.id })}
      onLongPress={() => showActionSheet(item.id)}
      style={styles.itemContainer}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.locationText}>
            {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => showActionSheet(item.id)}
        style={styles.menuButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="more-vert" size={24} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Show loading indicator on initial load
  if (loading && data.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading POIs...</Text>
      </View>
    );
  }

  // Show location loading
  if (locationLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RadiusSelector />
      
      {locationError && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#d32f2f" />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}
      
      {userLocation && !locationError && (
        <View style={styles.locationInfo}>
          <MaterialIcons name="my-location" size={16} color="#007AFF" />
          <Text style={styles.locationInfoText}>
            {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </Text>
        </View>
      )}
      
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={data.length === 0 ? styles.emptyListContent : undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="location-off" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No POIs Found</Text>
              <Text style={styles.emptyStateSubtext}>
                {locationError 
                  ? 'Enable location permissions to see nearby POIs'
                  : 'Tap the + button to add your first location'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        onEndReachedThreshold={0.5}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('POIForm', {})}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
  },
  radiusContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  radiusLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  radiusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  radiusButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    minWidth: 55,
    alignItems: 'center',
  },
  radiusButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radiusButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  radiusButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f4f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  locationInfoText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2196F3',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  menuButton: {
    padding: 8,
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  footer: { 
    paddingVertical: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  fab: { 
    position: 'absolute', 
    right: 20, 
    bottom: 24, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#007AFF', 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});