import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
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
import AlertScreen from './src/screens/AlertScreen';
import RadioScreen from './src/screens/RadioScreen';
import HomeScreen from './src/screens/HomeScreen';
import { getColors, getTheme, subscribeTheme } from './src/theme';

initLocalStore();

const Stack = createNativeStackNavigator();

export default function App() {
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);

  const c = getColors();
  const night = getTheme() === 'night';
  const navTheme = {
    ...(night ? DarkTheme : DefaultTheme),
    colors: {
      ...(night ? DarkTheme.colors : DefaultTheme.colors),
      background: c.bg,
      card: c.surface,
      text: c.fg,
      border: c.border,
      primary: c.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={night ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.fg,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Role admin' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'TrailGuard' }} />
        <Stack.Screen name="Patrol" component={PatrolScreen} options={{ title: 'Patrol' }} />
        <Stack.Screen name="Incident" component={IncidentScreen} options={{ title: 'Incident' }} />
        <Stack.Screen name="Alerts" component={AlertScreen} options={{ title: 'Wildlife Risk Alerts' }} />
        <Stack.Screen name="Conflict" component={ConflictScreen} options={{ title: 'Conflict' }} />
        <Stack.Screen name="Radio" component={RadioScreen} options={{ title: 'Field Radio' }} />
        <Stack.Screen name="Reports" component={ReportScreen} options={{ title: 'Reports' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
