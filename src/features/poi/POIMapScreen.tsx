import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Dimensions, Text } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { poiService, type POI } from '@api/poiService';

export default function MapScreen() {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const pois = await poiService.getPOIs(1, 200);
        setPois(pois);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const validPois = useMemo(
    () => pois.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) as Required<Pick<POI, 'id' | 'name' | 'description' | 'latitude' | 'longitude'>>[],
    [pois]
  );

  const initialRegion: Region = useMemo(() => {
    if (validPois.length > 0) {
      return {
        latitude: validPois[0].latitude as number,
        longitude: validPois[0].longitude as number,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
    }
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    };
  }, [validPois]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (validPois.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No POIs to display.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {validPois.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude as number, longitude: p.longitude as number }}
            title={p.name}
            description={p.description}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
