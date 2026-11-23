import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonthsClamped, daysBetween, todayJakarta } from '../domain/dates';
import { formatAmount, formatIDR } from '../domain/money';
import { Transaction, TxType } from '../domain/types';
import { accounts as accountList, budgetImpact, categories as categoryList, lastUsedAccountId, pockets as pocketList, suggestedCategoryId } from '../store/selectors';
import { AmountPad } from './AmountPad';
import { ChipPicker } from './ChipPicker';
import { Button, Txt } from './components';
import { Segmented } from './Segmented';
import { useAppState } from './StoreProvider';
import { colors, font, radius } from './theme';

export type TxValues = {
  type: TxType; amount: number; date: string; time?: string; accountId: string; toAccountId?: string;
  categoryId?: string; pocketId?: string; note?: string; counterpartyName?: string;
};

const yesterday = (today: string) => {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
};
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && addMonthsClamped(s, 0) === s;

export function TxForm({ initial, editingId, onSave, saveLabel = 'Save', footer }: {
  initial?: Partial<Transaction>; editingId?: string; onSave: (v: TxValues) => Promise<void>; saveLabel?: string; footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const today = todayJakarta();
  const accounts = useAppState(accountList);
  const cats = useAppState(categoryList);
  const pockets = useAppState(pocketList);
  const lastAccount = useAppState(lastUsedAccountId);

  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [digits, setDigits] = useState(initial?.amount ? String(initial.amount) : '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? lastAccount ?? '');
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? '');
  const [pocketId, setPocketId] = useState(initial?.pocketId ?? '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [pickDate, setPickDate] = useState(initial?.date && initial.date !== today && initial.date !== yesterday(today));
  const [time, setTime] = useState(initial?.time ?? '');
  const [payee, setPayee] = useState(initial?.counterpartyName ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const suggested = useAppState((s) => suggestedCategoryId(s, payee || note));
  const [chosenCategory, setCategory] = useState<string | undefined>(initial?.categoryId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = type === 'income' ? 'income' : 'expense';
  const kindCats = cats.filter((c) => c.kind === kind);
  const fallbackCategory = suggested && kindCats.some((c) => c.id === suggested) ? suggested : kindCats[0]?.id;
  const categoryId = chosenCategory && kindCats.some((c) => c.id === chosenCategory) ? chosenCategory : fallbackCategory;
  const orderedCats = [...kindCats].sort((a, b) => (a.id === fallbackCategory ? -1 : b.id === fallbackCategory ? 1 : 0));
  const accountPockets = pockets.filter((p) => p.accountId === accountId);
  const amount = Number(digits || '0');
  const dateOk = validDate(date);
  const timeOk = time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const impact = useAppState((s) => (type === 'expense' && categoryId && amount > 0 && dateOk ? budgetImpact(s, categoryId, amount, date, editingId) : null));

  const canSave = amount > 0 && !!accountId && dateOk && timeOk && !busy && (type !== 'transfer' || (!!toAccountId && toAccountId !== accountId));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({
        type, amount, date, time: time || undefined, accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type === 'transfer' ? undefined : categoryId,
        pocketId: type === 'expense' && accountPockets.some((p) => p.id === pocketId) ? pocketId : undefined,
        note: note.trim() || undefined,
        counterpartyName: payee.trim() || undefined,
      });
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };

  const accountChips = accounts.map((a) => ({ id: a.id, label: a.name }));
  const impactColor = impact ? (impact.status === 'over' ? colors.red : impact.status === 'warning' ? colors.amberText : colors.muted) : colors.muted;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={styles.amount} accessibilityLabel={`Amount ${formatAmount(amount)} rupiah`} accessibilityLiveRegion="polite">
          <Txt w="semibold" size={14} color={colors.muted}>Rp</Txt>
          <Txt w="extrabold" size={36} color={amount ? colors.ink : colors.muted} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(amount)}</Txt>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <Segmented
            label="Transaction type"
            value={type}
            onChange={setType}
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]}
          />
        </View>
        <AmountPad value={digits} onChange={setDigits} />

        {type !== 'transfer' && (
          <Field label="Category">
            <ChipPicker label="Category" chips={orderedCats.map((c) => ({ id: c.id, label: c.name, emoji: c.emoji }))} value={categoryId} onChange={setCategory} />
            {impact && (
              <Txt size={12} w="semibold" color={impactColor} style={styles.inset}>
                {impact.name}: {formatIDR(impact.spentAfter)} of {formatAmount(impact.limit)} → {Math.round(impact.ratioAfter * 100)}%
              </Txt>
            )}
          </Field>
        )}

        <Field label={type === 'transfer' ? 'From account' : 'Account'}>
          {accounts.length === 0 ? <Txt color={colors.muted} style={styles.inset}>Add an account in Settings first.</Txt> : (
            <ChipPicker label="Account" chips={accountChips} value={accountId} onChange={(id) => { setAccountId(id); setPocketId(''); }} />
          )}
        </Field>
        {type === 'transfer' && (
          <Field label="To account">
            <ChipPicker label="To account" chips={accountChips.filter((a) => a.id !== accountId)} value={toAccountId} onChange={setToAccountId} />
          </Field>
        )}
        {type === 'expense' && accountPockets.length > 0 && (
          <Field label="Pocket">
            <ChipPicker label="Pocket" chips={[{ id: '', label: 'Free' }, ...accountPockets.map((p) => ({ id: p.id, label: p.name }))]} value={pocketId} onChange={setPocketId} />
          </Field>
        )}

        <Field label="Date">
          <ChipPicker
            label="Date"
            chips={[{ id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }, { id: 'pick', label: pickDate && dateOk ? date : 'Pick' }]}
            value={pickDate ? 'pick' : date === today ? 'today' : date === yesterday(today) ? 'yesterday' : 'pick'}
            onChange={(id) => {
              setPickDate(id === 'pick');
              if (id === 'today') setDate(today);
              if (id === 'yesterday') setDate(yesterday(today));
            }}
          />
          {pickDate && (
            <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} accessibilityLabel="Date, year-month-day" style={[styles.input, !dateOk && styles.bad]} maxLength={10} />
          )}
          {dateOk && daysBetween(today, date) > 0 && <Txt size={12} color={colors.amberText} style={styles.inset}>This date is in the future.</Txt>}
        </Field>

        <View style={styles.pair}>
          <TextInput value={payee} onChangeText={setPayee} placeholder="Payee (optional)" placeholderTextColor={colors.muted} accessibilityLabel="Payee" style={[styles.input, { flex: 1, marginHorizontal: 0 }]} maxLength={80} />
          <TextInput value={time} onChangeText={setTime} placeholder="Time" placeholderTextColor={colors.muted} accessibilityLabel="Time, hours and minutes" style={[styles.input, { width: 92, marginHorizontal: 0 }, !timeOk && styles.bad]} maxLength={5} />
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={colors.muted} accessibilityLabel="Note" style={styles.input} maxLength={200} />
        {footer}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 12 }]}>
        {error && <Txt color={colors.red} size={13}>{error}</Txt>}
        <Button title={saveLabel} onPress={save} disabled={!canSave} />
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt w="bold" size={12} color={colors.muted} style={styles.inset}>{label.toUpperCase()}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, paddingTop: 16, paddingHorizontal: 16 },
  inset: { paddingHorizontal: 16 },
  pair: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  input: {
    marginHorizontal: 16, height: 48, borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: 14,
    fontFamily: font.semibold, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.border,
  },
  bad: { borderColor: colors.red },
  bar: { paddingHorizontal: 16, paddingTop: 12, gap: 8, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
