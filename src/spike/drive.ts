import { google } from './google';

const API = 'https://www.googleapis.com/drive/v3/files';
const FOLDER = 'application/vnd.google-apps.folder';
export type DriveFile = { id: string; name: string; mimeType: string };

export async function list(parentId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
  const res = await google(`${API}?q=${q}&fields=files(id,name,mimeType)&orderBy=name&pageSize=1000`);
  return (await res.json()).files;
}

export async function createFolder(name: string, parentId?: string): Promise<string> {
  const res = await google(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER, parents: parentId ? [parentId] : undefined }),
  });
  return (await res.json()).id;
}

export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const existing = (await list(parentId)).find((f) => f.name === name && f.mimeType === FOLDER);
  return existing?.id ?? createFolder(name, parentId);
}

export async function createFile(name: string, parentId: string, content: string): Promise<string> {
  const boundary = 'hm' + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\ncontent-type: application/json\r\n\r\n${JSON.stringify({ name, parents: [parentId] })}\r\n` +
    `--${boundary}\r\ncontent-type: application/x-ndjson\r\n\r\n${content}\r\n--${boundary}--`;
  const res = await google('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return (await res.json()).id;
}

export const read = async (fileId: string) => (await google(`${API}/${fileId}?alt=media`)).text();

export async function shareWith(fileId: string, email: string) {
  await google(`${API}/${fileId}/permissions?sendNotificationEmail=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
  });
}

/** Appends the next ops/<device>/NNNN.jsonl file and returns its name. */
export async function writeNextOpsFile(householdId: string, device: string): Promise<string> {
  const ops = await findOrCreateFolder('ops', householdId);
  const dir = await findOrCreateFolder(device, ops);
  const n = (await list(dir)).filter((f) => f.name.endsWith('.jsonl')).length + 1;
  const name = `${String(n).padStart(4, '0')}.jsonl`;
  await createFile(name, dir, JSON.stringify({ op: 'spike', device, n, at: new Date().toISOString() }) + '\n');
  return name;
}

/** Lists and reads every ops/<device>/*.jsonl; each line is "path: content" or "path: ERROR …". */
export async function readAllOps(householdId: string): Promise<string[]> {
  const ops = (await list(householdId)).find((f) => f.name === 'ops' && f.mimeType === FOLDER);
  if (!ops) return ['no ops/ folder visible'];
  const out: string[] = [];
  for (const dir of await list(ops.id)) {
    for (const f of await list(dir.id)) {
      const path = `ops/${dir.name}/${f.name}`;
      out.push(await read(f.id).then((c) => `${path}: ${c.trim()}`, (e) => `${path}: ERROR ${e}`));
    }
  }
  return out;
}
