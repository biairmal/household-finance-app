# Screenshot extraction samples (Plan 1, Task 5)

Everything in this folder except this README is git-ignored: real bank screenshots never go in the repo.

## Layout

One folder per case. A case is what you'd import in one go: usually one screenshot, or two for a scrolled, overlapping pair.

```
spikes/screenshots/
  bca-01/
    1.png
    expected.json
  jago-scroll-01/      # a scrolled pair: list each transaction ONCE in expected.json
    1.png
    2.png
    expected.json
```

Aim for 20 screenshots across BCA, Jago and GoPay, including 2 scrolled overlapping pairs and 2 with rows cut off at the top or bottom edge.

## expected.json

The rows you can see, top to bottom:

```json
[
  { "date": "2026-11-18", "amount": 86500, "direction": "out", "description": "GOPAY TOPUP" },
  { "date": "2026-11-17", "amount": 2500000, "direction": "in", "description": "TRSF E-BANKING CR" },
  { "date": "2026-11-17", "amount": 15000, "direction": "out", "cutOff": true }
]
```

- `amount`: whole rupiah, always positive. `direction`: `in` or `out`.
- `cutOff: true` for a row clipped at the image edge. The model may skip it or return it flagged; either is fine. Returning it unflagged as a made-up row counts against it.
- `description` is optional and not scored. It helps when you read `got.json`.

## Run

Put the Gemini key in `edge/.dev.vars` (`GEMINI_API_KEY=...`), then from the repo root:

```
npx tsx scripts/score-extraction.ts spikes/screenshots
```

It prints per-case results, per-field accuracy and the overall row accuracy, and writes what the model returned to `<case>/got.json`. Pass: ≥ 95% of rows right on date, amount and direction, and no invented rows.
