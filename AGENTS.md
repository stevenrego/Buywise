# BuyWise Kuwait

## Purpose
BuyWise Kuwait is a Kuwait-first price comparison assistant.
It should let people search, paste, or share a product and compare prices across Kuwait stores by default, then expand to the Middle East or worldwide when requested.
The `BUY`, `WAIT`, or `AVOID` verdict is useful, but it is secondary to the price comparison flow.

## Product rules
- Keep the app mobile-first, clean, and easy to understand.
- Make comparison the primary action and verdicts secondary.
- Preserve demo mode when API keys are missing.
- Do not add wallet, cashback, payment, loyalty, or CAF features.
- Favor simple explanations, price differences, market scope switching, and Kuwait-specific buying context.

## Technical notes
- Stack: Next.js App Router, TypeScript, Vercel deployment target.
- Secrets must never be committed. Keep runtime keys in Vercel environment variables.
- Supported AI providers are `openai` and `deepseek`, chosen by `DEFAULT_AI_PROVIDER`.
- Comparison data should stay best-effort and public-page based unless the app later adds a proper merchant catalog/API.
- Default market scope is Kuwait. Support Middle East and worldwide scopes in the UI and route/query params.

## Working agreement
- Before changing behavior, prefer small, production-ready edits over MVP sprawl.
- Update `README.md` and `.env.example` when setup or environment requirements change.
