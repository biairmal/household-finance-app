import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AccountType } from '@/domain/types';
import { ACCOUNT_TYPES, accountOf, allTransactions, members, pockets } from '@/store/selectors';
import { AmountField, Button, Field, PageHeader, Screen, Txt, goBack } from '@/ui/components';
import { ChipPicker } from '@/ui/ChipPicker';
import { confirm } from '@/ui/confirm';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

/** New account, or edit one with ?id=. */
export default function EditAccount() {
  const store = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const account = useAppState((s) => (id ? accountOf(s, id) : undefined));
  const people = useAppState(members);
  const txCount = useAppState((s) => (id ? allTransactions(s).filter((t) => !t.deletedAt && (t.accountId === id || t.toAccountId === id)).length : 0));

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank');
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [number, setNumber] = useState(account?.accountNumber ?? '');
  const [opening, setOpening] = useState(Math.abs(account?.openingBalance ?? 0));
  const [owner, setOwner] = useState(account?.ownerMemberId ?? '');
  const credit = type === 'credit';

  const save = async () => {
    const data = {
      name: name.trim(), type, institution: institution.trim() || null, accountNumber: number.trim() || null,
      openingBalance: credit ? -opening : opening, ownerMemberId: owner || null,
    };
    if (account) {
      const changed = Object.fromEntries(Object.entries(data).filter(([k, v]) => (account[k as keyof typeof account] ?? null) !== v));
      await store.update('account', account.id, changed);
    } else {
      await store.create('account', { ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)), currency: 'IDR' });
    }
    goBack();
  };

  const remove = async () => {
    if (!account) return;
    const msg = txCount ? `${txCount} transaction${txCount > 1 ? 's' : ''} will be hidden with it. You can restore it for 30 days.` : 'You can restore it for 30 days.';
    if (!(await confirm(`Delete ${account.name}?`, msg, 'Delete', true))) return;
    // The account's transactions and pockets go with it, so no total counts money in a deleted account.
    const s = store.getState();
    await store.batch((tx) => {
      allTransactions(s).filter((t) => !t.deletedAt && (t.accountId === account.id || t.toAccountId === account.id)).forEach((t) => tx.remove('transaction', t.id));
      pockets(s).filter((p) => p.accountId === account.id).forEach((p) => tx.remove('pocket', p.id));
      tx.remove('account', account.id);
    });
    goBack();
  };

  if (id && !account) {
    return (
      <View style={{ flex: 1 }}>
        <PageHeader title="Account" />
        <Txt color={colors.muted} style={{ padding: 16 }}>This account was deleted.</Txt>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={account ? 'Edit account' : 'New account'} />
      <Screen style={{ padding: 16, gap: 16 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="BCA Tahapan" maxLength={40} />
        <View style={{ gap: 6 }}>
          <Txt size={12} w="bold" color={colors.muted}>Type</Txt>
          <ChipPicker label="Type" wrap chips={Object.entries(ACCOUNT_TYPES).map(([k, t]) => ({ id: k, label: t.label, emoji: t.emoji }))} value={type} onChange={(v) => setType(v as AccountType)} />
        </View>
        <Field label="Institution (optional)" value={institution} onChangeText={setInstitution} placeholder="BCA" maxLength={40} />
        <Field
          label="Account or card number (optional)"
          value={number}
          onChangeText={setNumber}
          keyboardType="number-pad"
          maxLength={24}
          hint={<Txt size={12} color={colors.muted}>Only the last 4 digits are shown. The full number helps match screenshots later.</Txt>}
        />
        <AmountField label={credit ? 'Amount owed now' : 'Opening balance'} value={opening} onAmount={setOpening} />
        {people.length > 1 && (
          <View style={{ gap: 6 }}>
            <Txt size={12} w="bold" color={colors.muted}>Owner (optional)</Txt>
            <ChipPicker label="Owner" chips={[{ id: '', label: 'Shared' }, ...people.map((m) => ({ id: m.id, label: m.name }))]} value={owner} onChange={setOwner} />
          </View>
        )}
        <Button title="Save" onPress={save} disabled={!name.trim()} />
        {account && <Button title="Delete account" kind="ghost" onPress={remove} />}
      </Screen>
    </View>
  );
}
