import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import POIListScreen from '../features/poi/POIListScreen';
import POIFormScreen from '../features/poi/POIFormScreen';
// Import POIDetailScreen if it exists, otherwise we'll need to create it
// import POIDetailScreen from '../features/poi/POIDetailScreen';

export type POIStackParamList = {
  POIList: undefined;
  POIForm: { id?: string };
  POIDetail: { id: number };
};

const Stack = createNativeStackNavigator<POIStackParamList>();

function POIDetailScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>POI Detail Screen</Text>
    </View>
  );
}

export default function POIStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="POIList" 
        component={POIListScreen} 
        options={{ title: 'Points of Interest' }}
      />
      <Stack.Screen 
        name="POIForm" 
        component={POIFormScreen} 
        options={{ title: 'Add POI' }}
      />
      <Stack.Screen 
        name="POIDetail" 
        component={POIDetailScreen} 
        options={{ title: 'POI Details' }}
      />
    </Stack.Navigator>
  );
}
