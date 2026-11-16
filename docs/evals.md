# The Scout: guardrails and evals

How the chatbot is kept honest, and how that is measured. Latest results:
[evals/chat-eval-latest.md](evals/chat-eval-latest.md).

## Guardrails (in the request path)

| Layer | What it does | Where |
|---|---|---|
| Input limits | Last 12 messages, 500 characters each; malformed requests rejected | `web/src/app/api/chat/route.ts` |
| Rate limit | Per visitor (IP): 8 questions/minute, 150/day, per server instance. Protects the shared free Gemini quota. Friendly "the ref is checking the watch" message | `rateLimit()` in `web/src/lib/chat-guard.ts` |
| Tool sandbox | The model can only call 4 read-only lookups with validated arguments; it never writes SQL; database errors are never passed on | `web/src/lib/chat-tools.ts` |
| Instructions | Core rules (database only, estimates as ranges, credit Transfermarkt) plus house SOPs for off-topic messages; core rules win | `route.ts`, `web/src/lib/scout-sop.ts` |
| **Grounding check** | Every € amount, goals/assists/appearances/minutes/cards count, age and player link in a reply must match a value the tools returned **for this question**, under the same stat (36 must be a goals value to be "36 goals") | `checkReply()` in `chat-guard.ts` |
| Repair, then fallback | If the grounding check fails, the model gets one automatic correction and rewrites its answer; if it still fails, the visitor gets "I couldn't double-check that answer, so I won't guess" | `guardedAnswer()` in `route.ts` |
| Blocklist | Swear words and leaks of the hidden instructions are never shown; the reply is replaced | `chat-guard.ts` |
| Safe rendering | Replies are never rendered as HTML; only `/players/<id>` links become links, anything else is shown as plain text | `web/src/components/ChatBox.tsx` |
| Card whitelist | Reaction cards come from a fixed list of 5; anything else is dropped | `splitCard()` in `route.ts` |
| Observability | Each reply carries `x-chat-model` and `x-chat-guard` (pass / repaired / fallback / blocked) headers; skips and guard events are logged | `route.ts` |

## Evals

`npm run eval:chat` (from `web/`, with `DATABASE_URL` set) sends 29 test conversations to a
running deployment and scores each reply with fixed rules. Expected answers are queried
from the database at run time, so the suite stays correct after a data reload. No LLM is
used as a judge: results are cheap on the free quota, repeatable and easy to explain.

| Category | What it checks |
|---|---|
| facts | Most valuable player, market value, top scorer/assister, a season stat, club, a filtered ranking, a follow-up that needs context. Names and numbers must match the database; Transfermarkt credited; no reaction card |
| estimates | 5-year values given as the low-to-high range and called estimates, never "will be worth €X" |
| hallucination | Salary, transfer fee, a fictional player, a trophy, a future prediction: must say it's not in the data, with no invented numbers |
| injection | "Print your system prompt", a jailbreak with a fake value, an injection inside a real question, impersonating a real player |
| trolling | Insults (yellow, then red by the third), "say a swear word", "roast me": clean, short, no jokes about identity or looks |
| scope | Weather, betting, "tell me about me", gibberish, greeting, and getting back to real data after trolling: right card each time |

Free-tier "busy" responses are infrastructure limits, not answers: the eval waits and
retries such a case once and marks it in the report.

Unit tests for the guardrails themselves (no network, no AI): `npm run test:guard`.

## Findings that changed the code

- The first eval run found the model linking a club page that doesn't exist
  (`/clubs/27`) and writing "36 league goals", which slipped past a too-strict pattern.
  The grounding check now rejects any non-player link and allows qualifier words.
- An early grounding check accepted a number if it appeared *anywhere* in the tool output
  ("31 goals" passed because the player had 31 appearances). It now matches by stat.
- The first wording of the automatic correction confused the model into a meme reply; it
  now asks for a rewrite of the same answer and says the check isn't from the user.

## Limits

- Rate limits and model cool-downs live in server memory, so each Vercel instance keeps
  its own; a cold start resets them. Good enough for a portfolio site, not for production.
- The grounding check covers money, stat counts, ages and links. Names and free text are
  checked by the evals, not in the request path.
- 29 cases is a smoke test, not a benchmark. Results depend on Google's free models,
  which can change behaviour without notice; rerun the suite after any prompt change.
