import React from 'react';
import { StatusBar } from 'react-native';
import Dojo from './src/screens/Dojo';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ErrorBoundary>
        <Dojo />
      </ErrorBoundary>
    </>
  );
}
