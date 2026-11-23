import { serializeBackup } from '../domain/export';
import { todayJakarta } from '../domain/dates';
import { Store } from './store';

export const backupName = () => 'household-backup-' + todayJakarta() + '.json';

/** Downloads the whole op log as a JSON file. */
export async function backUpNow(store: Store): Promise<void> {
  const json = serializeBackup(await store.loadOps(), { householdId: 'local', exportedAt: new Date().toISOString() });
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = backupName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
