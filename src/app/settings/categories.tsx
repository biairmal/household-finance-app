import { useState } from 'react';
import { View } from 'react-native';
import { Category } from '@/domain/types';
import { budgets, categories, transactions } from '@/store/selectors';
import { Button, Card, Field, IconCircle, PageHeader, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { EmojiPicker } from '@/ui/EmojiPicker';
import { Segmented } from '@/ui/Segmented';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

const OTHER: Record<Category['kind'], string> = { expense: 'Other', income: 'Other income' };

export default function Categories() {
  const store = useStore();
  const [kind, setKind] = useState<Category['kind']>('expense');
  const [editing, setEditing] = useState<string | null>(null); // a category id, 'new', or null
  const list = useAppState((s) => categories(s).filter((c) => c.kind === kind));

  const remove = async (c: Category) => {
    const s = store.getState();
    const txs = transactions(s).filter((t) => t.categoryId === c.id);
    const other = categories(s).find((x) => x.kind === c.kind && x.name === OTHER[c.kind] && x.id !== c.id);
    const msg = txs.length ? `${txs.length} transaction${txs.length > 1 ? 's' : ''} will move to ${OTHER[c.kind]}.` : 'You can restore it for 30 days.';
    if (!(await confirm(`Delete ${c.name}?`, msg, 'Delete', true))) return;
    await store.batch((tx) => {
      const otherId = txs.length ? (other?.id ?? tx.create('category', { name: OTHER[c.kind], emoji: c.kind === 'expense' ? '📦' : '➕', kind: c.kind })) : null;
      txs.forEach((t) => tx.update('transaction', t.id, { categoryId: otherId }));
      budgets(s).filter((b) => b.categoryId === c.id).forEach((b) => tx.remove('budget', b.id));
      tx.remove('category', c.id);
    });
    setEditing(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Categories" />
      <Screen style={{ padding: 16, gap: 12 }}>
        <Segmented label="Kind" value={kind} onChange={(k) => { setKind(k); setEditing(null); }} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        <Card>
          {list.map((c, i) =>
            editing === c.id ? (
              <Editor key={c.id} initial={c} onDone={() => setEditing(null)} onDelete={c.name === OTHER[c.kind] ? undefined : () => remove(c)} />
            ) : (
              <Row
                key={c.id}
                last={i === list.length - 1}
                onPress={() => setEditing(c.id)}
                label={`Edit ${c.name}`}
                left={<IconCircle emoji={c.emoji} size={36} />}
                title={c.name}
              />
            ),
          )}
        </Card>
        {editing === 'new' ? (
          <Card>
            <Editor initial={{ name: '', emoji: kind === 'expense' ? '📦' : '💰', kind }} onDone={() => setEditing(null)} />
          </Card>
        ) : (
          <Button title="Add category" kind="secondary" onPress={() => setEditing('new')} />
        )}
      </Screen>
    </View>
  );
}

function Editor({ initial, onDone, onDelete }: { initial: Partial<Category> & Pick<Category, 'name' | 'emoji' | 'kind'>; onDone: () => void; onDelete?: () => void }) {
  const store = useStore();
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState(initial.emoji);
  const save = async () => {
    if (initial.id) {
      const patch = Object.fromEntries(Object.entries({ name: name.trim(), emoji }).filter(([k, v]) => initial[k as 'name' | 'emoji'] !== v));
      await store.update('category', initial.id, patch);
    } else {
      await store.create('category', { name: name.trim(), emoji, kind: initial.kind });
    }
    onDone();
  };
  return (
    <View style={{ paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <Field label="Name" value={name} onChangeText={setName} autoFocus maxLength={30} />
      <EmojiPicker value={emoji} onChange={setEmoji} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title="Save" small onPress={save} disabled={!name.trim()} />
        <Button title="Cancel" small kind="secondary" onPress={onDone} />
        {onDelete && <Button title="Delete" small kind="ghost" onPress={onDelete} style={{ marginLeft: 'auto' }} />}
      </View>
    </View>
  );
}

