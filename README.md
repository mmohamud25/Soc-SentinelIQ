# SentinelIQ

**Live:** [soc.mmohamud.me](https://soc.mmohamud.me)

I built this because I wanted a portfolio project that actually reflects what security work looks like. Not a landing page with a pie chart, but a tool an analyst could sit down and use.

SentinelIQ is a SOC platform. It pulls live threat intelligence, lets you triage alerts with AI assistance, generates SOAR response playbooks, tracks NIST CSF 2.0 compliance, and manages incidents from detection to closure. Everything runs off a single HTML file and a Supabase Edge Function.


## Why I built it this way

Most cybersecurity portfolio projects are either too simple (a network scanner, a password checker) or too generic (a cloned dashboard with fake data). I wanted something that covered the actual analyst workflow, from the moment an alert fires to closing an incident and writing the handover for the next shift.

I also wanted the security to be real, not decorative. The backend validates every input, rate-limits by IP, keeps all API keys server-side, and returns only what the frontend actually needs. It's the kind of thing that comes up in interviews when someone asks "how do you think about secure design."

---

## What it does

**Alert Queue**: The main workspace. Alerts come in from AlienVault OTX in real time. You can triage them (Escalate, Investigate, Close), run AI analysis, generate a step-by-step SOAR playbook, write analyst notes that sync to Supabase, and see if any other active alerts share the same asset or IP. SLA clocks run per severity. Critical alerts breach at 15 minutes.

**AI Analyst**: Sends the alert to Claude and gets back a structured verdict: true positive or false positive, confidence score, MITRE tactic and technique, root cause, priority score, and recommended actions. It comes back as cards, not a wall of text.

**SOAR Playbook**: Based on the MITRE tactic, Claude generates a response procedure in five phases: Contain, Investigate, Eradicate, Recover, Report. Each step has a checkbox. When they're all done it tells you to document it in the incident timeline.

**Incident Management**: Full lifecycle from New to Closed with a live timeline. You can create an incident from any alert. There's an AI executive summary that gives you a risk level, status line, business impact, and recommended next steps. Short enough to actually read.

**GRC Tracker**: 30 NIST CSF 2.0 controls. Each one has a status, an owner, evidence fields, and an AI guidance button that explains what the control actually requires and what a common implementation mistake looks like.

**Threat Hunt**: Bulk IOC lookup that hits AbuseIPDB and VirusTotal in real time. Paste in a list of IPs, hashes, or domains and get back verdicts and scores for each one. You can save queries for replay. There's also a MITRE ATT&CK matrix that highlights which tactics are active based on current alerts.

**Reports**: Four tabs: weekly AI threat summary (auto-generates when you open it), shift handover brief for the incoming analyst, GRC compliance snapshot, and individual incident reports you can export to PDF.

---

## Stack

- React 18 via CDN, no build tools
- Supabase Edge Functions (Deno/TypeScript) as the API layer
- Supabase PostgreSQL for alert persistence
- Anthropic Claude claude-haiku-4-5 for all AI features
- AlienVault OTX, AbuseIPDB, VirusTotal for threat intel
- GitHub Pages with custom domain

No webpack, no Next.js, no `node_modules`. The whole frontend is one HTML file. That made deployment simple and forced me to be deliberate about what I was actually building rather than configuring tooling.

---

## How the backend works

All external API calls go through a Supabase Edge Function. The browser never touches OTX, AbuseIPDB, VirusTotal, or Anthropic directly. This keeps credentials server-side and lets me control exactly what comes back.

The function has a few specific security controls I'm glad I added:

The origin check was straightforward: reject anything not from my domains before doing any work. The rate limiter was more interesting because AI calls and IOC lookups have different cost profiles, so they get separate buckets. Claude calls are capped at 10 per IP per minute. IOC lookups get 20 because they're cheaper but someone could still burn through my VirusTotal quota.

The IOC validator I'm actually proud of. Before any external call happens, the indicator gets checked against strict regex: IPv4 octets must be 0-255, hashes must be exactly 32/40/64 hex characters, domains have to match a safe pattern. If it fails, it returns 400 immediately. Nothing touches AbuseIPDB or VirusTotal unless the input is clean.

The response extraction was a deliberate choice. AbuseIPDB returns a huge JSON object. I pull out maybe 8 fields and discard the rest. The browser never sees the raw response.

---

## Setup

**Database**

Run `setup.sql` in Supabase SQL Editor. Creates the `soc_alerts` table with Row Level Security.

**Secrets**

Add these in Supabase → Edge Functions → Manage Secrets:

```
Sentinal-Anthropic   →  console.anthropic.com
OTX_API_KEY          →  otx.alienvault.com (free account)
ABUSEIPDB_KEY        →  abuseipdb.com (free account)
VT_API_KEY           →  virustotal.com (free account)
```

Without a key, that data source falls back silently. The platform still runs, it just won't have live IOC data or OTX alerts.

**Edge Function**

Deploy `index.ts` as a Supabase Edge Function named `ai-analyst`.

**Frontend**

Rename `sentineliq.html` to `index.html`, push to GitHub Pages.

**Spend cap**

Set a monthly limit on Anthropic at console.anthropic.com. I use $10. The rate limiting handles abuse but the spend cap is the last line of defence.

---

## Files

```
index.html    ~3,500 lines  full React app
index.ts      ~500 lines    Supabase Edge Function
setup.sql                   database schema + RLS policies
README.md                   this file
```

---

## What I'd build next

Real auth via Supabase. Right now the analyst login is simulated with localStorage. With `supabase.auth.signIn()` and row-level security, each analyst would only see their assigned alerts. That's the gap between "impressive demo" and "actual product."

Real-time sync via Supabase Realtime would come with that. Two browser tabs staying in sync as alerts get triaged.

---

## About

I'm Mohamed Mohamud. I'm based in Columbus, Ohio. I have a CompTIA Security+ (SY0-701, DoD 8570 IAT Level II), a BS in Business Administration from Franklin University, and I'm finishing an MS in Business Analytics. I run Kulan Group Ltd, which builds education and career tools for the Somali diaspora community.

I'm looking for roles in SOC analysis, GRC, or IT security. If you're hiring or want to talk about the project, reach me at:

[mmohamud.me](https://mmohamud.me) · [linkedin.com/in/mohamed-2-mohamud](https://linkedin.com/in/mohamed-2-mohamud)
