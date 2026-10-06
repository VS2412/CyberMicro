# Two-Laptop Setup: Your Laptop Runs the AI, Your Friend's Laptop Runs the Demo

**The idea:** your friend's laptop runs Watchman itself (website, server, database). Only the **AI** part runs on **your** laptop, because yours has the GPU and Ollama. Your friend's server talks to your Ollama over the Wi-Fi.

```
  FRIEND'S LAPTOP (presenting)                    YOUR LAPTOP (GPU)
  ┌──────────────────────────────┐   Wi-Fi     ┌────────────────────────┐
  │ Chrome → website :5173       │             │ Ollama + phi4-mini     │
  │ server :5000 ────────────────┼──────────► │ port 11434             │
  │ MongoDB :27017               │             └────────────────────────┘
  └──────────────────────────────┘
```

### ⚠️ Why "localhost" will NOT work
`localhost` always means **"this same computer"**. If your friend's settings say `localhost`, his server looks for Ollama on *his own* laptop, where there's none. He must use **your laptop's Wi-Fi IP address**, e.g. `10.12.105.232`.

### 💡 Why this setup is the safe choice
If the Wi-Fi dies mid-demo, your friend's app **still works**: Watchman automatically switches to *recorded replay* / *rules fallback*. If instead his browser were showing *your* whole app, a Wi-Fi drop would kill the entire demo.

---

## Part A: On YOUR laptop (the AI machine)

You need to do 3 things: let Ollama accept connections from other computers, open the firewall for your friend only, and keep the laptop awake.

### A1. Make Ollama listen to the network (not just to itself)
Right now Ollama only listens on `127.0.0.1` (itself). Run:

```bash
sudo systemctl edit ollama
```

An editor opens. In the empty area near the top (between the comment lines that say *"Anything between here and the comment below…"*), paste:

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=2h"
```

- `OLLAMA_HOST=0.0.0.0` = "accept connections from other computers too".
- `OLLAMA_KEEP_ALIVE=2h` = keep the model loaded in the GPU for 2 hours, so it's never slow to "wake up" during the demo.

Save and close (in nano: `Ctrl+O`, `Enter`, `Ctrl+X`). Then:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
ss -ltnp | grep 11434
```
👀 You should now see `0.0.0.0:11434` or `*:11434` (before it was `127.0.0.1:11434`).

### A2. Find your IP address (do this AT the venue: it changes with every network)
```bash
ip -4 addr show wlo1 | grep inet
```
👀 Something like `inet 10.12.105.232/16`. Your IP is the part **before the `/`**: `10.12.105.232`. Tell it to your friend.

### A3. Open the firewall, for your friend only
Your laptop's firewall (ufw) is on, so it will block your friend. Ask your friend for **his** IP (Part B, step B3 tells him how), then:

```bash
sudo ufw allow from FRIEND_IP to any port 11434 proto tcp
```
Replace `FRIEND_IP` with his IP, e.g. `sudo ufw allow from 10.12.40.17 to any port 11434 proto tcp`.

> 🔒 **Why "only your friend":** Ollama has **no password**. If you open it to everyone, anyone on the hackathon Wi-Fi could use your GPU. Allowing only his IP keeps it private.

### A4. Warm up and stay awake
```bash
ollama run phi4-mini "hello"
```
(loads the model into the GPU; the reply doesn't matter.)

- Plug in the charger.
- Turn off sleep / screen-lock for the demo, or keep the lid open.
- Don't close Ollama. Your laptop does **not** need to run the Watchman website or server for this.

---

## Part B: On your FRIEND'S laptop (the presenting machine)

### B1. Install Watchman normally, minus Ollama
Follow **README section 4** (install Git, Node.js 20+ and MongoDB; **skip Ollama**), then:

```bash
git clone https://github.com/777mudit/watchman.git
cd watchman/watchman_1/server
npm install
npm run setup        # creates the .env settings file with his own secret key
cd ../../client
npm install
```

### B2. Point his Watchman at YOUR AI
Open `watchman/watchman_1/server/.env` in a text editor (Notepad is fine on Windows) and change or add these lines:

```env
LLM_PROVIDER=ollama
OLLAMA_URL=http://10.12.105.232:11434
OLLAMA_MODEL=phi4-mini
AI_MODE=live
LLM_TIMEOUT_MS=20000
```

- Use **your** real IP from A2 in `OLLAMA_URL`. It starts with `http://`, ends with `:11434`, and is **not** `localhost`.
- `LLM_TIMEOUT_MS=20000` = if your laptop doesn't answer within 20 seconds, give up and use the fallback (the default is 90 s, far too long on stage).

Save the file.

### B3. Find HIS IP (to send to you for step A3)
- **Windows:** open *Command Prompt* → `ipconfig` → look for **IPv4 Address** under *Wireless LAN adapter Wi-Fi*.
- **Mac:** `ipconfig getifaddr en0`
- **Linux:** `ip -4 addr | grep inet`

### B4. Test the connection BEFORE starting Watchman
On his laptop, open this in Chrome (with your IP):

```
http://10.12.105.232:11434
```
👀 It should say **"Ollama is running"**.

Then this, which lists your models (you should see `phi4-mini`):
```
http://10.12.105.232:11434/api/tags
```

| Result | Meaning | Fix |
|---|---|---|
| "Ollama is running" ✅ | Works | Go to B5 |
| Spins then times out | Firewall or Wi-Fi blocking | Re-check A3 (his IP correct?). Or the venue Wi-Fi blocks laptop-to-laptop traffic → **Plan B** below |
| "Refused to connect" | Ollama still only on 127.0.0.1 | Re-do A1, check `ss -ltnp \| grep 11434` |

### B5. Start Watchman on his laptop (3 terminals, as usual)
```bash
# Terminal 1
cd watchman/watchman_1/server && npm run db
# Terminal 2
cd watchman/watchman_1/server && npm start
# Terminal 3
cd watchman/client && npm run dev
```
Open **http://localhost:5173** **on his laptop** (here `localhost` is correct: the website runs on his machine).

### B6. Final check
Open any incident → **Analyze incident**.
👀 The badge says **`live`** → 🎉 it's using your GPU over Wi-Fi.
👀 If it says *recorded replay* or *rules fallback*, the connection failed. Go back to B4.

Do one Analyze **right before going on stage**, so the model is warm.

---

## Plan B: venue Wi-Fi blocks laptop-to-laptop (very common at events)

Many event Wi-Fis isolate devices from each other ("client isolation"). Then:

1. Turn on a **phone hotspot**. Connect **both** laptops to it.
2. Your IP **changes**: re-do **A2**, and re-do **A3** with his *new* IP.
3. On his laptop, update `OLLAMA_URL` in `.env` with your new IP.
4. **Restart his server** (`Ctrl+C` in terminal 2, then `npm start`). Settings are read only at start-up.
5. Re-test with **B4**.

## Plan C: no network at all (100% offline, always works)

On his laptop, set this in `.env` and restart the server:
```env
AI_MODE=replay
```
- **Analyze** instantly shows a **recorded AI answer** for the 3 alert cards (badge: *recorded replay*).
- **Draft with AI** in the Report tab uses a safe template instead.
- Everything else (clocks, seals, tampering, evidence, PDF) doesn't need AI at all.

On stage say: *"If the AI is slow or offline, Watchman falls back to a recorded answer or plain rules. A bank never stops working because of an AI."* (That's already in `PITCH_SCRIPT.md`, Part 5.)

---

## Small things to adjust in the pitch

- The header chip still says **`phi4-mini · on-device`**, because the AI is still running on a machine you control, not in the cloud. To stay accurate, say *"on our own hardware, not the cloud"* instead of *"on this laptop"*. For example: *"The AI is Microsoft Phi, running on our own machine next to us; no customer data goes to any cloud."*
- Evidence files are still fingerprinted **in his browser**. They never travel anywhere.

---

## After the hackathon: undo the network opening

On **your** laptop:
```bash
sudo systemctl revert ollama          # back to listening only on 127.0.0.1
sudo systemctl restart ollama
sudo ufw status numbered              # find the 11434 rule number
sudo ufw delete <number>              # remove it
```

---

## One-glance checklist

**You (AI laptop)**
- [ ] A1 `OLLAMA_HOST=0.0.0.0` set, restarted, `ss` shows `0.0.0.0:11434`
- [ ] A2 told friend my **current** IP
- [ ] A3 firewall allows **his** IP on 11434
- [ ] A4 model warmed up, charger in, sleep off

**Friend (demo laptop)**
- [ ] B2 `.env` has `OLLAMA_URL=http://<your-IP>:11434` and `LLM_TIMEOUT_MS=20000`
- [ ] B4 browser shows "Ollama is running"
- [ ] B5 db + server + website running
- [ ] B6 Analyze shows **live**
- [ ] Knows Plan B (hotspot) and Plan C (`AI_MODE=replay`)
