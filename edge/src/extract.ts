import { parseModelOutput, responseSchema } from './extract-schema';
import { json, type Env } from './index';

const MAX_IMAGES = 10;

const prompt = (today: string, accountHint?: string) => `You read screenshots of Indonesian banking and e-wallet apps (e.g. BCA, Jago, GoPay) and list every transaction row you can see.
Today is ${today} (Asia/Jakarta). ${accountHint ? `The user says these screenshots are from: ${accountHint}.` : ''}
Rules:
- amount: whole rupiah as a positive integer. "Rp 86.500" and "86,500.00" are both 86500. Never negative.
- direction: "out" for money leaving the account (debit, DB, "-", payment, transfer out, top-up paid from this account), "in" for money arriving (credit, CR, "+", received).
- date: YYYY-MM-DD. When the year isn't shown, infer it from the context and today's date (rows are never in the future).
- time: HH:MM 24-hour if shown, else null.
- counterpartyName / counterpartyAccount / reference / runningBalance: only if shown, else null. Don't guess.
- cutOff: true if any part of the row is clipped at the top or bottom edge of the image, so a field may be missing or wrong.
- Several images may overlap (scrolled). List each real transaction once.
- Never invent rows. Skip headers, ads, balances and promotions that are not transactions.
- Skip transactions that never happened: cancelled, failed or fully refunded ones (e.g. "Dibatalkan", "Dibatalin", "Gagal", "di-refund", or a struck-through amount).`;

export async function handleExtract(req: Request, env: Env): Promise<Response> {
  let body: { images?: unknown; accountHint?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const { images, accountHint } = body ?? {};
  if (
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > MAX_IMAGES ||
    !images.every((i) => typeof i === 'string' && i.length > 0)
  ) {
    return json({ error: 'bad_request', detail: `send 1-${MAX_IMAGES} base64 JPEG images` }, 400);
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); // sv-SE gives YYYY-MM-DD
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt(today, typeof accountHint === 'string' ? accountHint : undefined) },
            ...images.map((data: string) => ({ inline_data: { mime_type: 'image/jpeg', data } })),
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0 },
    }),
  });
  if (!res.ok) return json({ error: 'model_error' }, 502);

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const out = parseModelOutput(text);
  return out ? json(out) : json({ error: 'bad_model_output' }, 502);
}
