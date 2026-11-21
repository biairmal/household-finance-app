import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { serializeBackup } from '../domain/export';
import { todayJakarta } from '../domain/dates';
import { Store } from './store';

export const backupName = () => 'household-backup-' + todayJakarta() + '.json';

/** Writes the whole op log to the cache folder and opens the share sheet. */
export async function backUpNow(store: Store): Promise<void> {
  const json = serializeBackup(await store.loadOps(), { householdId: 'local', exportedAt: new Date().toISOString() });
  const file = new File(Paths.cache, backupName());
  file.create({ overwrite: true });
  await file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your backup' });
}
