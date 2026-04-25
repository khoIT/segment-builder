# GPP Services-as-Software: From Internal Platform to Externalizable Products (Vision 2030)

**Author:** Brainstorm synthesis — Claude (Opus 4.7)
**Date:** 2026-04-24
**Audience:** GPP leadership / exec pitch
**Source material:** GPP Confluence spaces (GPP, nexus, NKB, PEN, apo, gigi, CSPlatform, PINOP, Analytics, HomeBuild) + 20+ Jira projects (VGB, APO, NB, UID, GIGI, PROD, CON, GDS, SDK, GAP, ORANGE) + Sequoia Capital "Services, the New Software" (2025) + Hawkins Pham "GPP 2026: Building a World-Class Racing Machine" (Apr 8, 2026) + GDC 2026 Field Notes (Apr 2, 2026)

---

## TL;DR

> "A copilot sells the tool. An autopilot sells the work. The work budget in any profession dwarfs the tool budget."
> — *Sequoia, Services-the-New-Software*

> "We are building a Formula 1 car. LOE without AAA is an engine without fuel. BUX without LOE is a beautiful shell that doesn't move."
> — *Hawkins Pham, GPP 2026: Racing Machine*

**Thesis.** GPP has spent 2+ years building what looks like a *platform* for VNGGames studios. Viewed through the Sequoia lens, GPP has accidentally built the raw material of **a vertical services-as-software publisher-OS for the global game industry** — and two of its F1 pieces (LOE, POE) are already close to "autopilot" form. Noah and Zing ID are defensive moats, not products. GCF is an internal-productivity bet, not an externalization candidate.

**The ask:** Pick two areas to run the "outsourcing-wedge" playbook against *external* game studios in 2026-2027 — same motion Sequoia prescribes for NDAs, claims adjusting, tax prep. Highest-conviction bets: **LOE as Agentic LiveOps** (Hawkins' own term from GDC notes) and **POE as Game-Ops-as-a-Service**.

---

## 1. The Sequoia Lens, in 90 Seconds

Three claims from the article that matter to GPP:

1. **Sell the work, not the tool.** Tool buyers budget "software"; work buyers budget "headcount + outsourcing". The work budget is 10–100× bigger. Autopilots attack the work budget from day 1.
2. **Intelligence-heavy, outsourced tasks are the entry point.** NDAs, medical coding, tax returns, basic bookkeeping — complex rules but *rules*. Studios already pay outside vendors or contractors for these. Swap vendor → not a re-org.
3. **Model improvements compound the vendor's advantage.** If you sell a tool, you race the model. If you sell the outcome, every model gain makes your service faster, cheaper, harder to catch.

Apply the 2×2:

```
                        OUTSOURCED LABOR           INSOURCED LABOR
                        (swap vendor = easy sale)  (requires org change = hard sale)
                        ─────────────────────────  ────────────────────────────────
  INTELLIGENCE-HEAVY    [ LOE ] CRM/retention ops  [ AAA ] In-house analytics teams
  (rules-based,         [ POE ] IT managed svc,    [ GCF ] PRO/PEN/GDS internal work
   verifiable outputs)         CS BPO, game-ops
                        ─────────────────────────  ────────────────────────────────
  JUDGEMENT-HEAVY       [ BUX ] Product design     (Leadership / game-design —
  (taste, strategy,           consultancies               outside GPP scope)
   hard-to-verify)
```

**Implication.** LOE and POE are the shortest paths from "internal tool" to "sellable outcome". AAA and BUX are 2nd- and 3rd-wave. GCF is inward-facing. Noah & Zing ID sit off the matrix — they are infrastructure, not services.

---

## 2. GPP Today — Scale + Narrative Anchor

From Tech Enablement KPIs and Hawkins' April 2026 post:

| Dimension | Dec 2025 state | 2030 ambition |
|---|---|---|
| Game titles on platform | ~75 | 100+ |
| Player MAU (publishing) | ~20M (in-game) + ~2M (out-of-game) | 100M |
| GPP domains/services in use | 9 (Play, Pay, Connect, Grow, Home, Launch, Analytics, PIN, GIO, GDS) | Full platform |
| Studio-ops tickets | 20,000/yr (50% manual) | 30% auto-resolve, 90% SLA |
| Evergreen titles | PUBG Mobile, Play Together, LOL, Crossfire, Justice | Thailand + regional expansion |
| AI agents (target Level-3) | POCs + GiGi MOE | 6 agents, 30+ workflows |

**Hawkins' F1 framework (verbatim):**

| F1 Piece | GPP Name | What it is |
|---|---|---|
| Engine | **LOE** (LiveOps Engine) | Right message, right player, right time, at scale — Apollo |
| Body | **BUX** (Better User Experience + Player Hub) | Unify 9 fragmented player-facing domains under one identity |
| Fuel | **AAA** (Available, Accurate, Actionable Data) | Data Platform 2.0 → Analytics Hub → self-service + ML |
| Pit Crew | **POE** (Platform Operations Excellence) | 20K tickets → auto-resolve + self-service + 90% SLA |
| Tools | **GCF** (GPP Cognitive Framework) | Embed AI into every internal function at Level-3 autonomy |

This is the frame the report uses, dual-labeled with the Sequoia product-name.

---

## 3. The Core Two-Tier Table

Outer tier = F1 focused area ⇒ Sequoia product name. Inner tier = specific tools/products that feed the area. Seven columns per inner row.

---

### **3.1  LOE (Engine) ⇒ Agentic LiveOps** — *Player Growth Services-as-Software*

| # | Tool/Product Today | Today's Form | Sequoia Lens (I/J × O/I) | Autopilot Product Vision (what we actually sell) | Target Buyer Sequence | Moat / Compounding |
|---|---|---|---|---|---|---|
| 1.1 | **Apollo** — LiveOps core: IAM, H5, push/SMS/email, journey builder, A/B tested campaigns | Internal SaaS, 8+ titles. Play Together: NRU 33→46%, first-pay lift. IAM + Live Segment shipped. | Intelligence-heavy × Outsourced (CRM managers, retention ops at studios) | Studios brief an **outcome** ("+8% D30 retention on mid-spend cohort"). LOE picks segment, composes creative, selects channel, launches, measures, iterates. Priced as % of incremental revenue. | P1: VNG captive → P2: Play Together Thailand + SEA publishers → P3: global mid-tier F2P (competes Braze/CleverTap/MoEngage on gaming depth) | 75 titles × 20M+ MAU labeled corpus horizontal tools cannot replicate. Closed UA+LiveOps loop (Hawkins GDC notes: "gap Scopely left open"). Every campaign refines the ML. |
| 1.2 | **Reusable Segmentation**: RFM cohorts, Past Segments, Live Segments | Shipped 26Q1. Pay + CS teams consuming near-realtime. | Intelligence × Outsourced (segmentation analysts) | "Auto-segment" API: ask for the audience in natural language, get a live segment + predicted response curve. Sold per-query or per-active-segment. | P1: VNG → P2: SEA studios → P3: global as standalone CDP-lite for games | Game-vertical feature set (LTV buckets, spend tier, event-participation) beats horizontal CDP taxonomies. |
| 1.3 | **ML UA Optimization** | 1 key game onboarded in 26Q1. | Intelligence × Outsourced (UA managers, ad-ops at studios) | "Growth Autopilot" — ingest MMP + store + CDP, return daily bid/creative recs; eventually autonomous bid management. Sold on CPI or ROAS share. | P1: VNG → P2: direct competitor to Appier/MoloCo/Liftoff-style autopilot bidders, but game-vertical | Integration of UA + in-game-behavior (uncommon; Hawkins: Scopely gap). |
| 1.4 | **Multi-channel Broadcasting SDK** (push, SMS, email, in-app, H5, SDK in-game UI, App Inbox) | SDK 3.x shipped across iOS/Android/Unity. | Intelligence × Outsourced (ops/infra) | "Drop-in engagement SDK" for game studios — installable, manages channel fallback, attribution, compliance. | P1: captive → P2: SEA indie/mid-tier → P3: global — narrow but sticky | Gaming-specific SDK economics (iOS fallback handling, in-game UI, App Inbox) vs. generic push services. |
| 1.5 | **Thinking Engine (POC)** — visualization + LiveOps evaluation tool | Under exploration for 5 games. | Intelligence × Insourced (data analysts) | Could be bundled inside Agentic LiveOps as the experiment-design/measurement layer. | Internal layer of (1.1) — not standalone. | Not externalizable standalone; defensible only when embedded. |

**LOE outsourcing wedge ("first NDA-equivalent"):** Sell "first-pay conversion lift on LiveOps onboarding" as a 90-day pilot, priced on incremental revenue. That's a contract CFOs sign without re-orging their CRM team.

---

### **3.2  BUX (Body) ⇒ Game-Vertical Consumer OS** — *Player-Identity Super-App*

| # | Tool/Product Today | Today's Form | Sequoia Lens (I/J × O/I) | Autopilot Product Vision | Target Buyer Sequence | Moat / Compounding |
|---|---|---|---|---|---|---|
| 2.1 | **Player Hub** | POC validated, UI system 50% done. 2M MAU target by EOY. Unifies 9 domains under single player identity. | Judgement-heavy × Outsourced (product + design consultancies) | **Not a services-as-software product.** This is a *consumer product* — sells the player experience, not a labor outcome. | Player-facing, not studio-facing. Internal strategic moat. | Data-graph compounding: every player interaction thickens the identity record → powers (1.x) LOE targeting and (3.x) AAA analytics. |
| 2.2 | **Webshop** | Available, integrated with GS campaigns, supports promotion personalization (see VGB-4671 esp-targeting). | Judgement × Mixed | "Headless commerce-for-games SDK" — embeddable cart/checkout with native IAP arbitrage. | P1: VNG → P2: SEA → P3: global mid-tier publishers | Regional payment rails (overlap with Noah) are the moat — same reason it's hard to externalize payment itself. |
| 2.3 | **Level Up** (PC launcher) | Maintenance-mode product (per TE Intro page). | Judgement × Insourced (studio launcher teams) | Not externalizable — low margin, Steam/Epic dominance, platform legacy. **Consider sunsetting / migrating to cloud-delivery model.** | N/A | No meaningful compounding outside VN-PC market. |
| 2.4 | **VNGGames Club** (player community) | Available. | Judgement × Insourced | Community ops is poor fit for "sold work" model — outcomes hard to verify, judgement-heavy. | Keep as BUX feature, not product. | — |
| 2.5 | **Giftcode / Redemption** | Mainsite integration. | Intelligence × Outsourced | Minor — ops scale too small to matter as standalone SaaS. | Internal layer. | — |

**BUX brutal truth:** BUX is the *strategic moat* for LOE/AAA, not a services-as-software bet. The value of BUX is it generates the identity-graph that makes everything else better. Do not pitch Player Hub as a "sellable product" to leadership — it's the asset that makes the other products sellable.

---

### **3.3  AAA (Fuel) ⇒ Game Analytics-as-a-Service** — *Autonomous Insights for Studios*

| # | Tool/Product Today | Today's Form | Sequoia Lens (I/J × O/I) | Autopilot Product Vision | Target Buyer Sequence | Moat / Compounding |
|---|---|---|---|---|---|---|
| 3.1 | **GDS / Data Platform 2.0 / GDC v2** | Golden Layer target 100% of games. 55→75 titles. Lineage auto-tracking. | Intelligence × Insourced (studio BI teams) | "Game Data Platform-as-a-Service" — ingest + govern + serve. Studios stop running their own pipelines. Priced per-event or per-title. | P1: captive → P2: SEA studios without mature DE → P3: mid-tier global, competes with GameAnalytics/deltaDNA/Unity Analytics | Domain schemas (IAP, session, progression, currency flows) that took years to build. Horizontal tools (Snowflake/BigQuery) don't ship with game-specific schemas. |
| 3.2 | **CDP** — real-time serving (P95 <3s target, 98% uptime KPI) | Serving APIs live. Apollo consuming. Freshness + latency gaps flagged in 26Q1 planning. | Intelligence × Insourced / Outsourced (hybrid) | "Real-time CDP for Games" — ingest + segment + serve, no DE team required. Priced per-MAU or per-event. | P1 captive → P2 SEA → P3 global, competes with Segment/Rudderstack/Hightouch on gaming depth | Realtime + game-vertical event taxonomy = narrow moat; holds only if latency SLAs hit. |
| 3.3 | **Analytics Hub + Dashboard Builder** | Prototype configures 80% of Realtime Dashboard v2. | Intelligence × Outsourced (analyst labor) | "Self-serve analytics for GS PMs" — NL query → dashboard → recommended actions. Priced per-seat then per-decision. | P1 captive → P2 SEA → P3 global (crowded space, but gaming vertical = differentiation) | Less compounding here — dashboard builders are a crowded category. Edge = gaming-specific metric library + LOE/BUX integration. |
| 3.4 | **AI Analytics Assistant** (via GiGi, FIS integration) | Proposal stage (page 1216774277). GiGi-as-core-platform, analytics as vertical. | Intelligence × Outsourced (data analyst hours) | "Ask-your-data" agent that returns numeric answer + insight + suggested action + can push the action to LOE. Priced per-query or outcome. | Directly attacks DA labor budget — same playbook as Sequoia's bookkeeping example. | 75-title labeled query corpus → compounds per question. Horizontal competitors (Snowflake Cortex, Databricks Genie) lack game semantic layer. |
| 3.5 | **pLTV + advanced segmentation models** | Early data analysis phase (per Racing Machine post). | Intelligence × Outsourced (ML engineers) | Model-as-outcome: studios don't buy a "pLTV model", they buy "predicted LTV per install" fed into UA + LOE. | Bundled with 1.x and 3.2 — not standalone. | Bundling defense — hard for pure-play LTV vendors to match multi-signal integration. |
| 3.6 | **Thinking Data integration** (SDK 3.13.0+) | Integrated, 5-game evaluation. | Intelligence × Outsourced | Could be the event pipeline substrate for 3.1/3.2. Not itself a product. | Internal component. | — |

**AAA outsourcing wedge:** Sell "daily game health report + anomaly alert" per-title, auto-generated and delivered to studio PM — replaces 0.5–1 FTE of analyst time per title. Tiny contract, zero-friction entry, expands to the full Analytics-as-a-Service stack.

---

### **3.4  POE (Pit Crew) ⇒ Game-Ops-as-a-Service** — *Studio-Operations Autopilot*

| # | Tool/Product Today | Today's Form | Sequoia Lens (I/J × O/I) | Autopilot Product Vision | Target Buyer Sequence | Moat / Compounding |
|---|---|---|---|---|---|---|
| 4.1 | **WSOT ticket system + Nexus ticket UI** | 20,000 tickets/yr processed, 50% of total requests. Target: 30% auto-resolve, 90% SLA. | Intelligence × Outsourced (IT managed svc, game-ops BPO) | **"Studio Ops Autopilot"** — starts as suggest-response agent; evolves to autonomous resolution + auto-provisioning + self-healing. Sold on SLA-outcome ("resolve 90% of studio ops tickets <4h, guaranteed"). | P1 VNG captive → P2 VNG partner studios + licensees → P3 mid-tier global publishers that can't staff 24×7 ops | 20K+ domain-specific tickets = training corpus horizontal ITSM (ServiceNow/Zendesk) cannot cheaply replicate. Gaming ops taxonomy (live-ops incidents, IAP reconciliation issues, compliance change, account recovery) is narrow vertical. |
| 4.2 | **CS AI Chatbot** (PROD/CON projects, Zalo OA integration) | KR: AI handles 50% of CS ticket volume. | Intelligence × Outsourced (CS BPOs — $200B TAM globally) | "Game CS-as-a-Service" — take over tier-1/tier-2 support for studios, outcome-priced on containment rate + CSAT. | P1 VNG → P2 SEA studios → P3 global mid-tier | Gaming-specific intent taxonomy (account recovery, IAP disputes, progression loss) + feedback loop from 75 titles × years of tickets. |
| 4.3 | **Studio Success (PIN)** — first-contact relationship team | Ops team, not a product today. | Judgement × Insourced (account management) | Partial productization: turn playbooks + onboarding runbooks into a "Studio Launch Autopilot" (see 4.4). | Support layer for other products. | Judgement-heavy — hard to fully autopilot. Likely remains services + AI-augmented model. |
| 4.4 | **Game Launch Checklist + Launching progress** | Shipped Nov 2025. Automates launch tracking + checklist. | Intelligence × Mixed | "Game Launch Autopilot" — from signed partnership → live game, run the entire checklist + coordinate cross-functional asks, escalate only exceptions. Outcome-priced on TTM. | P1 captive (Launch domain) → P2 external publishers. | Every launch refines the checklist + timing predictions. |
| 4.5 | **GPI (Game Product Info)** — central metadata sync | 100% sync target across Nexus/GDS/Play/Pay/Launch/Grow/AAWP. | Intelligence × Insourced (data entry / catalog ops) | Schema + sync fabric. Not a product; an internal dependency that makes (4.4) and (3.1) possible. | Internal layer. | — |
| 4.6 | **ITGC Support Tool + ITGC guideline** (under SOX scope automation) | Available. Automated ITGC support for games under SOX scope (June 2025). | Intelligence × Outsourced (internal audit / compliance consultancies) | **"Gaming Compliance Autopilot"** — automated ITGC + ISO 27K + SOX evidence collection + auditor-ready packets. Outcome-priced per audit cycle. | P1 VNG → P2 regulated-market studios (KR, JP) → P3 global publishers post-IPO. | Highly specific to gaming-company controls. Low competition in this niche. Strong compliance = strong moat. |
| 4.7 | **Notification Orchestration System** (Nexus + Analytics alerts via email + Zalo OA) | Released Dec 2025; 30% ticket-approval-via-Zalo-OA target. | Intelligence × Outsourced (ops/infra) | Internal layer for (4.1) — not standalone. | Internal. | — |
| 4.8 | **Tech Enablement services** — Game APIs, SMS, Email, Ip2Location, Sentry, Game Websites | All available. Serving ~75 titles. | Intelligence × Outsourced (IT managed services) | Bundle into "Game-Infra-as-a-Service": commodity infra with game-specific wrapping. Low differentiation individually, but part of the studio-ops stack. | Studio infra is hard margin — likely B2B component, not headline product. | Commoditized individually. |

**POE outsourcing wedge:** Sell "live-incident autopilot" as a 24×7 SLA contract — $X per studio per month, guarantees resolution SLA on top 20 incident types. That's the gaming equivalent of Crosby's NDAs.

---

### **3.5  GCF (Tools) ⇒ Vertical AI Agents** — *Internal-First Productivity*

| # | Tool/Product Today | Today's Form | Sequoia Lens (I/J × O/I) | Autopilot Product Vision | Target Buyer Sequence | Moat / Compounding |
|---|---|---|---|---|---|---|
| 5.1 | **GiGi (Ministry of Expert)** — agentic workflow platform | MVP + Alpha done, deployed to Nexus v2. Orchestrator with specialized sub-agents + tools + workflow routing. | Intelligence × Insourced | Internal orchestration layer for 5.2–5.6. **Not externalizable** — competes with LangChain/AutoGen/Google ADK — no differentiation outside VNG context. | Internal-only. | — |
| 5.2 | **6 AI Agents for PRO/PEN/GDS/GIO/PIN functions (Level-3 target)** | 30+ workflows planned. | Intelligence × Insourced (internal staff time) | Internal productivity play — same direction as Cursor/Gumloop/Lindy/n8n for general workflows. **Externalization unclear.** | Internal-only unless a specific agent becomes a standalone product (e.g. 4.6 Compliance Autopilot, 4.1 Ops Autopilot). | Depends which agent. Most generic agents have no vertical moat. |
| 5.3 | **CS AI Agent** (see 4.2) — classified here because it's a GCF sub-agent | Cross-listed. | See 4.2 | See 4.2 | See 4.2 | See 4.2 |
| 5.4 | **Analytics Chatbot** (see 3.4) | Cross-listed. | See 3.4 | See 3.4 | See 3.4 | See 3.4 |
| 5.5 | **GAMI (AI Enabler via AIT)** — KB, GenAI, Agent Builder | Infra component. | Intelligence × Insourced | Internal platform. Not GPP's product. | N/A | N/A |
| 5.6 | **Knowledge Base Management** | In-flight. | Intelligence × Insourced | Internal dependency. | N/A | N/A |

**GCF brutal truth:** The pitch for GCF is *internal ROI* (2× engineer output, collapse days-to-hours on ops work), not external revenue. **Do not position GCF as a sellable product.** The agents that matter commercially are the ones that appear as the engine of 3.4, 4.1, 4.2, 4.6 — sold under those brands, not as "AI agents".

---

## 4. The Outsourcing Wedge — Recommended First External Contracts

Per Sequoia playbook: start with *outsourced + intelligence-heavy + budget-exists + verifiable outcome*.

| Priority | Offer | Buyer | Contract Shape | Why this one |
|---|---|---|---|---|
| **1st** | **Agentic LiveOps pilot** — 90-day retention lift on one cohort | SEA mid-tier F2P publisher (Thailand / SG / ID / VN independent studios) | Outcome-priced: % of incremental ARPDAU uplift vs. holdout | Play Together Thailand is already a cross-market beachhead. Apollo scale proves ROI case. Labor budget (CRM + retention) is well-understood. |
| **2nd** | **Game-Ops SLA contract** — top-20 incident types, 24×7, <4h resolve | Mid-tier publisher without 24×7 ops bench | Monthly retainer + SLA penalties/bonuses | 20k-ticket corpus = defensible training data. Clear outcome metric. Replaces real BPO cost. |
| **3rd (2027)** | **Analytics-as-a-Service** — daily health report + anomaly alert per title | Same buyers as 1st | Per-title monthly fee | Low entry price, expands to full AAA stack. |
| **4th (2027-28)** | **Gaming Compliance Autopilot** — SOX/ISO 27K evidence automation | Publishers pre-IPO or in regulated markets | Per-audit-cycle | Niche, high-willingness-to-pay, low competition. |

---

## 5. The Graduation Ladder

Three phases per area, sequenced with feasibility:

| Area | P1 (now — captive) | P2 (1–2yr — SEA / partner studios) | P3 (3–5yr — global F2P) |
|---|---|---|---|
| **LOE** | 8+ VNG titles | Play Together Thailand + 2-3 SEA publishers | Global mid-tier F2P (vs. Braze/CleverTap) |
| **AAA** | All VNG titles on Data Platform 2.0 | SEA studios without DE teams | Game Analytics-as-a-Service (vs. GameAnalytics/Unity Analytics) |
| **POE** | VNG KPIs (30% auto-resolve) | VNG licensees + partner studios | Mid-tier global publishers buying ops outcome |
| **BUX** | Player Hub 2M MAU target | Regional expansion with flagship titles | Longer horizon — identity-graph as API |
| **GCF** | 6 agents, 30+ workflows live internally | — | — (keep internal; surface through other products) |

---

## 6. Durability & Moat Map — Why Model Improvements Compound *Our* Advantage

| Area | Compounding mechanism | Weakness if mis-executed |
|---|---|---|
| LOE | Multi-title, multi-channel, multi-year labeled campaign corpus. UA+LiveOps integration. Closed retention loop. | Too few titles × too little data → ML plateau. Competitors (Braze/CleverTap) already investing Agentic. **Window is 12–24 months.** |
| AAA | Game-specific semantic layer (IAP, progression, currency, session taxonomy) + reliability SLAs. | If CDP latency/uptime targets slip, the moat evaporates — horizontal tools win on reliability. |
| POE | 20K+ gaming-specific tickets; vertical taxonomy horizontal ITSM can't copy cheaply. | If gaming ops is too studio-specific per title, generalization fails. Needs ~5+ non-VNG customers to validate. |
| BUX | Identity graph thickens per interaction; makes LOE/AAA better. | Not externalizable as a standalone product — pitching it that way wastes runway. |
| GCF | Internal productivity only. | Competes with horizontal players without vertical edge. Keep internal. |

---

## 7. Brutal Honesty — Where the Thesis Does NOT Apply

Per user request: explicit "don't externalize this" calls.

### 7.1  **Noah (Payment Core) — Defensive Moat, Not Product**

- **Why not:** Payment requires local regulatory licensing (SBV in VN, BOT in TH, BSP in PH), PCI-DSS, risk management against chargeback fraud, relationships with local payment rails. These are judgment-heavy, heavily regulated, and geographically fragmented. Competitors (Xsolla, PayerMax, Coda Payments) have decade-long licensing head-starts.
- **What it IS:** The infrastructure that makes LOE revenue-priced contracts possible (close the loop on "incremental revenue"). Treat as critical internal moat.
- **Long-term option:** If and only if VNG reaches scale as a regional payment aggregator, spin out as a separate business — but that's a 5–10yr horizon and a different company/org.

### 7.2  **Zing ID / VNGGames Account — Legacy Identity, Low External Demand**

- **Why not:** Regional (Vietnam-first) identity, legacy technical debt, competes with regional identity providers (KakaoTalk in KR, LINE in JP/TH, Google/Apple/Facebook globally). No differentiation for non-VN publishers.
- **What it IS:** Internal cost + strategic moat (same role as Noah). Modernization (the "New Zing ID" project in TE roadmap) is technical-debt pay-down, not productization.
- **Do not pitch.** Will hurt credibility of the rest of the portfolio.

### 7.3  **Nexus (the Hub Itself) — Componentize, Don't Sell As-Is**

- **Why not:** Internal portal UI tied to VNG org structure, domain taxonomy, permissioning model. Hard to extract as-is.
- **What it IS:** The *integration surface* that makes all tools feel like one product. A competing publisher would have their own portal. If anything is sellable, it's the *underlying services* (LOE/AAA/POE APIs + SDKs), not the portal.
- **Strategic move:** Continue Nexus as internal; expose the underlying capabilities through APIs/SDKs for external consumption.

### 7.4  **GCF Agents — Internal Productivity, Not a Product Line**

- **Why not:** Generic coding/ops/analysis agents compete with a massive horizontal field (Cursor, Devin, Gumloop, Lindy, n8n, Vercel AI Agents). GPP has no structural advantage in horizontal productivity.
- **What it IS:** ROI-multiplier for internal staff; an accelerant of every other initiative. Justifies its own budget on internal savings.
- **Specific carve-out:** When a GCF agent becomes the *engine* of a vertical product (Analytics Chatbot inside AAA; CS Agent inside POE), it's sold under *that product's brand*, not as "an AI agent".

### 7.5  **Level Up (PC Launcher) — Candidate for Sunset / Migration**

- **Why not:** PC launcher market is Steam/Epic-dominated. Maintenance-mode product per TE docs.
- **Recommendation:** Evaluate migration to cloud-delivery / browser-first experience under BUX rather than continuing to invest in native launcher.

### 7.6  **Launch Checklist — Services Engagement, Not SaaS**

- **Why not:** The checklist exists as SaaS component (4.4), but the *execution* is a judgment-heavy, relationship-heavy sale. Closer to a McKinsey engagement than a SaaS subscription.
- **Alternative:** Sell as a **services engagement augmented by the autopilot** (Sequoia's "management consulting" play, page 10 of their article). Premium pricing, smaller volume, hybrid delivery.

---

## 8. Strategic Recommendations

### 8.1  Pick Two in 2026-2027

Don't try to externalize everything. Concentrate:

- **Bet #1: LOE as Agentic LiveOps.** Highest leverage (recurring, outcome-priced, large TAM). Best market window (12–24 months before Braze/CleverTap close the Agentic gap). Beachhead: Play Together Thailand proves cross-market viability.
- **Bet #2: POE as Game-Ops-as-a-Service.** Lowest competitive density *in the gaming vertical*. The 20K-ticket corpus is the moat. SLA-outcome contracts are proven B2B form.

### 8.2  Org Implications

Services-as-software requires different org DNA than a platform team. Concretely:

| Capability | Today | Needed for external |
|---|---|---|
| Product marketing | Minimal (internal users) | External positioning, gaming conferences (GDC, Gamescom), analyst relations |
| Sales / BD | VNG internal champions | External deal teams with game-industry relationships |
| Customer success | Studio-success team (PIN) | External CSM with SLAs, not internal stakeholder management |
| Security posture | VNG-internal + ITGC | SOC 2 Type II, ISO 27K, regional data residency |
| Pricing / monetization | Internal chargeback (if any) | Usage-based + outcome-based contract ops |
| Legal | VNG corporate | B2B SaaS contracts, DPAs, cross-border data |

**Decision required from leadership:** Does external-facing GPP run as a **business unit** inside VNGGames, or as a **spin-out** with separate P&L and equity? Both are viable. Spin-out is cleaner for sales motion but slower to start.

### 8.3  Funding Model

If LOE + POE are the bets:
- **LOE pilot** — estimate 10–15 FTE incremental (product marketing, CSM, 2 external pilot engineers, deal support). Pilot ROI verifiable within 90 days per contract.
- **POE pilot** — estimate 8–10 FTE incremental. SLA-based contracts lowest risk; can run parallel to internal KPI work.

### 8.4  Avoid the "Platform Trap"

The hardest trap: pitch all 5 F1 pieces equally. Leadership will dilute focus, nothing ships. Sequoia is emphatic: **start with one wedge, expand later.** This memo's strongest recommendation is to concentrate 2026–2027 on LOE externalization and delay the rest to 2028+.

---

## 9. Risks & Counterpoints

- **Cannibalization.** External clients may compete with VNG-published titles. Mitigation: exclusivity clauses per market/genre, or tiered access (VNG titles see features 6 months early).
- **Platform dependency.** External revenue could flop and the internal mandate snaps shut. Mitigation: run as a self-funding pilot with clear exit criteria.
- **Regulatory.** Cross-border data (segments, CDP), privacy (PII), regional payment rules. Requires compliance investment before P2.
- **Timing risk.** Braze, CleverTap, MoEngage all investing in agentic layers. Window is 12–24 months, not 5 years.
- **Talent dilution.** External-facing products require different profile than platform engineers. Risk of losing internal focus if best people redirected.
- **Studio buyer risk.** Game studios have been poor SaaS buyers historically (high piracy tolerance, bespoke ops). Counter: outcome-priced contracts align incentives better than seat-based SaaS.
- **Sequoia thesis caveats for gaming.** Gaming industry has more *judgement-heavy* work than insurance/law (creative, game design, community). Services-as-software plays best on the *operational* layers, not creative. This memo's selections (LOE, POE, AAA) are all operational by design.

---

## 10. Success Metrics

| Phase | Metric | Target (horizon) |
|---|---|---|
| P1 Captive | LOE-onboarded titles | 12+ VNG titles by EOY 2026 |
| P1 Captive | POE auto-resolve rate | 30% (committed KPI) |
| P1 Captive | AAA freshness P95 | <3s (committed KPI) |
| P2 Entry | First external paying contract (LOE) | Q4 2026 |
| P2 Entry | First external POE SLA contract | Q2 2027 |
| P2 Expansion | 5 non-VNG paying customers (LOE) | EOY 2027 |
| P3 Scale | Externally-sourced ARR | $10M+ run-rate by EOY 2028 |
| P3 Scale | % of GPP revenue from non-VNG | 20%+ by 2030 |

---

## 11. Next Steps (If This Memo Ships)

1. **Leadership read-out** — walk through sections 3, 4, 7, 8.
2. **Decision on the two bets** — LOE and POE are the recommended starters.
3. **Org design** — business-unit vs. spin-out decision. Required org additions (marketing/sales/CSM/security).
4. **Beachhead planning** — Play Together Thailand as the LOE validator. Identify 2–3 SEA publisher targets.
5. **Pilot scoping** — 90-day outcome-priced pilot contracts drafted. Pricing model (% incremental revenue for LOE; SLA retainer for POE).
6. **Moat investments** — SOC 2 Type II, ISO 27K, regional data residency. Likely 6–9 months and $X.

---

## 12. Appendix — Sources

### Confluence pages (cloudId `ab926f34-1cce-4303-b9b8-99dbf927e315`)
- `4194756` — GPP Overview ("Vision 2030")
- `1433108658` — **GPP 2026: Building a World-Class Racing Machine** (Hawkins Pham, Apr 8 2026) ← *primary narrative anchor*
- `1427243041` — **GDC 2026 Field Notes** (Hawkins, Apr 2 2026) ← *"Agentic LiveOps" term origin; Scopely UA+LiveOps gap*
- `1155760144` — Meeting 1 (key problems), Jan 8 2026
- `637567514` — GPP FAQ (domain + team list)
- `388399183` — Tech Enablement Introduction
- `808583169` — Nexus 4Q OKR (2025)
- `1244037608` — LiveOps Engine BRD (Apollo)
- `1423245339` — Apollo OKR 26Q2
- `1419837830` — Apollo OKR 26Q1
- `1420984345` — Apollo Quarterly Report 26Q1
- `1437040756` — Apollo + Promotion Engine Product Review (Apr 7)
- `1234239546` — Project LiveOps (Feb 2)
- `473169924` — GiGi Overview (Draft)
- `465438578` — GiGi Assistant PRD (Ministry of Expert)
- `542212135` — GiGi Assistant Overview
- `1216774277` — Analytic Chatbot Proposal (GiGi Platform)
- `1470431240` — Meeting with GiGi (Apr 15)
- `265781249` — CS AI Assistant (GPP Applied AI)
- `1023508687` — Analytics Monthly Update (Nov 27)
- `463339535` — User Management PRD (Nexus role-based access)
- `1481441356` — GPP Document restructure proposal
- `489554106` — GPP Domain Leader JD

### Jira project keys
- `VGB` — Noah (payment core) + WSOT
- `APO` — Apollo (LiveOps Engine)
- `NB` — Nexus
- `UID` — Nexus UX
- `GIGI` / `ORANGE` — GiGi (agentic workflow)
- `PROD` — Product Core (including CS AI Chatbot)
- `CON` — Connect
- `GDS` — Game Data Studio
- `SDK` — Native SDK (iOS/Android/Unity)
- `GAP` — Game APIs (Tech Enablement)

### External references
- Sequoia Capital, *Services, the New Software* — https://sequoiacap.com/article/services-the-new-software/ (central thesis: Copilot sells the tool; Autopilot sells the work)

---

## Unresolved Questions

1. **External BU vs. spin-out.** Leadership decision, not mine. Both viable, different org speed + legal shape.
2. **Play Together Thailand contract model.** Is there an existing commercial envelope that can host an outcome-priced LOE pilot, or does it need a new contracting vehicle?
3. **Noah regional expansion.** If VN-only today, does the payment rail reach SEA in P2 timeframe to support external LOE revenue-priced contracts? If not, LOE pricing defaults to seat/usage until Noah scales.
4. **Competitive window.** How fast are Braze/CleverTap/MoEngage shipping Agentic? I don't have primary data beyond Hawkins' GDC notes — recommend a dedicated researcher pass before go-to-market.
5. **Data residency / PII.** SEA external contracts may need regional deployment. Is GDS multi-region today or single-region VN?
6. **Services-vs-product distinction at the sales edge.** For LOE pilot #1, is the first contract sold as *product* (LOE SaaS) or *services* (VNG team runs the LiveOps for you using LOE)? Sequoia suggests latter → migrate to former. Recommend hybrid initially.
7. **GiGi overlap with external products.** GiGi is positioned as internal orchestrator; but Analytics Chatbot and CS Agent sit inside GiGi and *also* sit inside AAA/POE as external products. How are brand boundaries drawn at the sales edge?
8. **What happens to Connect / Home domains** in this taxonomy? Connect (communications) is partially absorbed into LOE's multi-channel layer; Home/Nexus is the portal. Both underweighted in this memo — flag for a v2 pass if leadership cares.
