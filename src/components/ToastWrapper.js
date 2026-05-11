import React, { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import Toast from '../components/shared/Toast';

export function useToast() {
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const [toast, setToast] = React.useState(null);

  const showToast = useCallback(({ title, body }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, body });
    toastOpacity.setValue(0);
    Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
  }, [toastOpacity, toastTimer]);

  return { toast, toastOpacity, showToast };
}

export default function ToastWrapper({ toast, toastOpacity }) {
  return <Toast toast={toast} toastAnim={toastOpacity} />;
}