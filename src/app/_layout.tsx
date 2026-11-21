import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.frame}>
        <View style={styles.column}>
          <StoreProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="tx/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="spikes/storage" options={{ headerShown: true, title: 'Storage spike', headerTintColor: colors.accent }} />
              <Stack.Screen name="spikes/auth" options={{ headerShown: true, title: 'Auth spike', headerTintColor: colors.accent }} />
              <Stack.Screen name="spikes/drive" options={{ headerShown: true, title: 'Drive spike', headerTintColor: colors.accent }} />
              <Stack.Screen name="spikes/calendar" options={{ headerShown: true, title: 'Calendar spike', headerTintColor: colors.accent }} />
            </Stack>
          </StoreProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

// On wide web screens the phone layout sits in a centred column.
const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: Platform.OS === 'web' ? colors.border : colors.bg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, backgroundColor: colors.bg, overflow: 'hidden' },
});
