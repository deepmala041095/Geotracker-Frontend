import React, { useEffect, useState, useCallback } from 'react';
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
import { useRef } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { POIStackParamList } from '../../navigation/types';
import { MaterialIcons } from '@expo/vector-icons';
import { poiService, type POI, type Paginated } from '../../api/poiService';

type POIListScreenNavigationProp = NativeStackNavigationProp<POIStackParamList, 'POIList'>;

interface POIListScreenProps {
  navigation: POIListScreenNavigationProp;
};

export default function POIListScreen({ navigation: nav }: POIListScreenProps) {
  // Use the navigation hook to ensure navigation is available
  const navigation = useNavigation<POIListScreenNavigationProp>();
  const [data, setData] = useState<POI[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMounted = useRef(true);
  const lastRequestTime = useRef(0);

  const loadPage = useCallback(async (targetPage: number, replace = false) => {
    // Prevent multiple simultaneous requests and rapid firing
    const now = Date.now();
    if (now - lastRequestTime.current < 1000) { // 1 second debounce
      console.log('Skipping rapid request');
      return;
    }
    lastRequestTime.current = now;

    const isInitialLoad = targetPage === 1 && !loading && !refreshing;
    const shouldSkip = 
      (loading && !isInitialLoad) || 
      (targetPage > 1 && (data.length >= total || !total));
      
    if (shouldSkip) {
      console.log('Skipping load:', { targetPage, loading, refreshing, dataLength: data.length, total });
      return;
    }
    
    console.log('Loading page:', targetPage, 'replace:', replace);
    
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else if (replace || targetPage === 1) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await poiService.list(targetPage, limit);
      console.log('API Response:', response);
      
      if (response && Array.isArray(response.data)) {
        const newData = response.data;
        
        setTotal(response.total || newData.length);
        setData(prev => {
          if (replace || targetPage === 1) {
            return newData;
          }
          // Merge with existing data, avoiding duplicates
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNewData = newData.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewData];
        });
        
        setPage(targetPage);
      }
    } catch (error) {
      console.error('Error loading POIs:', error);
      // Only show error on initial load or refresh
      if (targetPage === 1) {
        Alert.alert('Error', 'Failed to load POIs. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit, loading, refreshing, data.length, total]);

  useFocusEffect(
    useCallback(() => {
      // Only load if we don't have data
      if (data.length === 0) {
        console.log('Initial load - fetching data');
        loadPage(1, true);
      }
      
      // Cleanup function
      return () => {
        // Any cleanup if needed
      };
    }, [loadPage, data.length])
  );

  const onEndReached = useCallback(() => {
    const hasMore = total === 0 || data.length < total;
    const shouldLoadMore = !loading && hasMore && !refreshing;
    
    if (shouldLoadMore) {
      console.log('Loading more items...');
      loadPage(page + 1);
    } else {
      console.log('Skipping load more:', { 
        loading, 
        hasMore, 
        refreshing, 
        dataLength: data.length, 
        total,
        nextPage: page + 1
      });
    }
  }, [data.length, total, loading, refreshing, page, loadPage]);

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      console.log('Refresh already in progress');
      return;
    }
    
    console.log('Starting manual refresh');
    try {
      // Clear existing data before refresh
      setData([]);
      setPage(1);
      await loadPage(1, true);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, [loadPage, refreshing]);

  const handleDelete = async (id: string) => {
    try {
      await poiService.deletePOI(id);
      setData(prev => prev.filter(item => item.id !== id));
      Alert.alert('Success', 'POI deleted successfully');
    } catch (error) {
      console.error('Error deleting POI:', error);
      Alert.alert('Error', 'Failed to delete POI. Please try again.');
    }
  };

  const showActionSheet = (id: string) => {
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
            showDeleteConfirmation(id);
          }
        },
      );
    } else {
      // For Android, we'll use Alert with options
      Alert.alert(
        'POI Actions',
        'Choose an action',
        [
          { text: 'View', onPress: () => navigation.navigate('POIDetail', { id }) },
          { text: 'Edit', onPress: () => navigation.navigate('POIForm', { id: String(id) }) },
          {
            text: 'Delete',
            onPress: () => showDeleteConfirmation(id),
            style: 'destructive',
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true },
      );
    }
  };

  const showDeleteConfirmation = (id: string) => {
    Alert.alert(
      'Delete POI',
      'Are you sure you want to delete this POI?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(id),
        },
      ],
      { cancelable: true },
    );
  };

  const renderItem = ({ item }: { item: POI }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('POIDetail', { id: item.id })}
      onLongPress={() => showActionSheet(item.id)}
      style={styles.itemContainer}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: '#2196F3' }]}>{item.name}</Text>
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
      >
        <MaterialIcons name="more-vert" size={24} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && data.length === 0) {
    return (
      <View style={styles.center} testID="loading-indicator">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centerEmpty} testID="empty-state">
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="location-off" size={48} color="#999" />
              <Text style={styles.emptyStateText}>
                {loading ? 'Loading...' : 'No points of interest found'}
              </Text>
              {!loading && (
                <Text style={styles.emptyStateSubtext}>
                  Tap the + button to add a new location
                </Text>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          loading && data.length > 0 && data.length < total ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('POIForm', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
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
    margin: -8,
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
  },
  centerEmpty: { 
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
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
    maxWidth: 300,
  },
  item: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  itemCoords: { fontSize: 12, color: '#999', marginTop: 4 },
  footer: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  fab: { 
    position: 'absolute', 
    right: 16, 
    bottom: 24, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#007AFF', 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: '700', 
    marginTop: -2 
  },
});
