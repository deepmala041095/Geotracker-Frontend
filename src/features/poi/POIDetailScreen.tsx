import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, Alert, ScrollView } from 'react-native';
import { poiService, type POI } from '@api/poiService';
import { useRoute, useNavigation } from '@react-navigation/native';

interface RouteParams {
  id: number;
}

export default function POIDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = (route.params || {}) as RouteParams;

  const [poi, setPoi] = useState<POI | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await poiService.getById(Number(id));
      setPoi(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onDelete = () => {
    Alert.alert('Delete POI', 'Are you sure you want to delete this POI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await poiService.remove(Number(id));
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!poi) {
    return (
      <View style={styles.center}>
        <Text>POI not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{poi.name}</Text>
      <Text style={styles.subtitle}>{poi.description}</Text>
      <Text style={styles.coords}>Latitude: {poi.latitude}</Text>
      <Text style={styles.coords}>Longitude: {poi.longitude}</Text>
      <View style={styles.actions}>
        <Button title="Edit" onPress={() => navigation.navigate('POIForm', { id: poi.id })} />
        <View style={{ width: 12 }} />
        <Button color="#FF3B30" title="Delete" onPress={onDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 8 },
  coords: { fontSize: 14, color: '#333', marginTop: 8 },
  actions: { flexDirection: 'row', marginTop: 24 },
});
