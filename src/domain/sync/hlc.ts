/** `${ms:15}:${counter:5}:${deviceId}`, zero-padded so string order is clock order. */
export type Hlc = string;

const format = (ms: number, counter: number, deviceId: string): Hlc =>
  `${ms.toString().padStart(15, '0')}:${counter.toString().padStart(5, '0')}:${deviceId}`;

export function parseHlc(h: Hlc): { ms: number; counter: number; deviceId: string } {
  const [ms, counter, ...rest] = h.split(':');
  return { ms: Number(ms), counter: Number(counter), deviceId: rest.join(':') };
}

export function tick(last: Hlc | null, nowMs: number, deviceId: string): Hlc {
  if (!last) return format(nowMs, 0, deviceId);
  const l = parseHlc(last);
  const ms = Math.max(nowMs, l.ms);
  return format(ms, ms === l.ms ? l.counter + 1 : 0, deviceId);
}

export function receive(local: Hlc | null, remote: Hlc, nowMs: number, deviceId: string): Hlc {
  const l = local ? parseHlc(local) : { ms: -1, counter: -1 };
  const r = parseHlc(remote);
  const ms = Math.max(nowMs, l.ms, r.ms);
  const counter =
    ms === l.ms && ms === r.ms ? Math.max(l.counter, r.counter) + 1 : ms === l.ms ? l.counter + 1 : ms === r.ms ? r.counter + 1 : 0;
  return format(ms, counter, deviceId);
}

export const compareHlc = (a: Hlc, b: Hlc): number => (a < b ? -1 : a > b ? 1 : 0);
