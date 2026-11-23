// Usage: npx tsx scripts/score-extraction.ts spikes/screenshots
// Runs the Worker's own /extract code (same prompt, schema and validation) on each case folder and scores it.
// Needs GEMINI_API_KEY (env or edge/.dev.vars). GEMINI_MODEL defaults to the pinned value in edge/wrangler.jsonc.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { handleExtract } from '../edge/src/extract';
import type { Env } from '../edge/src/index';
import { type ExpectedRow, type GotRow, score } from './score';

const root = process.argv[2];
if (!root) throw new Error('usage: score-extraction.ts <screenshots dir>');
if (existsSync('edge/.dev.vars')) process.loadEnvFile('edge/.dev.vars');
const model =
  process.env.GEMINI_MODEL ?? readFileSync('edge/wrangler.jsonc', 'utf8').match(/"GEMINI_MODEL": "([^"]+)"/)?.[1];
if (!process.env.GEMINI_API_KEY || !model)
  throw new Error('set GEMINI_API_KEY (and GEMINI_MODEL if not in edge/wrangler.jsonc)');
const env = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL: model } as Env;

// Same treatment the phone will apply before upload: JPEG, long edge ≤ 1600px.
const toJpeg = async (file: string) =>
  (
    await sharp(file)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
  ).toString('base64');

async function main() {
  const total = { expected: 0, correct: 0, date: 0, amount: 0, direction: 0, invented: 0 };
  const cases = readdirSync(root, { withFileTypes: true }).filter(
    (d) => d.isDirectory() && existsSync(join(root, d.name, 'expected.json')),
  );
  if (!cases.length)
    throw new Error(`no case folders with expected.json in ${root} (see spikes/screenshots/README.md)`);

  for (const c of cases) {
    const dir = join(root, c.name);
    const images = readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const expected: ExpectedRow[] = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8'));
    const res = await handleExtract(
      new Request('http://local/extract', {
        method: 'POST',
        body: JSON.stringify({ images: await Promise.all(images.map((f) => toJpeg(join(dir, f)))) }),
      }),
      env,
    );
    const body = (await res.json()) as { rows?: GotRow[]; error?: string };
    if (!res.ok || !body.rows) {
      console.log(
        `${c.name}: ${res.status} ${body.error} — all ${expected.filter((e) => !e.cutOff).length} rows count as wrong`,
      );
      total.expected += expected.filter((e) => !e.cutOff).length;
      continue;
    }
    writeFileSync(join(dir, 'got.json'), JSON.stringify(body.rows, null, 2)); // for eyeballing misses
    const s = score(expected, body.rows);
    total.expected += s.expected;
    total.correct += s.correct;
    total.date += s.field.date;
    total.amount += s.field.amount;
    total.direction += s.field.direction;
    total.invented += s.invented.length;
    console.log(
      `${c.name}: ${s.correct}/${s.expected} rows right` +
        (s.missed.length ? `, missed ${s.missed.length}` : '') +
        (s.invented.length ? `, INVENTED ${s.invented.length}: ${JSON.stringify(s.invented)}` : ''),
    );
  }

  const pct = (n: number) => (total.expected ? ((100 * n) / total.expected).toFixed(1) + '%' : 'n/a');
  console.log(`\nModel ${model}, ${cases.length} cases, ${total.expected} rows`);
  console.log(`date ${pct(total.date)}  amount ${pct(total.amount)}  direction ${pct(total.direction)}`);
  console.log(`rows fully right: ${pct(total.correct)}  (pass bar ≥ 95%)  invented rows: ${total.invented}`);
  const pass = total.expected > 0 && total.correct / total.expected >= 0.95 && total.invented === 0;
  console.log(pass ? 'PASS' : 'FAIL');
  process.exitCode = pass ? 0 : 1;
}

main(); // root package is CommonJS, so no top-level await
