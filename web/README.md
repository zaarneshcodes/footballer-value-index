# web

The Next.js app for [Footballer Value Index](../README.md): pages, API routes and The Scout chatbot.

```bash
npm ci
npm run dev          # http://localhost:3000 (needs DATABASE_URL; chat needs GEMINI_API_KEY)
npm run lint
npm run test:guard   # chatbot guardrail unit tests
npm run eval:chat    # chatbot evals against a running server (BASE_URL, DATABASE_URL)
```

Key files: `src/lib/queries.ts` (read-only SQL), `src/lib/chat-tools.ts` (the chatbot's tools),
`src/app/api/chat/route.ts` (Gemini routing + guardrails), `src/lib/chat-guard.ts`,
`src/lib/scout-sop.ts` (the bot's house rules). See `../docs/evals.md`.
