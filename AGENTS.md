# BuyWise Kuwait

## Purpose
BuyWise Kuwait is a Kuwait-first AI shopping assistant that returns a clear `BUY`, `WAIT`, or `AVOID` verdict from a pasted or shared product link or description.

## Product rules
- Keep the app mobile-first, clean, and easy to understand.
- Preserve demo mode when API keys are missing.
- Do not add wallet, cashback, payment, loyalty, or CAF features.
- Favor simple explanations, red flags, pros/cons, and Kuwait-specific buying context.

## Technical notes
- Stack: Next.js App Router, TypeScript, Vercel deployment target.
- Secrets must never be committed. Keep runtime keys in Vercel environment variables.
- Supported AI providers are `openai` and `deepseek`, chosen by `DEFAULT_AI_PROVIDER`.

## Working agreement
- Before changing behavior, prefer small, production-ready edits over MVP sprawl.
- Update `README.md` and `.env.example` when setup or environment requirements change.
