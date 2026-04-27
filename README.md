# BuyWise Kuwait MVP

BuyWise Kuwait is a Kuwait-focused AI shopping assistant. Users can paste or share a product link or description and get a simple `BUY`, `WAIT`, or `AVOID` verdict with reasons, pros, cons, red flags, and alternatives.

## Current MVP

- Next.js App Router app with mobile-first UI
- PWA share-target flow for Android Chrome
- Saved items page using browser storage
- AI provider support for OpenAI and DeepSeek
- Demo mode when no API key is configured
- Vercel-ready deployment target

## Environment variables

Create `.env.local` for local development:

```env
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DEFAULT_AI_PROVIDER=openai
OPENAI_MODEL=gpt-4.1-mini
DEEPSEEK_MODEL=deepseek-chat
```

Notes:

- `DEFAULT_AI_PROVIDER` supports `openai` or `deepseek`.
- If the selected provider key is missing, the app automatically falls back to the other configured provider.
- If no AI key is present, the app still works in demo mode.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm run start
```

## One-click Vercel deployment

1. Push this repository to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repository.
3. Add these environment variables in the Vercel project settings:
   - `OPENAI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `DEFAULT_AI_PROVIDER`
   - Optional: `OPENAI_MODEL`
   - Optional: `DEEPSEEK_MODEL`
4. Deploy.
5. After the first deployment, open the site on Android Chrome and install it to enable the share-target flow.

## Product scope guardrails

- Keep the experience focused on shopping verdicts and buying confidence.
- Do not add wallet, cashback, payment, loyalty, or CAF-related features.
- Do not commit real secrets or `.env.local`.

## Future roadmap

- Saved products in a hosted database
- Price alerts
- Merchant catalog and price history
- Instagram video save and analysis through approved integrations
