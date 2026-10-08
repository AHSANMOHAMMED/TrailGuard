import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { initLocalStore } from './src/store/localStore';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import PatrolScreen from './src/screens/PatrolScreen';
import IncidentScreen from './src/screens/IncidentScreen';
import ConflictScreen from './src/screens/ConflictScreen';
import ReportScreen from './src/screens/ReportScreen';
import HomeScreen from './src/screens/HomeScreen';

initLocalStore();

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: '#0A100C' },
          headerTintColor: '#E6F0E6',
          contentStyle: { backgroundColor: '#0A100C' },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Role admin' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TrailGuard' }} />
        <Stack.Screen name="Patrol" component={PatrolScreen} options={{ title: 'Patrol' }} />
        <Stack.Screen name="Incident" component={IncidentScreen} options={{ title: 'Incident' }} />
        <Stack.Screen name="Conflict" component={ConflictScreen} options={{ title: 'Conflict' }} />
        <Stack.Screen name="Reports" component={ReportScreen} options={{ title: 'Reports' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
