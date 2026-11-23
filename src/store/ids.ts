import { randomUUID } from 'expo-crypto';

// Hermes has no global `crypto`, so ids come from expo-crypto.
export const newId = (): string => randomUUID();
