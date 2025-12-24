import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AppNavigator from './AppNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
          },
          headerTintColor: isDark ? '#f9fafb' : '#111827',
          headerShown: false,
        }}
      >
        <Stack.Screen name="Main" component={AppNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
