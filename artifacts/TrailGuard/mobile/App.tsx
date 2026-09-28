import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import PatrolScreen from './src/screens/PatrolScreen';
import IncidentScreen from './src/screens/IncidentScreen';
import ConflictScreen from './src/screens/ConflictScreen';
import ReportScreen from './src/screens/ReportScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0A100C' },
          headerTintColor: '#E6F0E6',
          contentStyle: { backgroundColor: '#0A100C' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TrailGuard' }} />
        <Stack.Screen name="Patrol" component={PatrolScreen} options={{ title: 'Patrol' }} />
        <Stack.Screen name="Incident" component={IncidentScreen} options={{ title: 'Incident' }} />
        <Stack.Screen name="Conflict" component={ConflictScreen} options={{ title: 'Conflict' }} />
        <Stack.Screen name="Reports" component={ReportScreen} options={{ title: 'Reports' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
