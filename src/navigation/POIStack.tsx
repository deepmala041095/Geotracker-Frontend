import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import POIListScreen from '../features/poi/POIListScreen';
import POIDetailScreen from '../features/poi/POIDetailScreen';
import POIFormScreen from '../features/poi/POIFormScreen';

export type POIStackParamList = {
  POIList: undefined;
  POIForm: { id?: string | number };
  POIDetail: { id: string | number };
};

const Stack = createNativeStackNavigator<POIStackParamList>();


export default function POIStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="POIList" 
        component={POIListScreen} 
        options={{ title: 'Points of Interest' }}
      />
      <Stack.Screen 
        name="POIDetail" 
        component={POIDetailScreen} 
        options={({ route }) => ({ 
          title: 'POI Details',
          // You can customize the header here if needed
        })}
      />
      <Stack.Screen 
        name="POIForm" 
        component={POIFormScreen} 
        options={({ route }) => ({
          title: route.params?.id ? 'Edit POI' : 'Add POI'
        })}
      />
    </Stack.Navigator>
  );
}
