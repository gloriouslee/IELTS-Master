# IELTS Master

IELTS learning workspace built with Next.js 16, React 19 and Supabase. It includes onboarding, daily plans, vocabulary SRS, Writing and Speaking evaluations, an AI tutor, mock tests and verified progress analytics.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in Supabase credentials.
2. Apply every migration in `supabase/migrations` to the Supabase project.
3. Add `OPENAI_API_KEY` for speech transcription and either `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` for grading.
4. Install and start:

```bash
npm install
npm run dev
```

Without Supabase credentials the app enters an explicit local demo mode. Demo data is stored in the browser and is not synchronized. Production analytics and verified XP require Supabase.

## Security model

- Server Actions verify the Supabase user before paid AI calls.
- AI quota and XP awards are enforced by database functions.
- Profiles are private; system progress cannot be written directly by browser clients.
- User-provided DeepSeek keys are kept in `sessionStorage`, not persistent storage.
- AI responses are range-checked and normalized to IELTS half bands.
- Audio is transcribed but not retained. Pronunciation is deliberately not scored without audio analysis.

## Quality checks

```bash
npm run check
```

This runs ESLint, strict TypeScript checking and a production build. Database changes should be tested against a disposable Supabase project before deployment.

## CI/CD

GitHub Actions runs `npm run check` for every pull request and push to `main` or `master`.

Production deployment uses Vercel after a push to either branch, or when started manually. Add these repository secrets in GitHub before deploying:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```
