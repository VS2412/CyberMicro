# Running Watchman

> The [main README](../README.md) has the complete beginner guide. This page is the short version.

Everything runs **on this laptop**: database, AI model, server and web app. No internet needed once set up.

## One-time setup (already done on this machine)
| What | Command (run once) |
|---|---|
| Server packages | `cd watchman_1/server && npm install` |
| Web app packages | `cd client && npm install` |
| AI model (Microsoft Phi-4-mini, 2.5 GB) | `ollama pull phi4-mini` |
| Settings | `cd watchman_1/server && npm run setup` creates `watchman_1/.env` from `.env.example` with a random `CHAIN_SECRET` (never committed) |

## Start the demo (4 terminals, in this order)
```bash
# 1. Database (keeps running; data lives in watchman/.mongo-data)
cd watchman_1/server && npm run db

# 2. AI model runtime (skip if `ollama list` already works; it usually runs as a service)
ollama serve

# 3. API server  → http://localhost:5000/health should say {"status":"OK"}
cd watchman_1/server && npm start

# 4. Web app     → open http://localhost:5173
cd client && npm run dev
```

**Tip:** open the app once and click **Analyze incident** on a scenario *before* presenting. The first AI call loads the model into GPU memory (~10–20 s); after that each analysis takes ~8–10 s.

## Settings (`watchman_1/.env`)
| Key | Meaning |
|---|---|
| `MONGO_URI` | `mongodb://127.0.0.1:27017/watchman` (local). The Atlas line is commented out as a backup. |
| `LLM_PROVIDER` | `ollama` (on-device, default), `azure` (Azure OpenAI / GitHub Models), or `gemini` |
| `OLLAMA_MODEL` | `phi4-mini` (or `phi3`) |
| `AI_MODE` | `live` (default: model, then recording, then rules), `replay` (recorded answers first: most predictable on stage), `fallback` (rules only, no AI) |
| `AI_RECORD` | `1` = overwrite the saved recordings with new live answers |
| `DEMO_MODE` | `1` shows the time machine and the "rogue DB edit" button. Set to `0` for a "production" look. |
| `CHAIN_SECRET` | Secret key for the tamper-evident seals. **Changing it makes every existing timeline fail verification** (by design). |
| `AZURE_OPENAI_URL` / `AZURE_OPENAI_KEY` / `AZURE_OPENAI_MODEL` | Only for `LLM_PROVIDER=azure` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Only for `LLM_PROVIDER=gemini` |

## Tests
```bash
cd watchman_1/server && npm test     # 28 tests: hash chain, clock engine, ATT&CK, AI validation, report
```

## If something goes wrong on stage
| Symptom | Fix |
|---|---|
| "Server unreachable" toast | Terminal 3 stopped: re-run `npm start` |
| Analysis is slow or fails | It automatically uses the recorded answer (amber "recorded replay" badge). To force it: set `AI_MODE=replay` and restart the server |
| Clocks look wrong after a tamper demo | That's the point! Open a fresh scenario for a clean run |
| Time machine still on | Click **Now** in the header |
| Port already in use | Another copy is running: close the old terminal |
