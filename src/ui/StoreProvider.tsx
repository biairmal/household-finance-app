import { usePathname } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { State } from '../domain/sync/ops';
import { sqliteOpsDb } from '../store/opsDb.sqlite';
import { Store, createStore } from '../store/store';
import { colors, font } from './theme';

type Ctx = { store: Store; onboarded: boolean; setOnboarded: () => Promise<void>; sizeBytes: () => Promise<number> };
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS === 'web') navigator.storage?.persist?.().catch(() => undefined);
        const db = await sqliteOpsDb();
        const store = await createStore(db);
        const onboarded = (await store.meta.get('onboarded')) === '1';
        if (cancelled) return;
        const value: Ctx = {
          store,
          onboarded,
          sizeBytes: db.sizeBytes,
          setOnboarded: async () => {
            await store.meta.set('onboarded', '1');
            setCtx({ ...value, onboarded: true });
          },
        };
        setCtx(value);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The spike screens don't use the store and must stay reachable to diagnose storage problems.
  if (pathname.startsWith('/spikes') && !ctx) return <>{children}</>;
  if (error) {
    const hint =
      Platform.OS === 'web' && !globalThis.crossOriginIsolated
        ? 'This page is not cross-origin isolated (crossOriginIsolated is false), so the database cannot open. The server must send COOP and COEP headers for this path.'
        : null;
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Could not open your data</Text>
        <Text style={styles.body}>{error}</Text>
        {hint && <Text style={styles.body}>{hint}</Text>}
      </View>
    );
  }
  if (!ctx) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  return <StoreContext.Provider value={ctx}>{children}</StoreContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

export const useStore = (): Store => useCtx().store;
export const useOnboarding = () => {
  const { onboarded, setOnboarded } = useCtx();
  return { onboarded, setOnboarded };
};
export const useDbSize = () => useCtx().sizeBytes;

/** Reads the store. Re-renders only when the selector's result changes identity (selectors cache per table). */
export function useAppState<T>(selector: (s: State) => T): T {
  const store = useStore();
  const cache = useRef<{ state: State | null; value: T; selector: ((s: State) => T) | null }>({ state: null, value: undefined as T, selector: null });
  const getSnapshot = () => {
    const state = store.getState();
    const c = cache.current;
    if (c.state !== state || c.selector !== selector) {
      c.state = state;
      c.selector = selector;
      c.value = selector(state);
    }
    return c.value;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.bg },
  title: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  body: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
