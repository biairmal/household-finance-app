import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Small spike-only key/value: localStorage on web (also readable on the non-isolated Picker page), SecureStore on Android.
export const getPref = async (key: string): Promise<string | null> =>
  Platform.OS === 'web' ? localStorage.getItem(key) : SecureStore.getItemAsync(key);

export const setPref = async (key: string, value: string) =>
  Platform.OS === 'web' ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
