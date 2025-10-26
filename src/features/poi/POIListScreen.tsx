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

  const loadPage = useCallback(async (targetPage: number, replace = false) => {
    if (loading || refreshing || (targetPage > 1 && data.length >= total && total > 0)) {
      return;
    }
    
    setLoading(true);
    try {
      // First try to get data from the server
      try {
        const res = await poiService.list(targetPage, limit);
        if (res && res.data) {
          setTotal(res.total || res.data.length);
          if (replace) {
            setData(res.data);
          } else {
            setData(prev => (targetPage === 1 ? res.data : [...prev, ...res.data]));
          }
          setPage(targetPage);
          return;
        }
      } catch (error) {
        console.error('Error fetching from server, falling back to getPOIs:', error);
      }
      
      // Fallback to getPOIs if list fails or returns unexpected format
      const pois = await poiService.getPOIs(targetPage, limit);
      if (pois && Array.isArray(pois)) {
        setTotal(pois.length);
        setData(prev => (targetPage === 1 ? pois : [...prev, ...pois]));
        setPage(targetPage);
      }
    } catch (error) {
      console.error('Error loading POIs:', error);
      Alert.alert('Error', 'Failed to load POIs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit, loading, refreshing, data.length, total]);

  useFocusEffect(
    useCallback(() => {
      loadPage(1, true);
    }, [loadPage])
  );

  const onEndReached = useCallback(() => {
    const hasMore = data.length < total;
    if (!loading && hasMore && !refreshing) {
      loadPage(page + 1);
    }
  }, [data.length, total, loading, refreshing, page, loadPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPage(1, true);
    setRefreshing(false);
  };

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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
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
          <View style={styles.centerEmpty}>
            {loading ? (
              <ActivityIndicator size="large" />
            ) : (
              <Text>No POIs found</Text>
            )}
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
    flexGrow: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
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
