import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SmartArrivalPrototype from './src/SmartArrivalPrototype';

export default function App() {
  return (
    <SafeAreaProvider>
      <SmartArrivalPrototype />
    </SafeAreaProvider>
  );
}
