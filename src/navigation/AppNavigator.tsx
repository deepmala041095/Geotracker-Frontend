import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '@features/map/MapScreen';
import POIStack from './POIStack';
import SettingsScreen from '@features/settings/SettingsScreen';

export type RootTabParamList = {
  Map: undefined;
  POIStack: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="POIStack" 
        component={POIStack} 
        options={{ 
          title: 'POIs',
          headerShown: false
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}
