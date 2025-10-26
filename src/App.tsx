
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppNavigator } from './navigation';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from './hooks/useNetworkStatus';

export default function App() {
  const isOnline = useNetworkStatus();
  return (
    <Provider store={store}>
      <NavigationContainer>
        {isOnline === false && (
          <View style={styles.offlineContainer}>
            <Text style={styles.offlineText}>You are currently offline</Text>
          </View>
         )}
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </Provider>
  );
}

const styles = StyleSheet.create({
  offlineContainer: {
    backgroundColor: '#b52424',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
  },
});