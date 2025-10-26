import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Button, 
  Alert, 
  ScrollView, 
  Linking, 
  TouchableOpacity,
  Platform,
  Share
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { poiService, type POI } from '@api/poiService';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';

interface RouteParams {
  id: string | number;
  distance?: number;
}

const DetailRow = ({ icon, label, value, isLink = false, onPress }: { 
  icon: React.ReactNode, 
  label: string, 
  value?: string | number | null,
  isLink?: boolean,
  onPress?: () => void
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>{icon}</View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      {value ? (
        <TouchableOpacity onPress={onPress} disabled={!onPress}>
          <Text 
            style={[
              styles.detailValue,
              (isLink || onPress) && styles.linkText
            ]}
            numberOfLines={2}
          >
            {value}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.detailValue, styles.notAvailable]}>Not available</Text>
      )}
    </View>
  </View>
);

export default function POIDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id, distance } = (route.params || {}) as RouteParams & { distance?: number };

  const [poi, setPoi] = useState<POI | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Get user location for directions
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          setUserLocation(location.coords);
        }
      } catch (locationError) {
        console.warn('Error getting location:', locationError);
        // Continue loading POI even if location fails
      }
      
      // Get POI details
      const data = await poiService.getById(Number(id));
      if (!data) {
        throw new Error('POI not found');
      }
      setPoi(data);
    } catch (error) {
      console.error('Error loading POI details:', error);
      Alert.alert('Error', 'Failed to load POI details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or id changes
  useEffect(() => {
    load();
  }, [id]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, refreshing data...');
      load();
    }, [id])
  );

  const handleGetDirections = async () => {
    if (!poi?.latitude || !poi?.longitude) {
      Alert.alert('Error', 'Location coordinates are not available for this POI.');
      return;
    }
    
    try {
      const scheme = Platform.select({ 
        ios: 'maps:', 
        android: 'geo:' 
      });
      
      const url = Platform.select({
        ios: `maps?q=${poi.latitude},${poi.longitude}(${encodeURIComponent(poi.name || 'Location')})`,
        android: `geo:${poi.latitude},${poi.longitude}?q=${poi.latitude},${poi.longitude}(${encodeURIComponent(poi.name || 'Location')})`
      });
      
      const supported = await Linking.canOpenURL(`${scheme}${url}`);
      
      if (supported) {
        await Linking.openURL(`${scheme}${url}`);
      } else {
        // Fallback to web URL if native app is not available
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}`;
        await WebBrowser.openBrowserAsync(webUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Could not open maps. Please try again.');
    }
  };

  const handleOpenWebsite = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url.startsWith('http') ? url : `https://${url}`);
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Could not open the website.');
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleShare = async () => {
    if (!poi) return;
    
    try {
      await Share.share({
        message: `Check out ${poi.name} at ${poi.latitude}, ${poi.longitude}.`,
        title: poi.name
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const onDelete = async () => {
    Alert.alert(
      'Delete POI', 
      'Are you sure you want to delete this POI? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await poiService.deletePOI(Number(id).toString());
              // Navigate back to the list screen with a refresh flag
              navigation.navigate('POIList', { refresh: true });
            } catch (error) {
              console.error('Error deleting POI:', error);
              Alert.alert(
                'Error', 
                'Failed to delete POI. Please try again.',
                [
                  { 
                    text: 'Retry', 
                    onPress: onDelete 
                  },
                  { 
                    text: 'Cancel', 
                    style: 'cancel' 
                  }
                ]
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!poi) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="location-off" size={48} color="#999" />
        <Text style={styles.notFoundText}>POI not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{poi.name}</Text>
          <Text style={styles.category}>{poi.category || 'Point of Interest'}</Text>
          
          {distance !== undefined && (
            <View style={styles.distanceBadge}>
              <MaterialIcons name="directions-walk" size={16} color="#fff" />
              <Text style={styles.distanceText}>
                {distance < 1 
                  ? `${Math.round(distance * 1000)}m away` 
                  : `${distance.toFixed(1)} km away`}
              </Text>
            </View>
          )}
        </View>

        {poi.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{poi.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <DetailRow 
            icon={<MaterialIcons name="location-on" size={20} color="666" />}
            label="Location"
            value={`${poi.latitude?.toFixed(4)}, ${poi.longitude?.toFixed(4)}`}
            isLink={!!poi.latitude && !!poi.longitude}
            onPress={handleGetDirections}
          />
          
          {poi.phone && (
            <DetailRow 
              icon={<MaterialIcons name="phone" size={20} color="#666" />}
              label="Phone"
              value={poi.phone}
              isLink
              onPress={() => handleCall(poi.phone!)}
            />
          )}
          
          {poi.email && (
            <DetailRow 
              icon={<MaterialIcons name="email" size={20} color="#666" />}
              label="Email"
              value={poi.email}
              isLink
              onPress={() => Linking.openURL(`mailto:${poi.email}`)}
            />
          )}
          
          {poi.website && (
            <DetailRow 
              icon={<MaterialIcons name="public" size={20} color="#666" />}
              label="Website"
              value={poi.website.replace(/^https?:\/\//, '')}
              isLink
              onPress={() => handleOpenWebsite(poi.website!)}
            />
          )}
          
          <DetailRow 
            icon={<MaterialIcons name="schedule" size={20} color="#666" />}
            label="Hours"
            value={poi.hours || 'Not specified'}
          />
          
          {poi.rating !== undefined && (
            <DetailRow 
              icon={<FontAwesome name="star" size={20} color="#FFD700" />}
              label="Rating"
              value={`${poi.rating}/5`}
            />
          )}
          
          <DetailRow 
            icon={<MaterialIcons name="location-on" size={20} color="#666" />}
            label="Coordinates"
            value={poi.latitude && poi.longitude 
              ? `${poi.latitude.toFixed(6)}, ${poi.longitude.toFixed(6)}`
              : 'Not available'}
          />
        </View>

        {poi.tags && poi.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {poi.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.directionsButton]}
              onPress={handleGetDirections}
              disabled={!poi.latitude || !poi.longitude}
            >
              <MaterialIcons name="directions" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShare}
            >
              <MaterialIcons name="share" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerButton, styles.editButton]}
          onPress={() => {
            if (!poi) return;
            navigation.navigate('POIForm', { 
              id: poi.id
            });
          }}
        >
          <MaterialIcons name="edit" size={20} color="#fff" />
          <Text style={styles.footerButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.footerButton, styles.deleteButton]}
          onPress={onDelete}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={styles.footerButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Space for footer
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  notFoundText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 24,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  linkText: {
    color: '#007AFF',
  },
  notAvailable: {
    color: '#999',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4a6da7',
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  directionsButton: {
    backgroundColor: '#007AFF',
  },
  shareButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
