import { View } from 'react-native';
import { Funding } from '../domain/types';
import { accounts, pockets } from '../store/selectors';
import { BatchTx } from '../store/store';
import { ChipPicker } from './ChipPicker';
import { Field, Txt } from './components';
import { useAppState } from './StoreProvider';
import { colors } from './theme';

/** Funding being edited: a pocket in an account (pocketId NEW_POCKET means create one named newPocket), or a whole account. */
export type FundingDraft = { kind: 'pocket' | 'account'; accountId: string; pocketId: string; newPocket: string };

export const draftOf = (f: Funding | undefined, pocketAccount: (id: string) => string | undefined): FundingDraft =>
  !f ? { kind: 'pocket', accountId: '', pocketId: '', newPocket: '' }
    : f.kind === 'account' ? { kind: 'account', accountId: f.accountId, pocketId: '', newPocket: '' }
      : { kind: 'pocket', accountId: pocketAccount(f.pocketId) ?? '', pocketId: f.pocketId, newPocket: '' };

export const NEW_POCKET = 'new';
export const draftReady = (d: FundingDraft) => !!d.accountId && (d.kind === 'account' || (!!d.pocketId && (d.pocketId !== NEW_POCKET || !!d.newPocket.trim())));

export function FundingPicker({ value, onChange }: { value: FundingDraft; onChange: (d: FundingDraft) => void }) {
  const accts = useAppState((s) => accounts(s).filter((a) => a.type !== 'credit'));
  const accountPockets = useAppState((s) => pockets(s).filter((p) => p.accountId === value.accountId));
  const set = (patch: Partial<FundingDraft>) => onChange({ ...value, ...patch });
  return (
    <View style={{ gap: 8 }}>
      <Txt size={12} w="bold" color={colors.muted}>Funded by</Txt>
      <ChipPicker label="Funded by" chips={[{ id: 'pocket', label: 'A pocket' }, { id: 'account', label: 'A whole account' }]} value={value.kind} onChange={(k) => set({ kind: k as FundingDraft['kind'] })} />
      <ChipPicker label="Account" chips={accts.map((a) => ({ id: a.id, label: a.name }))} value={value.accountId} onChange={(id) => set({ accountId: id, pocketId: '', newPocket: '' })} />
      {value.kind === 'pocket' && value.accountId !== '' && (
        <>
          <ChipPicker
            label="Pocket"
            chips={[...accountPockets.map((p) => ({ id: p.id, label: p.name })), { id: NEW_POCKET, label: '+ New pocket' }]}
            value={value.pocketId}
            onChange={(id) => set({ pocketId: id })}
          />
          {value.pocketId === NEW_POCKET && (
            <Field label="New pocket name" value={value.newPocket} onChangeText={(t) => set({ newPocket: t })} placeholder="Vehicle tax" maxLength={30} />
          )}
        </>
      )}
    </View>
  );
}

/** The Funding to store, creating the new pocket inside the caller's batch when one was asked for. */
export function fundingFrom(d: FundingDraft, tx: BatchTx): Funding {
  if (d.kind === 'account') return { kind: 'account', accountId: d.accountId };
  const pocketId = d.pocketId === NEW_POCKET ? tx.create('pocket', { accountId: d.accountId, name: d.newPocket.trim() }) : d.pocketId;
  return { kind: 'pocket', pocketId };
}
