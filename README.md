# BuyWise Kuwait

BuyWise Kuwait is a Kuwait-first product comparison assistant. Users can search, paste, or share a product link and see comparison results across Kuwait stores by default, then widen the scope to the Middle East or worldwide.

## What it does

- Understands shorthand or product links with AI
- Generates a search plan before comparing prices
- Compares Kuwait retailers first
- Lets users switch to Middle East or worldwide scope
- Shows the cheapest verified option and store links
- Keeps a simple verdict behind the scenes instead of leading with it
- Works in demo mode when no API key is configured

## Environment variables

Create `.env.local` for local development:

```env
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DEFAULT_AI_PROVIDER=openai
OPENAI_MODEL=gpt-4.1-mini
DEEPSEEK_MODEL=deepseek-chat
```

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

## Vercel deployment

1. Push this repository to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, and `DEFAULT_AI_PROVIDER`.
4. Deploy.
5. Test a product search and the `/compare?q=<product-url>` route.

## Guardrails

- Keep the experience focused on product understanding and price comparison.
- Keep Kuwait as the default market.
- Do not add wallet, cashback, payment, loyalty, or CAF-related features.
- Do not commit secrets or `.env.local`.
