import * as SecureStore from 'expo-secure-store';

const KEY = 'googleRefreshToken';
export const getRefreshToken = () => SecureStore.getItemAsync(KEY);
export const setRefreshToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const clearRefreshToken = () => SecureStore.deleteItemAsync(KEY);
