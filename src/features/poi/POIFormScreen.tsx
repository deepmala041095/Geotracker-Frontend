import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Button, Alert, ScrollView } from 'react-native';
import { poiService } from '@api/poiService';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { POIStackParamList } from '../../navigation/types';

type POIFormScreenRouteProp = RouteProp<POIStackParamList, 'POIForm'>;

export default function POIFormScreen() {
  const route = useRoute<POIFormScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<POIStackParamList>>();
  
  // Get the ID from route params (will be undefined for new POIs)
  const id = route.params?.id;
  
  // We're in create mode if there's no ID or if ID is 'new'
  console.log('ID:', id);
  const isCreateMode = !id || id === 'new';

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const loadPOI = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Loading POI with ID: ${id}`);
      const data = await poiService.getById(id);
      
      if (!data) {
        throw new Error('POI not found');
      }
      
      console.log('Loaded POI data:', data);
      setName(data.name || '');
      setDescription(data.description || '');
      setLatitude(data.latitude != null ? String(data.latitude) : '');
      setLongitude(data.longitude != null ? String(data.longitude) : '');
    } catch (error) {
      console.error('Error loading POI:', error);
      Alert.alert(
        'Error', 
        `Failed to load POI data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Load POI data when component mounts or id changes
  useEffect(() => {
    if (isCreateMode) {
      // For new POI, reset the form
      setName('');
      setDescription('');
      setLatitude('');
      setLongitude('');
      setLoading(false);
    } else if (id) {
      // For existing POI, load the data
      loadPOI();
    }
  }, [id, isCreateMode]);
  
  // Update screen title based on create/edit mode
  useEffect(() => {
    navigation.setOptions({
      title: isCreateMode ? 'Add New POI' : 'Edit POI',
    });
  }, [isCreateMode, navigation]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    
    const lat = Number(latitude);
    const lng = Number(longitude);
    
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert('Validation', 'Latitude and Longitude must be valid numbers');
      return;
    }
    
    setSaving(true);
    try {
      if (isCreateMode) {
        console.log('Creating new POI...');
        await poiService.createPOI({
          name: name.trim() || 'Unnamed POI',
          description: description.trim() || '',
          latitude: isNaN(lat) ? 0 : lat,
          longitude: isNaN(lng) ? 0 : lng,
        });
      } else if (id) {
        console.log(`Updating POI with ID: ${id}`);
        await poiService.updatePOI(id, {
          name: name.trim() || 'Unnamed POI',
          description: description.trim() || '',
          latitude: isNaN(lat) ? 0 : lat,
          longitude: isNaN(lng) ? 0 : lng,
        });
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading POI data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" />

      <Text style={styles.label}>Latitude</Text>
      <TextInput style={styles.input} value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" placeholder="Latitude" />

      <Text style={styles.label}>Longitude</Text>
      <TextInput style={styles.input} value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" placeholder="Longitude" />

      <View style={styles.actions}>
        <Button title={saving ? 'Saving...' : 'Save'} onPress={onSave} disabled={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, color: '#333', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginTop: 6 },
  actions: { marginTop: 24 },
});
