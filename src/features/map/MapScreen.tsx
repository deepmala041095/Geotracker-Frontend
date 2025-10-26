import React, { useState, useEffect, useCallback } from 'react';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/AppNavigator';
import MapView, { PROVIDER_GOOGLE, Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Alert, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { POI, NewPOI } from '../../types/poi';
import { usePOIStorage } from '../../hooks/usePOIStorage';

type MapScreenProps = BottomTabScreenProps<RootTabParamList, 'Map'>;

export default function MapScreen({ navigation }: MapScreenProps) {
  const [location, setLocation] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [newPOI, setNewPOI] = useState<NewPOI>({
    name: '',
    description: '',
    latitude: 0,
    longitude: 0,
  });
  
  const { pois, isLoading: isLoadingPOIs, isOnline, syncInProgress, syncWithServer, addPOI } = usePOIStorage();

  useEffect(() => {
    (async () => {
      try {
        console.log('Requesting location permissions...');
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          Alert.alert(
            'Permission Denied',
            'Please enable location services to use this feature',
            [{ text: 'OK' }]
          );
          return;
        }
        
        console.log('Getting current position...');
        let loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeInterval: 5000
        });
        
        console.log('Location found:', loc.coords);
        setLocation(loc.coords);
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert(
          'Error',
          'Could not get your location. Please try again.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSync} 
          style={{ marginRight: 15 }}
          disabled={syncInProgress}
        >
          <Ionicons 
            name={syncInProgress ? 'refresh' : 'refresh-outline'} 
            size={24} 
            color={isOnline ? '#007AFF' : '#FF3B30'} 
          />
        </TouchableOpacity>
      ),
    });
  }, [isOnline, syncInProgress]);

  const handleSync = useCallback(async () => {
    try {
      const success = await syncWithServer();
      Alert.alert(
        success ? 'Sync Complete' : 'Sync Failed',
        success 
          ? 'Your POIs have been synced with the server.' 
          : 'Failed to sync with the server. Please check your connection.'
      );
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', 'An error occurred during sync. Please try again.');
    }
  }, [syncWithServer]);

  if (!location || isLoadingPOIs || !pois) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          {!location ? 'Getting your location...' : 'Loading POIs...'}
        </Text>
      </View>
    );
  }

  const handleMapPress = (e: any) => {
    const { coordinate } = e.nativeEvent;
    setSelectedLocation(coordinate);
    setNewPOI(prev => ({
      ...prev,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    }));
    setIsAddingPOI(true);
  };

  const handleAddPOI = async () => {
    if (!newPOI.name.trim()) {
      Alert.alert('Error', 'Please enter a name for the POI');
      return;
    }

    try {
      await addPOI(newPOI);
      setNewPOI({ name: '', description: '', latitude: 0, longitude: 0 });
      setIsAddingPOI(false);
    } catch (error) {
      console.error('Failed to save POI:', error);
      Alert.alert('Error', 'Failed to save POI. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {location ? (
        <>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsMyLocationButton={true}
            followsUserLocation={true}
            showsCompass={true}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            onPress={handleMapPress}
          >
            {pois.map((poi) => (
              <Marker
                key={poi.id}
                coordinate={{
                  latitude: poi.latitude,
                  longitude: poi.longitude,
                }}
                title={poi.name}
                description={poi.description}
              >
                <Callout>
                  <View>
                    <Text style={styles.calloutTitle}>{poi.name}</Text>
                    <Text>{poi.description}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          <Modal
            visible={isAddingPOI}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsAddingPOI(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New POI</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  value={newPOI.name}
                  onChangeText={(text) => setNewPOI({...newPOI, name: text})}
                />
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="Description"
                  multiline
                  numberOfLines={3}
                  value={newPOI.description}
                  onChangeText={(text) => setNewPOI({...newPOI, description: text})}
                />
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsAddingPOI(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleAddPOI}
                  >
                    <Text style={styles.buttonText}>Save POI</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
});
