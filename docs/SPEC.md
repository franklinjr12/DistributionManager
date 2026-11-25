# 04 - MVP Engineering Specification, Architecture & Implementation Backlog - Maquinabel SaaS

# **Maquinabel Omnichannel AI SDR & Lead Qualification SaaS — MVP Engineering Specification, Architecture & Implementation Backlog**

**Document Purpose:** End-to-end product specification, technical architecture, domain knowledge base, deployment blueprint, and agent-ready engineering backlog for building and deploying v1 of the multi-tenant Autonomous Paid Ads Provisioning, Lead Capture & Technical Pre-Sales SaaS, starting with Maquinabel as Client Zero (Design Partner). v1 elevates autonomous paid ads provisioning (Google Ads API v26 + Meta Marketing API v26.0), closed-loop offline conversion optimization, and 3-level ROI analytics to the core P0 MVP priority—solving top-of-funnel B2B lead volume and eliminating agency dependency even if post-click triage were manual, while seamlessly integrating the consultative AI SDR and Kanban CRM to automate end-to-end qualification.  
**Primary Reference Sources:** [03 - Planejamento Técnico do MVP SaaS e Discovery - Projeto Maquinabel](https://docs.google.com/document/d/16sNVOS3jkyHxbmyrdl0lJBFoikMIBDupkR8gIRIaowM/edit?usp=drivesdk&ouid=110218015828462459513), [01 - Resumo Estratégico e Análise de Viabilidade - Maquinabel](https://docs.google.com/document/d/1DEUKHImYgs2ID6RfDTaGveycMJOIT_AJH2Jm5RRTR9o/edit?usp=drivesdk&ouid=110218015828462459513), [02 - Proposta de Ferramentas Comerciais e Aquisição de Leads - Maquinabel](https://docs.google.com/document/d/1VevziwB2FJq1ilcLRisCPI_M8y3XecuEZWVdU8RuyBE/edit?usp=drivesdk&ouid=110218015828462459513), [Maquinabel Official Website](https://maquinabel.com.br/), [Maquinabel Equipment Catalog](https://maquinabel.com.br/maquinas/), and [Maquinabel Commercial Landing Page](https://vendas.maquinabel.com.br/).

# **1. Executive Summary, Company Profile & Validated Problem Statement**

## **1.1 Client Zero Profile: Maquinabel**

[Maquinabel](https://maquinabel.com.br/quem-somos/) is an authorized Alfa Tennant dealership (commercializing Tennant®, Nobles®, and Alfa equipment) and a regional leader in B2B professional and industrial floor-cleaning machinery across Northern and Northeastern Brazil, led by CEO **Vinicius Goés**.

  

  - **Headquarters (Matriz):** Rua dois de junho, Galpão 13A, Águas Brancas, Ananindeua-PA, CEP 67033-215 ([Maquinabel Home](https://maquinabel.com.br/)).
  - **Branch (Filial):** Av. Jerônimo de Albuquerque, 6, Subsolo, Vinhais, São Luís-MA, CEP 65074-199 ([Maquinabel Home](https://maquinabel.com.br/)).
  - **Service Coverage:** Pará (PA), Maranhão (MA), and Amapá (AP) ([Maquinabel Commercial Page](https://vendas.maquinabel.com.br/)).
  - **Official Contact Channels:** WhatsApp (91) 99380-1020, Email comercial@maquinabel.com.br, Business Hours: Monday to Friday, 08:00–18:00 BRT ([Maquinabel Home](https://maquinabel.com.br/)).
  - **Revenue Models:**
      
    1.  **Consultative B2B Equipment Sales:** Industrial floor scrubbers, sweepers, polishers, carpet extractors, high-pressure washers, and autonomous robotic scrubbers ([Maquinabel Home](https://maquinabel.com.br/)).
    2.  **Recurring Fleet Rental (Locação):** Short- and long-term contracts (1 day up to 1+ years), with equipment inspected and sanitized prior to delivery ([Maquinabel Rental](https://maquinabel.com.br/aluguel/)).
    3.  **Authorized Maintenance & Original Parts:** Preventive and corrective field maintenance for Alfa Tennant equipment ([Maquinabel Maintenance](https://maquinabel.com.br/manutencao/)).
  - **Ideal Customer Profile (ICP):** Distribution centers and logistics warehouses, general manufacturing, food & beverage plants (requiring NSF-certified / chemical-free ec-H2O™ hygiene), supermarkets and wholesale clubs, shopping malls, and outsourced facility cleaning companies. Reference clients include Castanheira Shopping, Supermercado Líder, Mateus, and Assis Panificadora ([Maquinabel Home](https://maquinabel.com.br/)).

## **1.2 Validated Operational Pains (From Discovery with Vinicius Goés)**

Discovery documented in [03 - Planejamento Técnico do MVP SaaS e Discovery](https://docs.google.com/document/d/16sNVOS3jkyHxbmyrdl0lJBFoikMIBDupkR8gIRIaowM/edit?usp=drivesdk&ouid=110218015828462459513) established four binding truths that dictate the MVP architecture:

  

1.  **Bottleneck \#1 — Demand Volume ("Falta volume de Lead") & End-to-End Hands-Off Ads Management — CORE MVP PRIORITY:** Automation ("plumbing") cannot create demand alone ([01 - Resumo Estratégico](https://docs.google.com/document/d/1DEUKHImYgs2ID6RfDTaGveycMJOIT_AJH2Jm5RRTR9o/edit?usp=drivesdk&ouid=110218015828462459513)). Because Maquinabel lacks in-house paid traffic engineers or agency budgets, the MVP MUST make **Autonomous Paid Ads Provisioning, Optimization & Analytics the \#1 core pillar**—solving top-of-funnel B2B lead volume even if post-click triage were handled manually. v1 autonomously generates, deploys, and optimizes campaign structures across Google Ads API v26 and Meta Marketing API v26.0 (R$ 1,000/month budget across PA/MA during business hours), executes closed-loop offline conversion dispatch (Google Ads API & Meta CAPI) on SQL and deal-close events, runs weekly LLM negative-keyword pruning, and executes an automated B2B ICP outbound prospecting engine (CNAE/Google Places mining in PA/MA/AP + Resend email/WhatsApp utility outreach) to directly generate high-ticket B2B quotes.
2.  **Bottleneck \#2 — Technical Sizing Friction ("Na maioria das vezes procura pela máquina mas não sabe qual a máquina adequada\!"):** Inbound leads rarely know which Alfa Tennant model fits their area (m²), floor surface, dirt profile, and power preference. Static forms on [vendas.maquinabel.com.br](https://vendas.maquinabel.com.br/) suffer drop-off and slow manual follow-up. The AI agent must act as a **24/7 Consultative Technical Pre-Sales SDR** that sizes the right equipment in under 10 seconds before handing off.
3.  **Bottleneck \#3 — Single-Point Commercial Routing ("São todos direcionados para mim…"):** All qualified leads currently route exclusively to Vinicius Goés. The v1 MVP must eliminate multi-rep round-robin complexity and instead protect Vinicius's time by filtering out curious/non-ICP/out-of-region inquiries and delivering a structured 4-line pre-sized brief directly to his WhatsApp and Kanban board.
4.  **Capital Efficiency vs. DIY Infoproducts:** Maquinabel rejected DIY education/template subscriptions costing R$ 2,580–6,180/month on annual lock-in contracts ([01 - Resumo Estratégico](https://docs.google.com/document/d/1DEUKHImYgs2ID6RfDTaGveycMJOIT_AJH2Jm5RRTR9o/edit?usp=drivesdk&ouid=110218015828462459513)). The custom multi-tenant SaaS MVP must operate within **R$ 50–110/month** in direct cloud/API infrastructure costs while building reusable proprietary SaaS IP.

**Operational Responsibilities Split (Automated System vs. Maquinabel External Actions):**

|  |  |
| :-: | :-: |
| \*\*Automated by SaaS System\*\* | \*\*Maquinabel Outside the System (Vinicius Goés)\*\* |
| • Campaign blueprint generation from Alfa Tennant catalog specs• PA/MA/AP geo-fencing & Mon–Fri 08:00–18:00 BRT ad scheduling• UTM, gclid, and fbclid tracking parameter auto-injection• PAUSED batch campaign mutation via Google & Meta APIs• Weekly LLM negative-keyword search query pruning & WhatsApp digest• Closed-loop SQL & BRL Won offline conversion API dispatch• Automated B2B ICP prospect mining & multi-touch outreach• 24/7 consultative AI SDR technical triage & sizing• Real-time 3-level ROI & Stop-Loss analytics reporting | • One-time Google Ads & Meta Business Manager account creation, CNPJ verification, and billing/payment setup• Reviewing proposed campaign blueprints in dashboard and toggling from PAUSED to ENABLED• Recording short raw video footage (Instagram Reels) of Alfa Tennant machines operating in warehouses/malls• Executing \\\<= 15-minute sales follow-up and formal pricing quotes• Dragging Kanban cards and recording BRL proposal/won values and loss reasons |

## **1.3 Client Zero Pilot Terms & Success Metrics (60-Day Stop Loss)**

  

|  |  |  |
| :-: | :-: | :-: |
| \*\*Metric / Term\*\* | \*\*Target / Commitment\*\* | \*\*Source & Rationale\*\* |
| \*\*Pilot Duration & Stop Loss\*\* | 60 days; minimum \*\*10 qualified B2B quotes (SQLs)\*\* emitted |  01 - Resumo Estratégico |
| \*\*Automated Campaign Provisioning Time\*\* | \\\< 5 minutes from catalog seed to deployed PAUSED Google & Meta campaigns |  03 - Planejamento Técnico |
| \*\*Paid Attribution Coverage\*\* | 100% UTM, gclid, and fbclid parameter capture on inbound ad leads |  03 - Planejamento Técnico |
| \*\*Maquinabel Direct Cost\*\* | R$ 50–110/mo infra + R$ 1,000/mo paid media (R$ 0 dev/license fee) |  03 - Planejamento Técnico |
| \*\*AI First-Response Latency\*\* | \\\< 10 seconds across Website, IG Direct, and WhatsApp |  03 - Planejamento Técnico |
| \*\*Lead Qualification Speed\*\* | \\\< 30 seconds from initial signal to active triage; full brief in \\\<= 4–6 turns |  03 - Planejamento Técnico |
| \*\*Human Handoff SLA\*\* | \\\<= 15 minutes during business hours (Mon–Fri 8h–18h) by Vinicius Goés |  03 - Planejamento Técnico |
| \*\*Break-Even Unit Economics\*\* | 1 Rental (R$ 3,500/mo x 24m = R$ 84,000 LTV) or 1 Sale (R$ 10k–20k+ gross margin) |  02 - Proposta de Ferramentas |
| \*\*3-Level Attribution\*\* | Level 1 (CPL) -\\\> Level 2 (SQL Count & Cost/SQL) -\\\> Level 3 (Pipeline & Closed BRL) |  01 - Resumo Estratégico |

# **2. MVP Functional Scope (5 Integrated Modules)**

## **Module 1 — Core Autonomous Paid Ads Provisioning, Optimization & Analytics Engine (MVP Core — Top Priority P0)**

  - **1A. AI Campaign Provisioner & One-Click Deployment (Google Ads API v26 + Meta Marketing API v26.0):** Uses OpenAI gpt-4o-mini Structured Outputs over tenant configuration (allowed\_states: \['PA','MA','AP'\], business hours, budget) and knowledge base (10 Alfa Tennant machines) to generate themed campaign structures: Google Search (Rental, Purchase, Parts/Maintenance, Autonomous Robotics) with targeted keyword clusters, negative lists, and Responsive Search Ads (15 headlines, 4 descriptions, auto-injected tracking\_url\_template), plus Meta Click-to-WhatsApp and Instagram Direct/Reels campaign structures. Presents a **"Review & Approve Proposed Campaigns"** preview in the Next.js UI, then executes batch mutations via \`CampaignBudgetService\`, \`CampaignService\`, \`CampaignCriterionService\`, \`AdGroupService\`, \`AdGroupCriterionService\`, \`AdGroupAdService\` (Google Ads API v26) and \`/{ad\_account\_id}/campaigns\`, \`/adsets\`, \`/adimages\`, \`/advideos\`, \`/adcreatives\`, \`/ads\` (Meta Marketing API v26.0), creating all entities in PAUSED status for 1-click activation by Vinicius Goés. **Platform Access & App Review Strategy:** Applies for Google Ads Developer Token Basic Access in Week 1; uses Meta Business Portfolio System User token with \`ads\_management\` permission (public Meta App Review deferred to v2 multi-tenant SaaS onboarding).
  - **1B. Closed-Loop Offline Conversions (Google Ads API v26 + Meta CAPI v26.0):** Automatically dispatches offline conversion events to Google Ads API and Meta Conversions API (CAPI) when a lead reaches QUALIFIED\_HANDOFF (SQL event) or WON (Deal Won with BRL contract value). Binds conversion events to persisted gclid, fbclid, email, and E.164 phone hash so ad algorithms self-optimize specifically for high-ticket B2B buyers in PA, MA, and AP without requiring human traffic managers.
  - **1C. Automated Weekly Google Ads Search-Term Optimizer & Pacing Guardrails:** A scheduled BullMQ cron worker pulls weekly Search Query Reports via Google Ads API (\`GoogleAdsService.SearchStream\`), feeds search terms to OpenAI gpt-4o-mini for non-ICP / residential / retail intent classification (e.g., filtering out residential pressure washers, Kärcher domestic mops, toy sweepers), automatically injects negative keywords into active Google Ads campaigns, and dispatches a concise WhatsApp digest summary to Vinicius Goés.
  - **1D. Automated B2B ICP Outbound Prospecting Engine:** Scheduled enrichment worker mines public Brazilian CNPJ/CNAE registries and Google Places API for verified B2B accounts (logistics warehouses, food/beverage plants, supermarkets, shopping malls, outsourced cleaning contractors) in Pará, Maranhão, and Amapá. Executes throttled multi-touch outbound sequences via Resend API (B2B email, using free tier up to 3,000 emails/month) and Meta pre-approved WhatsApp utility templates, feeding all prospect responses directly into Module 3's AI SDR state machine.

## **Module 2 — Lean Omnichannel Entry via WordPress Typebot & Tracked Links + IG Graph API**

  - **Lean Website Entry (Typebot / Tracked Links):** To focus 4-week engineering effort entirely on acquisition and ads optimization, custom Preact Shadow DOM widget development is deferred to v2. v1 standardizes on an embedded Typebot widget or lightweight script installed via WPCode on maquinabel.com.br and vendas.maquinabel.com.br, capturing URL parameters (utm\_\*, gclid, fbclid) and generating tracked wa.me deep-links with pre-filled \#MQ-XXXX session codes that route to the backend webhook /api/v1/widget/lead.
  - **Instagram Graph API Webhooks:** Subscribes to comments and messages fields on Maquinabel's Instagram account. On high-intent comments (e.g., preço, aluguel, orçamento), posts a rotated public reply and initiates a private DM linked to the post context tag (e.g., IG\_Reels\_S16).

## **Module 3 — Consultative AI Technical Pre-Sales SDR (WhatsApp Cloud API + IG Direct)**

  - **Week-1 Fast Validation Fallback:** If custom widget QA slips, an identical Typebot flow pointing to the exact same backend webhook /api/v1/widget/lead can run on Day 1 without changing downstream CRM/AI logic.
  - **Webhook Subscriptions:** Subscribes to comments and messages fields on Maquinabel's Instagram Professional Account via Meta Graph API (official, zero ban risk).
  - **Comment Trigger & Intent Filter:** Monitors organic posts, Reels, and Meta Ads comments. Triggers on high-intent keywords (preço, valor, quanto, aluguel, locação, alugar, cotação, orçamento, ficha, comprar, funciona, lavadora, varredeira, manutenção) OR LLM lightweight intent classification (intent === 'COMMERCIAL\_INQUIRY'). Ignores spam, emojis-only, and Maquinabel's own replies.
  - **Dual Automated Action (\< 5 seconds):**

<!-- end list -->

1.  **Public Comment Reply:** Posts a rotated, natural PT-BR reply (e.g., *"Olá\! Acabamos de enviar os detalhes técnicos e opções para sua operação no seu Direct\!"* — rotated across 5 variations to avoid Meta spam heuristics).
2.  **Private DM Initiation:** Sends an Instagram Direct message linked to the exact post/Reel caption context (e.g., IG\_Reels\_S16), starting the 4-question consultative triage and offering to send the full PDF spec sheet and quote on WhatsApp.

## **Module 3 — Consultative AI Technical Pre-Sales SDR (WhatsApp Cloud API + IG Direct)**

  - **Single-Call Structured Outputs:** Every inbound turn invokes OpenAI gpt-4o-mini (with Anthropic claude-3-5-haiku as pluggable fallback) using JSON Schema **Structured Outputs** and **Prompt Caching** on the Alfa Tennant Markdown catalog. One API call returns:

<!-- end list -->

1.  reply\_text (humanized, concise PT-BR response, \<= 3 short paragraphs, max 1–2 questions per turn).
2.  extracted\_fields (incremental structured lead data merged into PostgreSQL).
3.  recommended\_models (array of 1–2 grounded Alfa Tennant models with rationale and theoretical m²/h productivity).
4.  next\_state (QUALIFYING, QUALIFIED\_HANDOFF, DISQUALIFIED\_OUT\_OF\_REGION, HUMAN\_REQUESTED).

<!-- end list -->

  - **Mandatory Qualification Fields (4 Core + Technical Enrichers):**

<!-- end list -->

1.  **Modality (****modality****):** COMPRA (new/used), LOCACAO (short/long-term rental), or MANUTENCAO\_PECAS (preventive/corrective service or original parts).
2.  **Environment & Segment (****segment****):** CD\_LOGISTICA, INDUSTRIA, SUPERMERCADO\_ATACAREJO, SHOPPING, ALIMENTOS\_BEBIDAS, PRESTADORA\_LIMPEZA, HOSPITAL\_HOTEL\_ESCOLA, or OUTRO.
3.  **Technical Dimensions (****area\_m2****,** **floor\_type****,** **dirt\_profile****,** **power\_preference****,** **usage\_routine****):** Approximate area in m², floor type (porcelanato, ceramica, cimento\_queimado, epoxi, granito, vinilico, externo\_asfalto, carpete\_estofado), soil/debris profile (fine dust, grease/oil, heavy solid debris, high foot traffic), cord vs. battery preference, and daily/weekly routine (aligned with [vendas.maquinabel.com.br](https://vendas.maquinabel.com.br/)).
4.  **Location (****location\_city****,** **location\_state****):** Validates active service coverage in **PA, MA, and AP**. Out-of-region leads are politely informed of Maquinabel's regional coverage (PA/MA/AP) and tagged DISQUALIFIED\_OUT\_OF\_REGION without interrupting Vinicius's WhatsApp.
5.  **B2B Identity (****company\_name****,** **is\_b2b****):** Captures company name/CNPJ context naturally to distinguish B2B ICP accounts from residential curiosity.

<!-- end list -->

  - **Non-Negotiable Safety Guardrails:**

<!-- end list -->

  - **Zero Price Hallucination:** Absolute prompt & post-processing guardrail forbidding final prices, rental rates, discounts, freight quotes, or binding delivery timelines.
  - **Catalog Grounding:** Must only recommend machines present in Maquinabel's verified Alfa Tennant catalog; never invent specs.
  - **Business Hours Awareness:** Operates 24/7 for triage; when handing off outside Mon–Fri 08:00–18:00 BRT, informs the lead that Vinicius Goés will send the formal quote on the next business day starting at 08:00.
  - **Message Debounce Buffer:** Aggregates rapid consecutive WhatsApp/IG bubbles from the same user over a **5-second sliding window** via BullMQ/Redis before running a single LLM inference.

## **Module 4 — State Machine, Handoff Engine & Lean Kanban CRM Dashboard**

  - **Deterministic State Machine:** NEW -\> QUALIFYING -\> QUALIFIED\_HANDOFF (AI automatically paused) -\> HUMAN\_ACTIVE -\> PROPOSAL\_SENT -\> WON | LOST | DISQUALIFIED\_OUT\_OF\_REGION.
  - **Automated Handoff to Vinicius Goés (v1 Single-Recipient Routing):**

<!-- end list -->

  - Triggered immediately when all 4 mandatory fields are populated OR when the user explicitly requests a human (HUMAN\_REQUESTED).
  - Sends a formatted WhatsApp notification (via Meta Cloud API approved utility template novo\_lead\_qualificado to guarantee delivery even outside Vinicius's 24h window) containing:
      
      - **Line 1:** Lead Name, Company, WhatsApp click-to-chat link, and City/State.
      - **Line 2:** Modality + Origin Tag (e.g., Google\_Ads\_Locacao, IG\_Reels\_S16, Site\_Brava).
      - **Line 3:** Technical Profile (Segment, Area m², Floor Type, Dirt/Routine).
      - **Line 4:** AI-Recommended Alfa Tennant Model(s) + 1-sentence technical sizing rationale + direct link to the Kanban card.

<!-- end list -->

  - **Kanban CRM, Campaign Provisioner & Attribution Web App (Next.js + Tailwind):**

<!-- end list -->

  - **Campaign Provisioner & Ad Management UI:** Preview proposed AI campaign blueprints, edit budget/keywords, trigger 1-click batch deployment to Google/Meta in PAUSED state, toggle campaign status (PAUSED \<-\> ENABLED), and view live ad metrics (impressions, clicks, spend, leads, SQLs, BRL won).
  - **Kanban Columns:** Novos, Em Qualificação, Enviado ao Vendedor, Proposta Enviada, Fechado (Ganho), Perdido / Desqualificado.
  - **Mandatory Close-Out Discipline:** Moving a card to Proposta Enviada prompts for Estimated Proposal Value (BRL); moving to Fechado (Ganho) requires Final Contract/Sale Value (BRL) + Modality (Sale vs. Rental Monthly x Months); moving to Perdido requires selecting a structured Loss Reason (Preço, Prazo, Fora de Região, Sem Retorno, Concorrente, Curioso/Residencial).
  - **Human Takeover Controls:** Live chat transcript viewer with one-click **Pause AI / Resume AI** toggle and manual reply box (sending via Meta Cloud API).
  - **3-Level ROI & 60-Day Stop-Loss Dashboard:** Tracks Monthly Ad Spend (manual or CSV input), Total Leads, CPL, Qualified SQLs (with visual progress bar toward the 10-SQL 60-day Stop Loss threshold), Conversion Rate by Source/Campaign, Median AI Response Time, Median Human SLA Response Time (target \<= 15 min), Open Pipeline (BRL), and Closed Revenue (BRL).

# **3. Maquinabel Domain Knowledge Base & Technical Sizing Matrix (Seed Data)**

The following verified equipment catalog extracted from [Maquinabel's Catalog](https://maquinabel.com.br/maquinas/) and official Alfa Tennant documentation serves as the initial knowledge\_items seed data for Prompt Caching.

## **3.1 Verified Alfa Tennant Equipment Catalog**

|  |  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*Model\*\* | \*\*Category\*\* | \*\*Operation\*\* | \*\*Theoretical Productivity\*\* | \*\*Tank / Hopper\*\* | \*\*Key Verified Specs & Ideal Application\*\* | \*\*Source\*\* |
| \*\*Alfa Mini\*\* | Micro Scrubber |  Walk-behind | Small areas | 5 L solution | 280 mm path; replaces mop & bucket with clean-water washing for tight commercial areas. | \[Tennant Alfa Mini\](https://www.tennantco.com/pt\_br/1/machines/scrubbers/product.alfa-mini.lavadora-compacta-de-opera%C3%A7%C3%A3o-a-p%C3%A9.alfa-mini.html) |
| \*\*i-mop Lite\*\* | Compact Scrubber |  Walk-behind (Battery) | Up to 1,050 m²/h | Compact portable | 368 mm path, 16.5 kg (w/ battery & water), \\\>= 68 dBA, 360° maneuverability for congested spaces, clinics, kitchens, multi-site cleaning. | \[Tennant i-mop Lite\](https://www.tennantco.com/pt\_br/1/machines/scrubbers/product.i-mop-lite.lavadora-de-piso-de-opera%C3%A7%C3%A3o-a-p%C3%A9.1263271.html) |
| \*\*A260 / A260c\*\* | Floor Scrubber |  Walk-behind (Battery / Cord) | Up to 2,000 m²/h | 40 L sol / 45 L rec | 510 mm cleaning path, 772 mm squeegee, \\\<= 69 dBA, 141.5 kg (w/ batteries). Indoor hard floors (porcelain, ceramic, epoxy, polished concrete, vinyl). | \[Tennant A260\](https://www.tennantco.com/pt\_br/1/machines/scrubbers/product.a260.lavadora-de-piso-de-opera%C3%A7%C3%A3o-a-p%C3%A9.a260.html) |
| \*\*T600e\*\* | Medium Industrial Scrubber |  Walk-behind (Battery) | Medium-to-large industrial | High-capacity | Heavy-duty replacement for 5680; durable build for harsh industrial floors, optional chemical-free ec-H2O NanoClean™. | \[Tennant T600e\](https://www.tennantco.com/pt\_br/1/machines/scrubbers/product.t600e.lavadora-de-piso-de-opera%C3%A7%C3%A3o-a-p%C3%A9.m-t600e.html) |
| \*\*Brava\*\* | Ride-On Scrubber |  Ride-on (Battery 36V) | Up to 5,220 m²/h (practical \\\~2,015 m²/h) | 120 L sol / 120 L rec | 870 mm path, 700 mm body width (fits elevators/narrow aisles), roll-out battery swap, \\\>= 70 dBA, Made in Brazil (BNDES eligible). Malls, warehouses, supermarkets, industry. | \[Tennant Brava\](https://www.tennantco.com/pt\_br/1/machines/scrubbers/product.brava.lavadora-de-piso-de-opera%C3%A7%C3%A3o-a-bordo.brava.html) |
| \*\*T16AMR\*\* | Autonomous Robotic Scrubber |  Autonomous / Ride-on (BrainOS®) | Up to 5,890 m²/h | 190 L sol / 225 L rec | 910 mm cylindrical head (reduces pre-sweeping), \\\>= 71 dBA, up to 5.5h Li-ion runtime, ec-H2O NanoClean™. Large CDs, logistics, wholesale clubs solving labor shortages. | \[Tennant T16AMR\](https://www.tennantco.com/pt\_br/1/machines/robotics/product.t16amr.lavadora-industrial-de-piso-aut%C3%B4noma.M-T16AMR.html) |
| \*\*Alfa Bizz\*\* | Manual Sweeper |  Walk-behind (Mechanical) | Up to 3,400 m²/h | 40 L hopper | 920 mm path, 23.8 kg, silent mechanical drive (no battery/cord), indoor/outdoor. Condos, schools, parking lots, small/medium sites. | \[Alfa Bizz Specs\](https://slimpe.com.br/produtos/marcas/alfa-tennant/varredeira-manual-alfa-bizz/) |
| \*\*S16\*\* | Ride-On Sweeper |  Ride-on (Battery) | Up to 10,340–13,490 m²/h | 150 L hopper | 1,170 mm (1 side brush) / 1,520 mm (2 side brushes), multi-stage dust filtration. Large warehouses, logistics yards, dusty industrial areas (indoor/outdoor). | \[Tennant S16\](https://www.tennantco.com/pt\_br/1/machines/sweepers/product.s16.varredeira-compacta-de-opera%C3%A7%C3%A3o-a-bordo-a-bateria.m-s16h.html) |
| \*\*Alfa Pressure 400\*\* | High-Pressure Washer |  Electric 220V | Heavy washdown | 600 L/h flow | 1,885 lbs working / 2,320 lbs max pressure, 2,800 W, radial ceramic-piston pump, INMETRO certified. Heavy industrial washdown, gas stations, fleets. | \[Alfa Pressure 400 Specs\](https://slimpe.com.br/produtos/marcas/alfa-tennant/lavadora-de-alta-pressao-alfa-pressure-400/) |
| \*\*Extratora Alfa Ext52\*\* | Carpet & Upholstery Extractor |  Electric (Wet/Dry) | Carpets, cold floors, upholstery | Dual function | Low noise, solids & liquids extraction for hotels, hospitals, offices, cleaning contractors. | \[Maquinabel Máquinas\](https://maquinabel.com.br/maquinas/) |

## **3.2 Deterministic Technical Sizing Heuristic (Embedded in System Prompt)**

  - **Wet Floor Washing (Indoor Hard Floors):**
      
      - \< 500 m² or tight/congested rooms -\> **Alfa Mini** or **i-mop Lite** (360° agility).
      - 500 – 2,500 m² -\> **A260** (battery) or **A260c** (corded if user explicitly requests corded); upgrade to **T600e** for heavy industrial grease/soil or ec-H2O™ food/beverage hygiene.
      - 2,500 – 6,000 m² -\> **Brava** (compact ride-on, passes through 70 cm doors/elevators, BNDES eligible for purchase).
      - \> 5,000 m² or multi-shift logistics/supermarkets with labor constraints -\> **T16AMR** (autonomous BrainOS®) alongside **Brava** as human-operated alternative.
  - **Dry Sweeping / Dust & Solid Debris (Indoor/Outdoor):**
      
      - \< 3,000 m², noise-sensitive, no-power-needed -\> **Alfa Bizz**.
      - \>= 3,000 m² warehouses, logistics yards, heavy dust -\> **S16** (battery ride-on with multi-stage dust control).
  - **Specialized Needs:**
      
      - Heavy encrusted grease/outdoor washdown -\> **Alfa Pressure 400**.
      - Carpets, upholstery, hotels/hospitals -\> **Extratora Alfa Ext52**.

## **3.3 Production System Prompt Blueprint (PT-BR) & Structured Output Contract**

t  
Você é o Consultor Técnico Virtual da Maquinabel, concessionária autorizada Alfa Tennant (líder em máquinas de limpeza profissional e industrial no Norte e Nordeste, com matriz em Ananindeua-PA e filial em São Luís-MA).

  

OBJETIVO:  
Atender leads B2B em português do Brasil de forma cordial, direta e consultiva, coletando os 4 dados obrigatórios para dimensionar a máquina Alfa Tennant ideal e encaminhar o lead pronto para orçamento ao diretor comercial Vinicius Goés.

  

DADOS OBRIGATÓRIOS A COLETAR (faça no máximo 1 a 2 perguntas curtas por mensagem):

  

1.  Modalidade: Compra, Locação (aluguel) ou Manutenção/Peças.
2.  Segmento/Ambiente: Ex.: galpão logístico/CD, indústria, supermercado/atacarejo, shopping, alimentos e bebidas, hospital/hotel ou prestadora de limpeza.
3.  Dimensão e Piso/Sujeira: Metragem aproximada (m²), tipo de piso (porcelanato, epóxi, cimento queimado, cerâmica, externo, carpete) e tipo de sujeira (poeira fina, graxa/óleo, detritos sólidos).
4.  Localização: Cidade e Estado.

  

REGRAS CRÍTICAS E GUARDRAILS:

  

  - NUNCA informe preços fechados, valores de mensalidade de locação, descontos ou prazos de entrega vinculantes. Diga que o orçamento oficial personalizado será enviado pela equipe comercial.
  - COBERTURA REGIONAL: Atendemos Pará (PA), Maranhão (MA) e Amapá (AP). Se o lead for de outro estado, informe educadamente a área de atuação da Maquinabel e defina next\_state = "DISQUALIFIED\_OUT\_OF\_REGION".
  - DIMENSIONAMENTO: Assim que tiver os 4 dados, recomende 1 (ou até 2) modelos do catálogo Alfa Tennant abaixo citando a produtividade (m²/h) e o motivo técnico da indicação, e defina next\_state = "QUALIFIED\_HANDOFF".
  - TRANSFERÊNCIA IMEDIATA: Se o usuário pedir para falar com um humano/vendedor diretamente, defina next\_state = "HUMAN\_REQUESTED".
  - HORÁRIO COMERCIAL: Nosso atendimento humano funciona de segunda a sexta, das 8h às 18h. Fora desse horário, avise que Vinicius retornará no próximo dia útil às 8h.
  - BASE TÉCNICA AUTORIZADA: \[INJECTED VIA PROMPT CACHING — SECTION 3.1 MARKDOWN\]

  
  

\*\*LLM Structured Output JSON Schema (Zod / OpenAI \`response\_format: json\_schema\`):\*\*

  

\`\`\`json

{

  "type": "object",

  "required": \["reply\_text", "next\_state", "extracted\_fields", "recommended\_models", "handoff\_summary\_4\_lines"\],

  "properties": {

    "reply\_text": { "type": "string", "description": "Natural PT-BR message to send to the lead." },

    "next\_state": { "type": "string", "enum": \["QUALIFYING", "QUALIFIED\_HANDOFF", "DISQUALIFIED\_OUT\_OF\_REGION", "HUMAN\_REQUESTED"\] },

    "extracted\_fields": {

      "type": "object",

      "properties": {

        "lead\_name": { "type": \["string", "null"\] },

        "company\_name": { "type": \["string", "null"\] },

        "modality": { "type": \["string", "null"\], "enum": \["COMPRA", "LOCACAO", "MANUTENCAO\_PECAS", null\] },

        "segment": { "type": \["string", "null"\] },

        "area\_m2": { "type": \["number", "null"\] },

        "floor\_type": { "type": \["string", "null"\] },

        "dirt\_profile": { "type": \["string", "null"\] },

        "power\_preference": { "type": \["string", "null"\], "enum": \["bateria", "cabo", "manual", "indiferente", null\] },

        "usage\_routine": { "type": \["string", "null"\] },

        "location\_city": { "type": \["string", "null"\] },

        "location\_state": { "type": \["string", "null"\] }

      }

    },

    "recommended\_models": {

      "type": "array",

      "items": {

        "type": "object",

        "required": \["model\_name", "reason"\],

        "properties": {

          "model\_name": { "type": "string" },

          "reason": { "type": "string" }

        }

      }

    },

    "handoff\_summary\_4\_lines": { "type": \["string", "null"\], "description": "Populated only when next\_state is QUALIFIED\_HANDOFF or HUMAN\_REQUESTED." }

  }

}

# **4. System Architecture & Technical Design (Deploy-Ready & Multi-Tenant)**

## **4.1 Definitive Technology Stack**

To maximize execution speed for downstream coding agents and preserve strict type safety across all four modules, the project uses a **single-language TypeScript Monorepo**:

  

|  |  |  |
| :-: | :-: | :-: |
| \*\*Layer\*\* | \*\*Technology\*\* | \*\*Rationale\*\* |
| \*\*Monorepo & Tooling\*\* | pnpm Workspaces + Turborepo (apps/api, apps/web, packages/shared) | Shares Zod schemas, state-machine enums, and API types across backend, CRM, and widget. |
| \*\*Backend API & Workers\*\* | Node.js 20 LTS + Fastify + TypeScript + BullMQ | Ultra-fast async webhook ingestion, built-in JSON schema validation, reliable 5s debounce queues and retries. |
| \*\*Queue / Debounce Store\*\* | Upstash Redis (Serverless) | Powers BullMQ message-burst debouncing, idempotency locks, and rate limiting on Free Tier (10k cmds/day). |
| \*\*Database, Auth & Realtime\*\* | Supabase (PostgreSQL 15 + RLS + Auth + Realtime) | Native multi-tenant isolation via Row-Level Security (tenant\\\_id), live Kanban updates, pgvector ready for v2 RAG. |
| \*\*AI Orchestration\*\* | OpenAI SDK (gpt-4o-mini Structured Outputs + Prompt Caching) with Anthropic claude-3-5-haiku adapter | Sub-2s inference, strict JSON extraction, \\\~50% input token discount on cached Alfa Tennant catalog. |
| \*\*Messaging Channels\*\* | Meta WhatsApp Cloud API (v21.0+), Instagram Graph API, Google Ads API, Meta CAPI & Resend API | Zero ban risk, free 24h user-initiated service windows, free 72h Click-to-WhatsApp/Direct ad windows. |
| \*\*Admin CRM Frontend\*\* | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui + @dnd-kit | Responsive Kanban board, transcript viewer, AI pause/resume, and 3-level ROI/Stop-Loss dashboard. |
| \*\*Website Widget\*\* | Typebot / WordPress Script Embed (WPCode) | Zero CSS collision with Maquinabel's WordPress theme; instant async load. |

## **4.2 High-Level Data Flow**

1.  **Campaign Provisioning & Ads Flow:** Admin triggers campaign creation in Next.js UI -\> \`CampaignProvisionerWorker\` invokes OpenAI \`gpt-4o-mini\` Structured Output over \`tenants\` config and \`knowledge\_items\` catalog -\> generates blueprint JSON -\> Admin reviews/approves -\> API executes batch mutations to Google Ads API v26 and Meta Marketing API v26.0 creating entities in \`PAUSED\` status -\> Admin toggles \`ENABLED\` -\> Sync worker pulls live impressions, clicks, spend into \`ad\_campaigns\` table.
2.  **Inbound & Outbound Events:** Visitor interacts with WordPress Typebot -\> /api/v1/widget/\*, OR sends WhatsApp/IG Direct message -\> /webhooks/meta/\*. Cron workers invoke GoogleAdsWeeklyOptimizerWorker, OutboundProspectingWorker, and OfflineConversionSyncWorker.
3.  **Fast Ack & Idempotency:** Fastify validates X-Hub-Signature-256 (HMAC-SHA256), checks meta\_message\_id in Redis/DB to prevent duplicate processing, persists raw webhook\_logs and messages, and returns HTTP 200 within \< 200ms.
4.  **Debounce Queue:** Enqueues a BullMQ delayed job (delay: 5000ms, jobId: debounce:${conversationId}, removing/replacing any pending job for that conversation so rapid multi-message bursts merge into one AI turn).
5.  **AI Turn & State Transition:** Worker loads conversation history + tenant's cached Markdown knowledge base + current lead JSON, executes LLM Structured Output call, updates leads & conversations in a single transaction, and dispatches the reply via Meta Cloud API.
6.  **Handoff & Conversion Dispatch:** When state transitions to QUALIFIED\_HANDOFF or HUMAN\_REQUESTED, sets ai\_paused = true, creates/moves Kanban card to Enviado ao Vendedor, logs handoff\_events, sends 4-line WhatsApp alert to Vinicius Goés, and dispatches SQL offline conversions to Google Ads API & Meta CAPI via OfflineConversionSyncWorker.

## **4.3 Multi-Tenant Database Schema (Supabase PostgreSQL + RLS)**

Every tenant-scoped table includes tenant\_id UUID NOT NULL REFERENCES tenants(id) and enforces Supabase Row-Level Security (USING (tenant\_id = auth.jwt() -\>\> 'tenant\_id'::uuid) for dashboard users; service-role key restricted strictly to backend API).

  

  - **tenants**: id (PK), slug (unique, e.g. 'maquinabel'), name, timezone ('America/Belem'), business\_hours\_json, allowed\_states (TEXT\[\], e.g. \['PA','MA','AP'\]), handoff\_whatsapp\_phone, meta\_waba\_id, meta\_phone\_number\_id, meta\_ig\_account\_id, meta\_access\_token\_encrypted, system\_prompt\_override, active (bool), created\_at.
  - **users**: id (PK, refs auth.users), tenant\_id, full\_name, email, role ('ADMIN' | 'SALES\_REP'), whatsapp\_phone, created\_at.
  - **leads**: id (PK), tenant\_id, name, phone\_e164, ig\_scoped\_id, ig\_username, company\_name, modality, segment, area\_m2 (numeric), floor\_type, dirt\_profile, power\_preference, usage\_routine, location\_city, location\_state, recommended\_models\_json, handoff\_summary, kanban\_stage ('NEW' | 'QUALIFYING' | 'HANDOFF' | 'PROPOSAL\_SENT' | 'WON' | 'LOST' | 'DISQUALIFIED'), proposal\_value\_brl (numeric), closed\_value\_brl (numeric), rental\_months (int), loss\_reason, origin\_tag, lgpd\_consent\_at, created\_at, updated\_at. (Unique partial indexes on (tenant\_id, phone\_e164) and (tenant\_id, ig\_scoped\_id)).
  - **lead\_attributions**: id (PK), tenant\_id, lead\_id (FK), session\_code (unique, e.g. 'MQ-4821'), channel ('WEB\_WIDGET' | 'WHATSAPP\_DIRECT' | 'IG\_COMMENT' | 'IG\_DM' | 'META\_AD' | 'GOOGLE\_AD'), landing\_url, referrer, utm\_source, utm\_medium, utm\_campaign, utm\_term, utm\_content, gclid, fbclid, ig\_media\_id, created\_at.
  - **conversations**: id (PK), tenant\_id, lead\_id (FK), channel ('WHATSAPP' | 'INSTAGRAM' | 'WIDGET'), state ('NEW' | 'QUALIFYING' | 'QUALIFIED\_HANDOFF' | 'HUMAN\_ACTIVE' | 'CLOSED' | 'DISQUALIFIED\_OUT\_OF\_REGION'), ai\_paused (bool, default false), last\_user\_message\_at, last\_ai\_response\_at, first\_response\_ms (int), human\_first\_response\_at, created\_at, updated\_at.
  - **messages**: id (PK), tenant\_id, conversation\_id (FK), direction ('INBOUND' | 'OUTBOUND'), sender\_type ('LEAD' | 'AI' | 'HUMAN\_AGENT' | 'SYSTEM'), content\_text, meta\_message\_id (unique), llm\_tokens\_in (int), llm\_tokens\_out (int), llm\_cost\_usd (numeric), created\_at.
  - **knowledge\_items**: id (PK), tenant\_id, title, category, markdown\_content, metadata\_json, active (bool), updated\_at.
  - **handoff\_events**: id (PK), tenant\_id, lead\_id (FK), conversation\_id (FK), assigned\_user\_id (FK), trigger\_reason, summary\_sent, whatsapp\_delivery\_status, notified\_at, acknowledged\_at.
  - **ad\_spend\_entries**: id (PK), tenant\_id, month\_start (date), channel ('GOOGLE\_ADS' | 'META\_ADS'), campaign\_name, spend\_brl (numeric), notes.
  - **webhook\_logs**: id (PK), tenant\_id, provider ('META\_WA' | 'META\_IG'), event\_type, payload\_json, processed\_at, error\_message, created\_at.
  - **outbound\_prospects**: id (PK), tenant\_id, cnpj, company\_name, cnae, segment, city, state, phone\_e164, email, source ('CNPJ\_MINING' | 'GOOGLE\_PLACES'), outreach\_status ('PENDING' | 'SENT\_EMAIL' | 'SENT\_WA' | 'REPLIED' | 'DISQUALIFIED'), last\_contacted\_at, lead\_id (FK), created\_at.
  - **ad\_optimization\_logs**: id (PK), tenant\_id, provider ('GOOGLE\_ADS' | 'META\_CAPI'), action\_type ('CAMPAIGN\_PROVISION' | 'NEGATIVE\_KEYWORDS\_PRUNING' | 'OFFLINE\_CONVERSION'), run\_date (date), terms\_analyzed (int), negative\_keywords\_added\_json, offline\_conversions\_sent (int), summary\_text, created\_at.
  - **ad\_campaigns**: id (PK), tenant\_id (FK), provider ('GOOGLE\_ADS' | 'META\_ADS'), external\_campaign\_id, external\_adgroup\_ids\_json, name, objective, target\_modality, daily\_budget\_brl (numeric), status ('DRAFT' | 'PAUSED' | 'ENABLED' | 'ARCHIVED'), generated\_blueprint\_json, impressions (int), clicks (int), spend\_brl (numeric), leads\_count (int), sqls\_count (int), won\_brl (numeric), last\_synced\_at, created\_at.

## **4.4 Core API & Webhook Endpoints**

|  |  |  |
| :-: | :-: | :-: |
| \*\*Method & Path\*\* | \*\*Auth\*\* | \*\*Purpose\*\* |
| GET /webhooks/meta/whatsapp |  Meta Verify Token |  Webhook challenge handshake. |
| POST /webhooks/meta/whatsapp |  X-Hub-Signature-256 |  Receives WhatsApp messages & delivery statuses; extracts \\\#MQ-XXXX bridge tokens; enqueues debounce job. |
| GET /webhooks/meta/instagram |  Meta Verify Token |  Webhook challenge handshake. |
| POST /webhooks/meta/instagram |  X-Hub-Signature-256 |  Receives IG comment events (triggers public reply + DM) and IG Direct messages (enqueues debounce job). |
| POST /api/v1/widget/session |  Public (tenant\\\_slug + CORS) |  Creates attribution record from URL/UTMs; returns context-aware greeting & session\\\_code. |
| POST /api/v1/widget/lead |  Public (tenant\\\_slug + CORS) |  Captures Name, E.164 WhatsApp, LGPD opt-in; returns tracked wa.me bridge link. |
| GET /api/v1/leads |  Supabase JWT (RLS) |  Lists leads filtered by Kanban stage, channel, date range, and search query. |
| PATCH /api/v1/leads/:id |  Supabase JWT (RLS) |  Updates Kanban stage, proposal/closed BRL values, loss reason, and manual notes. |
| POST /api/v1/conversations/:id/toggle-ai |  Supabase JWT (RLS) |  Pauses or resumes the AI SDR for human takeover. |
| POST /api/v1/conversations/:id/messages |  Supabase JWT (RLS) |  Sends manual human agent reply via WhatsApp Cloud API / IG Direct; records human\\\_first\\\_response\\\_at for SLA tracking. |
| GET /api/v1/analytics/funnel \|  \|  \|  \|&#10;\| :-: \| :-: \| :-: \|&#10;\| POST /api/v1/ads/sync-conversions \|  Supabase JWT (RLS) \| Triggers manual sync of pending SQL and Won offline conversions to Google Ads API & Meta CAPI. \|&#10;\| POST /api/v1/ads/optimize-negative-keywords \|  Supabase JWT (RLS) \| Runs Google Ads search-term auditor, applies negative keywords via LLM, and sends WhatsApp digest. \|&#10;\| POST /api/v1/outbound/trigger-prospectingPOST /api/v1/ads/campaigns/generate-blueprintPOST /api/v1/ads/campaigns/deployPATCH /api/v1/ads/campaigns/:id/status \|  Supabase JWT (RLS)Supabase JWT (RLS)Supabase JWT (RLS)Supabase JWT (RLS) \| Mines PA/MA/AP B2B prospects and triggers throttled Resend email / WhatsApp utility outreach.Generates structured Google Search & Meta ad campaign blueprint from tenant config & catalog.Executes API batch mutations deploying approved campaign blueprint to Google/Meta in PAUSED status.Updates ad campaign status (PAUSED \\\\\\\<-\\\\\\\> ENABLED) and syncs external API state. \|&#10;  |  Supabase JWT (RLS) |  Returns 3-level ROI metrics (Spend, Leads, CPL, SQLs vs. 10-SQL target, Pipeline BRL, Closed BRL, AI & Human SLA medians). |

## **4.5 Security, LGPD & Meta Compliance Guardrails**

  - **Webhook Verification:** Mandatory HMAC-SHA256 validation against META\_APP\_SECRET using constant-time comparison before parsing payloads.
  - **Token Encryption:** Tenant Meta access tokens encrypted at rest using AES-256-GCM (ENCRYPTION\_KEY env var).
  - **LGPD Compliance:** Explicit opt-in timestamp (lgpd\_consent\_at) recorded on website widget submissions (mirroring Maquinabel's existing notice *"Ao enviar, você autoriza o contato da Maquinabel para retorno comercial"* on [vendas.maquinabel.com.br](https://vendas.maquinabel.com.br/)), plus data-deletion endpoint DELETE /api/v1/leads/:id/gdpr to anonymize PII on request.
  - **Meta 24h Window Protection:** Outbound messages to leads \> 24h after last\_user\_message\_at are blocked from free-form text and automatically routed through pre-approved Meta Utility Templates.

# **5. Infrastructure, Deployment & CI/CD Blueprint**

## **5.1 Production Hosting Topology (Target Budget: R$ 50–110/month)**

|  |  |  |  |
| :-: | :-: | :-: | :-: |
| \*\*Component\*\* | \*\*Provider & Tier\*\* | \*\*Estimated Cost (BRL/mo)\*\* | \*\*Scaling Trigger\*\* |
| \*\*API + BullMQ Worker\*\* | Railway (Hobby Plan — US$ 5/mo) |  R$ 28 – R$ 35 | Upgrade when \\\> 5 active tenants |
| \*\*Database + Auth + Realtime\*\* | Supabase (Free Tier -\\\> Pro US$ 25/mo later) |  R$ 0 (MVP) | Upgrade at 500MB DB or multi-tenant commercial launch |
| \*\*Redis (Debounce/Queue)\*\* | Upstash Redis (Free Tier — 10k cmds/day) |  R$ 0 (MVP) | Pay-as-you-go above 10k cmds/day |
| \*\*Web CRM + Widget CDN\*\* | Vercel (Hobby Tier) |  R$ 0 (MVP) | Upgrade to Pro for commercial SaaS team |
| \*\*LLM Inference\*\* | OpenAI API (gpt-4o-mini + Prompt Caching) |  R$ 20 – R$ 50 | Scales linearly (\\\~R$ 0.01–0.03 per qualified lead) |
| \*\*WhatsApp & IG APIs\*\* | Meta Cloud API (24h service & 72h CTWA free) |  R$ 0 – R$ 15 (handoff templates) | Utility template notifications to Vinicius (\\\~R$ 0.05/alert) |
| \*\*Total MVP Operational Cost\*\* | \*\*Full Production Stack\*\* |  \*\*R$ 48 – R$ 100/month\*\* | \*\*Well within R$ 50–110/month budget\*\* |

## **5.2 Required Environment Variables (****.env.example****)**

  - **Core & Security:** NODE\_ENV, PORT, APP\_BASE\_URL, WIDGET\_ALLOWED\_ORIGINS (https://maquinabel.com.br,https://vendas.maquinabel.com.br), ENCRYPTION\_KEY.
  - **Supabase:** SUPABASE\_URL, SUPABASE\_ANON\_KEY, SUPABASE\_SERVICE\_ROLE\_KEY, DATABASE\_URL.
  - **Redis:** UPSTASH\_REDIS\_URL.
  - **AI Providers:** OPENAI\_API\_KEY, OPENAI\_MODEL=gpt-4o-mini, ANTHROPIC\_API\_KEY (optional fallback).
  - **Meta Platform & Ads APIs:**META\_APP\_ID, META\_APP\_SECRET, META\_WEBHOOK\_VERIFY\_TOKEN, META\_CAPI\_DATASET\_ID, GOOGLE\_ADS\_DEVELOPER\_TOKEN, GOOGLE\_ADS\_CLIENT\_ID, GOOGLE\_ADS\_CLIENT\_SECRET, GOOGLE\_ADS\_REFRESH\_TOKEN, GOOGLE\_ADS\_CUSTOMER\_ID, RESEND\_API\_KEY (free tier \<= 3k emails/mo), MAQUINABEL\_WA\_PHONE\_NUMBER\_ID, MAQUINABEL\_HANDOFF\_PHONE=+5591993801020.
  - **Observability:** SENTRY\_DSN, LOG\_LEVEL=info.

## **5.3 CI/CD Pipeline (GitHub Actions)**

1.  **On Pull Request (****ci.yml****):** pnpm install --frozen-lockfile -\> pnpm lint -\> pnpm typecheck -\> pnpm test:unit (including AI sizing & guardrail golden tests) -\> pnpm build.
2.  **On Merge to** **main** **(****deploy.yml****):** Run Supabase SQL migrations (supabase db push) -\> Auto-deploy apps/api to Railway -\> Auto-deploy apps/web to Vercel -\> Run post-deploy smoke test (GET /health + GET /webhooks/meta/whatsapp verify check).

## **5.4 Maquinabel Production Onboarding & Integration Runbook**

1.  **Maquinabel One-Time Prerequisites Outside SaaS System:** Confirm Google Ads account and Meta Business Manager ownership, CNPJ verification, payment/billing setup, apply for Google Ads Developer Token Basic Access in Week 1, and record raw on-site video clips (Instagram Reels) of Alfa Tennant machinery in action.
2.  **Automated Campaign Provisioning & Meta Setup:** SaaS API generates campaign blueprints, presents review UI, and executes batch mutations to Google Ads API v26 & Meta Marketing API v26.0 creating entities in PAUSED status; register WhatsApp Cloud API number with System User Token (\`whatsapp\_business\_messaging\`, \`ads\_management\`, \`instagram\_basic\`); submit utility template novo\_lead\_qualificado for approval.
3.  **WordPress Widget Injection & Ads Tracking Wiring:** Install script plugin on maquinabel.com.br and vendas.maquinabel.com.br; confirm auto-injected UTM tracking templates (\`?utm\_source=google\&utm\_medium=cpc\&utm\_campaign={campaignid}\&utm\_term={keyword}\`) on deployed campaigns.
4.  **Vinicius Goés Onboarding (15-min walkthrough):** 1-click campaign review and activation (PAUSED -\> ENABLED), WhatsApp handoff alert validation, mobile/desktop Kanban bookmarking, and 15-minute SLA / close-out modal workflow review.
5.  **Meta Business Manager Setup:** Verify Maquinabel Business Portfolio, generate permanent System User Token with whatsapp\_business\_messaging, whatsapp\_business\_management, instagram\_basic, instagram\_manage\_comments, instagram\_manage\_messages, pages\_messaging; register WhatsApp Cloud API number; submit utility template novo\_lead\_qualificado for approval.
6.  **WordPress Widget Injection:** Install lightweight header/footer script plugin (e.g., WPCode) on maquinabel.com.br and vendas.maquinabel.com.br, pasting \<script src="https://widget.\<domain\>/v1/loader.js" data-tenant="maquinabel" async\>\</script\>.
7.  **Google Ads & Instagram Attribution Wiring:** Apply standardized UTM template to Google Ads campaigns (?utm\_source=google\&utm\_medium=cpc\&utm\_campaign={campaignid}\&utm\_term={keyword}) and configure Click-to-WhatsApp / Reels CTA keywords (LAVADORA, VARREDEIRA, ALUGUEL, PRECO).
8.  **Vinicius Goés Onboarding (15-min walkthrough):** Confirm WhatsApp handoff alert format, bookmark Next.js Kanban URL on mobile/desktop, and validate the 15-minute SLA and close-out modal workflow.

# **6. Four-Week Execution Roadmap & Agent-Ready Engineering Backlog**

## **Epic 1 — Multi-Tenant Foundation, Database Schema & CI/CD (Week 1 — P0)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E1-01\*\* | Monorepo & Shared Package Scaffolding | P0 |  S | None | Initialize pnpm + Turborepo with apps/api, apps/web, apps/widget, packages/shared. \*\*DoD:\*\* pnpm build, pnpm lint, pnpm typecheck pass cleanly in CI. |
| \*\*E1-02\*\* | Supabase Multi-Tenant Schema & RLS Migrations | P0 |  M | E1-01 | Write SQL migrations for all tables in Section 4.3 (including \\\`ad\\\_campaigns\\\` and \\\`ad\\\_optimization\\\_logs\\\`) with tenant\\\_id, partial unique indexes, and strict RLS policies. \*\*DoD:\*\* Integration test proves Tenant A JWT cannot read/write Tenant B rows. |
| \*\*E1-03\*\* | Maquinabel Tenant Seed & Auth Setup | P0 |  S | E1-02 | Create idempotent seed script inserting maquinabel tenant config (PA/MA/AP coverage, Mon–Fri 8h–18h BRT, Vinicius Goés admin user, contact details). \*\*DoD:\*\* Seed runs twice without error; login returns scoped JWT. |
| \*\*E1-04\*\* | Fastify API Core, Healthcheck & Error Handling | P0 |  S | E1-01 | Set up Fastify server with Pino structured logging, Zod validation, CORS allowlist, AES-256-GCM secret helper, and /health checking DB + Redis. \*\*DoD:\*\* /health returns 200 with DB/Redis latency. |
| \*\*E1-05\*\* | GitHub Actions CI/CD & Railway/Vercel Deploy | P0 |  M | E1-04 | Configure PR checks and auto-deploy to Railway (apps/api) and Vercel (apps/web, apps/widget). \*\*DoD:\*\* Merge to main deploys staging/prod with zero manual steps. |

## **Epic 2 — Autonomous Paid Ads Provisioning, Optimization & Analytics Engine (Weeks 1–2 — P0 CORE)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E2-01\*\* | Google Ads v26 & Meta Marketing v26.0 API Clients | P0 |  L | E1-04 | Build API wrappers for Google Ads v26 (\\\`google-ads-api\\\`) and Meta Marketing API v26.0; apply for Google Developer Token Basic Access in Week 1; configure System User Token (\\\`ads\\\_management\\\`). \*\*DoD:\*\* Integration tests authenticate and fetch test account structures cleanly. |
| \*\*E2-02\*\* | LLM Campaign Blueprint Generator | P0 |  L | E2-01 | Implement \\\`POST /api/v1/ads/campaigns/generate-blueprint\\\` using \\\`gpt-4o-mini\\\` Structured Output over tenant config & catalog to produce complete campaign, ad set, keyword, negative list, and ad copy structures with UTM templates. \*\*DoD:\*\* Returns valid JSON blueprint matching Zod schema in \\\< 10s. |
| \*\*E2-03\*\* | Batch PAUSED Campaign Mutator Worker | P0 |  L | E2-02 | Implement \\\`POST /api/v1/ads/campaigns/deploy\\\` executing batch API calls creating all campaign entities in \\\`PAUSED\\\` status; record IDs in \\\`ad\\\_campaigns\\\` table. \*\*DoD:\*\* Blueprint deploys to Google/Meta accounts in PAUSED status with 100% ID persistence. |
| \*\*E2-04\*\* | Next.js Campaign Preview & Live Metrics UI | P0 |  M | E2-03 | Build frontend tab allowing Vinicius to preview generated blueprints, toggle \\\`PAUSED\\\` \\\<-\\\> \\\`ENABLED\\\` via \\\`PATCH /api/v1/ads/campaigns/:id/status\\\`, and view spend/leads metrics. \*\*DoD:\*\* 1-click status toggle updates live Google/Meta platform campaign status in \\\< 3s. |
| \*\*E2-05\*\* | Google Ads API & Meta CAPI Offline Conversion Worker | P0 |  M | E2-01 | Build \\\`OfflineConversionSyncWorker\\\` dispatching SQL and Won deal conversion events to Google Ads API (keyed by \\\`gclid\\\`) and Meta CAPI (keyed by \\\`fbclid\\\` + SHA256 user data). \*\*DoD:\*\* Moving card to \\\`HANDOFF\\\` or \\\`WON\\\` dispatches conversion event within 60s. |
| \*\*E2-06\*\* | Google Ads Search-Term Auditor & Auto-Negative Keyword Worker | P0 |  M | E2-05 | Implement weekly cron worker pulling search query reports via Google Ads API (\\\`GoogleAdsService.SearchStream\\\`), classifying non-ICP queries via \\\`gpt-4o-mini\\\`, appending negative keywords, and sending WhatsApp summary to Vinicius Goés. \*\*DoD:\*\* Automatically prunes residential terms and logs results in \\\`ad\\\_optimization\\\_logs\\\`. |
| \*\*E2-07\*\* | Automated PA/MA/AP B2B ICP Prospecting Engine | P0 |  M | E2-06 | Build prospect miner for PA/MA/AP B2B accounts (CNAE/Google Places) and throttled outbound worker via Resend API (email) and WhatsApp utility templates feeding Module 3. \*\*DoD:\*\* Populates \\\`outbound\\\_prospects\\\` and seamlessly routes replies into AI SDR state machine. |

## **Epic 3 — Maquinabel Knowledge Base & Consultative AI Technical SDR Engine (Week 2 — P0)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E3-01\*\* | Alfa Tennant Markdown Catalog Seed | P0 |  S | E1-03 | Seed knowledge\\\_items with all 10 verified machines (Section 3.1) + sizing rules (Section 3.2) formatted for LLM Prompt Caching. \*\*DoD:\*\* Total cached catalog payload \\\< 4,000 tokens; 100% factual match to official specs. |
| \*\*E3-02\*\* | LLM Provider Abstraction & Structured Output Client | P0 |  M | E1-01 | Build AiClient interface with OpenAI gpt-4o-mini (response\\\_format: json\\\_schema + Zod parser) and Anthropic fallback; log tokens & USD cost per turn. \*\*DoD:\*\* Schema validation retries once on malformed output; cost logged to messages. |
| \*\*E3-03\*\* | Consultative SDR Prompt & State Machine Engine | P0 |  L | E3-01, E3-02 | Implement deterministic transition rules (NEW -\\\> QUALIFYING -\\\> QUALIFIED\\\_HANDOFF / DISQUALIFIED\\\_OUT\\\_OF\\\_REGION / HUMAN\\\_REQUESTED) and incremental merge of extracted\\\_fields without overwriting known data with nulls. \*\*DoD:\*\* Never loses previously extracted fields across multi-turn chats. |
| \*\*E3-04\*\* | Price & Out-of-Region Guardrail Validator | P0 |  S | E3-03 | Add deterministic regex/policy check blocking currency/price patterns (R$, reais/mês) in AI replies and enforcing PA/MA/AP state validation + business-hours messaging. \*\*DoD:\*\* Guardrail unit tests pass 100% against adversarial price-probing prompts. |
| \*\*E3-05\*\* | Golden Conversation Automated Eval Harness | P1 |  M | E3-04 | Build CLI test runner executing 12 scripted Maquinabel scenarios (see Section 7.1) against live LLM API. \*\*DoD:\*\* \\\>= 95% pass rate on model recommendation accuracy, zero price leaks, \\\< 5s median latency. |

## **Epic 4 — Omnichannel Meta Integrations & WordPress Widget Entry (Weeks 2–3 — P0)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E4-01\*\* | BullMQ + Upstash Redis Debounce Worker | P0 |  M | E1-04 | Implement 5-second sliding-window debounce per conversation\\\_id that merges consecutive inbound messages before triggering AiClient. \*\*DoD:\*\* 4 messages sent 1s apart produce exactly 1 AI inference and 1 reply. |
| \*\*E4-02\*\* | WhatsApp Cloud API Webhook & HMAC Security | P0 |  M | E4-01 | Implement GET/POST /webhooks/meta/whatsapp with X-Hub-Signature-256 verification, meta\\\_message\\\_id deduplication, audio/image fallback message (\*"No momento leio apenas texto..."\*), and \\\#MQ-XXXX web-session linking. \*\*DoD:\*\* Webhook acks in \\\< 200ms; duplicate deliveries ignored. |
| \*\*E4-03\*\* | WhatsApp Cloud Outbound & Template Sender | P0 |  M | E4-02 | Implement outbound text sender + Meta Utility Template sender (novo\\\_lead\\\_qualificado) with 24h window enforcement and exponential backoff retries. \*\*DoD:\*\* Successfully sends free-form text inside 24h window and utility template outside 24h window. |
| \*\*E4-04\*\* | Instagram Graph API Comment-to-DM Engine | P0 |  L | E4-01 | Implement GET/POST /webhooks/meta/instagram listening to comments and messages. On matching intent comment, post rotated public reply + trigger Private DM with post context tag (IG\\\_Reels\\\_\\\<id\\\>). \*\*DoD:\*\* Public reply + DM delivered in \\\< 5s on test IG Business account; own replies ignored. |
| \*\*E4-05\*\* | WordPress Typebot & Tracked wa.me Bridge Setup | P0 |  S | E1-01 | Embed Typebot flow via WPCode on maquinabel.com.br and vendas.maquinabel.com.br; capture URL context, gclid, fbclid, generate tracked \\\#MQ-XXXX deep-links. \*\*DoD:\*\* Test submissions route to API with complete click attribution. |
| \*\*E4-06\*\* | Dead-Letter Queue & Webhook Failure Alerts | P1 |  S | E4-02, E4-04 | Persist failed jobs/webhooks in webhook\\\_logs and notify developer Slack/WhatsApp/Email if \\\> 3 failures occur in 5 min. \*\*DoD:\*\* Simulated Meta 500 error retries 3x and logs cleanly without dropping message. |

## **Epic 5 — Handoff Engine, Kanban CRM & 3-Level ROI Dashboard (Week 3 — P0)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E5-01\*\* | Automated Handoff & Vinicius WhatsApp Alert | P0 |  M | E3-03, E4-03 | On QUALIFIED\\\_HANDOFF or HUMAN\\\_REQUESTED, pause AI (ai\\\_paused = true), move card to HANDOFF, log handoff\\\_events, and send 4-line summary template to Vinicius Goés's WhatsApp with direct card URL. \*\*DoD:\*\* Alert arrives in \\\< 5s of final qualifying message; AI stays silent afterward. |
| \*\*E5-02\*\* | Next.js Auth & Realtime Kanban Board | P0 |  L | E1-03, E5-01 | Build drag-and-drop Kanban (Novos, Em Qualificação, Enviado ao Vendedor, Proposta Enviada, Fechado, Perdido/Desqualificado) with Supabase Realtime updates, origin tags, and mobile-responsive view. \*\*DoD:\*\* New WhatsApp lead appears on board in \\\< 2s without page refresh. |
| \*\*E5-03\*\* | Mandatory Proposal/Win/Loss Close-Out Modal | P0 |  S | E5-02 | Intercept drops onto PROPOSAL\\\_SENT, WON, and LOST to require BRL value, rental duration (if rental), and structured loss reason. \*\*DoD:\*\* Impossible to mark deal WON with null BRL value or LOST without reason. |
| \*\*E5-04\*\* | Live Transcript Viewer & Human Takeover UI | P0 |  M | E4-03, E5-02 | Side drawer displaying full message history, extracted technical specs, recommended Alfa Tennant model, \*\*Pause/Resume AI\*\* switch, and live reply composer. \*\*DoD:\*\* Human reply sends via Meta API and computes human\\\_first\\\_response\\\_at SLA. |
| \*\*E5-05\*\* | 3-Level ROI & 60-Day Stop-Loss Dashboard | P1 |  M | E5-03 | Dashboard page showing Ad Spend input (ad\\\_spend\\\_entries), CPL, SQL count vs. 10-SQL 60-day Stop Loss gauge, Pipeline BRL, Closed Revenue BRL, Breakdown by Origin Tag, and AI/Human SLA medians. \*\*DoD:\*\* Numbers reconcile 100% with SQL queries on leads and ad\\\_spend\\\_entries. |

## **Epic 6 — Live Pilot Tuning, QA & Multi-Tenant SaaS Packaging (Week 4)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E6-01\*\* | Daily Conversation Audit & Prompt Calibration | P0 |  M | E5-04 | Review first 30–50 live Maquinabel conversations; refine sizing heuristics, tone, and edge cases (e.g., mixed sweeping+scrubbing requests, maintenance vs. parts). \*\*DoD:\*\* Qualification completion rate \\\> 65%; zero guardrail violations. |
| \*\*E6-02\*\* | Google Ads & Instagram Reels Attribution Audit | P0 |  S | E2-07, E5-05 | Verify 100% of paid Google Ads clicks and IG Reels comments resolve to non-null origin\\\_tag and lead\\\_attributions rows. \*\*DoD:\*\* Zero "Unknown" attribution on active ad campaigns. |
| \*\*E6-03\*\* | Multi-Tenant Admin Config Extraction | P1 |  M | E6-01 | Eliminate any hardcoded Maquinabel strings from codebase; move all prompts, allowed states, hours, and WhatsApp routing into tenants table + basic Tenant Settings UI. \*\*DoD:\*\* Spinning up a 2nd test tenant requires zero code changes. |
| \*\*E6-04\*\* | Pilot ROI Report & Case Study Export | P2 |  S | E5-05 | Add one-click CSV/PDF export of 60-day pilot KPIs (Response Time Before/After, CPL, SQLs, Pipeline, Closed Revenue) for Client Zero review and SaaS sales case study. \*\*DoD:\*\* Clean summary report generated directly from live production metrics. |

## **Epic 1 — Multi-Tenant Foundation, Database Schema & CI/CD (Week 1)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E1-01\*\* | Monorepo & Shared Package Scaffolding | P0 |  S | None | Initialize pnpm + Turborepo with apps/api, apps/web, apps/widget, packages/shared. \*\*DoD:\*\* pnpm build, pnpm lint, pnpm typecheck pass cleanly in CI. |
| \*\*E1-02\*\* | Supabase Multi-Tenant Schema & RLS Migrations | P0 |  M | E1-01 | Write SQL migrations for all 10 tables in Section 4.3 with tenant\\\_id, partial unique indexes, and strict RLS policies. \*\*DoD:\*\* Integration test proves Tenant A JWT cannot read/write Tenant B rows. |
| \*\*E1-03\*\* | Maquinabel Tenant Seed & Auth Setup | P0 |  S | E1-02 | Create idempotent seed script inserting maquinabel tenant config (PA/MA/AP coverage, Mon–Fri 8h–18h BRT, Vinicius Goés admin user, contact details). \*\*DoD:\*\* Seed runs twice without error; login returns scoped JWT. |
| \*\*E1-04\*\* | Fastify API Core, Healthcheck & Error Handling | P0 |  S | E1-01 | Set up Fastify server with Pino structured logging, Zod validation, CORS allowlist, AES-256-GCM secret helper, and /health checking DB + Redis. \*\*DoD:\*\* /health returns 200 with DB/Redis latency. |
| \*\*E1-05\*\* | GitHub Actions CI/CD & Railway/Vercel Deploy | P0 |  M | E1-04 | Configure PR checks and auto-deploy to Railway (apps/api) and Vercel (apps/web, apps/widget). \*\*DoD:\*\* Merge to main deploys staging/prod with zero manual steps. |

## **Epic 2 — Maquinabel Knowledge Base & AI Technical Sizing Engine (Week 1)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E2-01\*\* | Alfa Tennant Markdown Catalog Seed | P0 |  S | E1-03 | Seed knowledge\\\_items with all 10 verified machines (Section 3.1) + sizing rules (Section 3.2) formatted for LLM Prompt Caching. \*\*DoD:\*\* Total cached catalog payload \\\< 4,000 tokens; 100% factual match to official specs. |
| \*\*E2-02\*\* | LLM Provider Abstraction & Structured Output Client | P0 |  M | E1-01 | Build AiClient interface with OpenAI gpt-4o-mini (response\\\_format: json\\\_schema + Zod parser) and Anthropic fallback; log tokens & USD cost per turn. \*\*DoD:\*\* Schema validation retries once on malformed output; cost logged to messages. |
| \*\*E2-03\*\* | Consultative SDR Prompt & State Machine Engine | P0 |  L | E2-01, E2-02 | Implement deterministic transition rules (NEW -\\\> QUALIFYING -\\\> QUALIFIED\\\_HANDOFF / DISQUALIFIED\\\_OUT\\\_OF\\\_REGION / HUMAN\\\_REQUESTED) and incremental merge of extracted\\\_fields without overwriting known data with nulls. \*\*DoD:\*\* Never loses previously extracted fields across multi-turn chats. |
| \*\*E2-04\*\* | Price & Out-of-Region Guardrail Validator | P0 |  S | E2-03 | Add deterministic regex/policy check blocking currency/price patterns (R$, reais/mês) in AI replies and enforcing PA/MA/AP state validation + business-hours messaging. \*\*DoD:\*\* Guardrail unit tests pass 100% against adversarial price-probing prompts. |
| \*\*E2-05\*\* | Golden Conversation Automated Eval Harness | P1 |  M | E2-04 | Build CLI test runner executing 10 scripted Maquinabel scenarios (see Section 7.1) against live LLM API. \*\*DoD:\*\* \\\>= 95% pass rate on model recommendation accuracy, zero price leaks, \\\< 5s median latency. |

## **Epic 3 — Meta Official Integrations (WhatsApp Cloud + IG Graph) & Debounce Queue (Week 2)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E3-01\*\* | BullMQ + Upstash Redis Debounce Worker | P0 |  M | E1-04 | Implement 5-second sliding-window debounce per conversation\\\_id that merges consecutive inbound messages before triggering AiClient. \*\*DoD:\*\* 4 messages sent 1s apart produce exactly 1 AI inference and 1 reply. |
| \*\*E3-02\*\* | WhatsApp Cloud API Webhook & HMAC Security | P0 |  M | E3-01 | Implement GET/POST /webhooks/meta/whatsapp with X-Hub-Signature-256 verification, meta\\\_message\\\_id deduplication, audio/image fallback message (\*"No momento leio apenas texto..."\*), and \\\#MQ-XXXX web-session linking. \*\*DoD:\*\* Webhook acks in \\\< 200ms; duplicate deliveries ignored. |
| \*\*E3-03\*\* | WhatsApp Cloud Outbound & Template Sender | P0 |  M | E3-02 | Implement outbound text sender + Meta Utility Template sender (novo\\\_lead\\\_qualificado) with 24h window enforcement and exponential backoff retries. \*\*DoD:\*\* Successfully sends free-form text inside 24h window and utility template outside 24h window. |
| \*\*E3-04\*\* | Instagram Graph API Comment-to-DM Engine | P0 |  L | E3-01 | Implement GET/POST /webhooks/meta/instagram listening to comments and messages. On matching intent comment, post rotated public reply + trigger Private DM with post context tag (IG\\\_Reels\\\_\\\<id\\\>). \*\*DoD:\*\* Public reply + DM delivered in \\\< 5s on test IG Business account; own replies ignored. |
| \*\*E3-05\*\* | Dead-Letter Queue & Webhook Failure Alerts | P1 |  S | E3-02, E3-04 | Persist failed jobs/webhooks in webhook\\\_logs and notify developer Slack/WhatsApp/Email if \\\> 3 failures occur in 5 min. \*\*DoD:\*\* Simulated Meta 500 error retries 3x and logs cleanly without dropping message. |

## **Epic 4 — Automated Ads Optimization & B2B ICP Outbound Engine (Week 2)**

  

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E4-01\*\* | WordPress Typebot & Tracked wa.me Bridge Setup | P0 |  S | E1-01 | Embed Typebot flow via WPCode on maquinabel.com.br and vendas.maquinabel.com.br; capture URL context, gclid, fbclid, generate tracked \\\#MQ-XXXX deep-links. \*\*DoD:\*\* Test submissions route to API with complete click attribution. |
| \*\*E4-02\*\* | Google Ads API & Meta CAPI Offline Conversion Worker | P0 |  M | E4-01 | Build OfflineConversionSyncWorker dispatching SQL and Won deal conversion events to Google Ads API (keyed by gclid) and Meta CAPI (keyed by fbclid + SHA256 user data). \*\*DoD:\*\* Moving card to HANDOFF or WON dispatches conversion event within 60s. |
| \*\*E4-03\*\* | Google Ads Search-Term Auditor & Auto-Negative Keyword Worker | P0 |  M | E4-02 | Implement weekly cron worker pulling search query reports via Google Ads API, classifying non-ICP queries via gpt-4o-mini, appending negative keywords, and sending WhatsApp summary to Vinicius Goés. \*\*DoD:\*\* Automatically prunes residential terms and logs results in ad\\\_optimization\\\_logs. |
| \*\*E4-04\*\* | Automated PA/MA/AP B2B ICP Prospecting Engine | P0 |  M | E4-03 | Build prospect miner for PA/MA/AP B2B accounts (CNAE/Google Places) and throttled outbound worker via Resend API (email) and WhatsApp utility templates feeding Module 3. \*\*DoD:\*\* Populates outbound\\\_prospects and seamlessly routes replies into AI SDR state machine. |

## **Epic 5 — Handoff Engine, Kanban CRM & 3-Level ROI Dashboard (Weeks 2–3)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E5-01\*\* | Automated Handoff & Vinicius WhatsApp Alert | P0 |  M | E2-03, E3-03 | On QUALIFIED\\\_HANDOFF or HUMAN\\\_REQUESTED, pause AI (ai\\\_paused = true), move card to HANDOFF, log handoff\\\_events, and send 4-line summary template to Vinicius Goés's WhatsApp with direct card URL. \*\*DoD:\*\* Alert arrives in \\\< 5s of final qualifying message; AI stays silent afterward. |
| \*\*E5-02\*\* | Next.js Auth & Realtime Kanban Board | P0 |  L | E1-03, E5-01 | Build drag-and-drop Kanban (Novos, Em Qualificação, Enviado ao Vendedor, Proposta Enviada, Fechado, Perdido/Desqualificado) with Supabase Realtime updates, origin tags, and mobile-responsive view. \*\*DoD:\*\* New WhatsApp lead appears on board in \\\< 2s without page refresh. |
| \*\*E5-03\*\* | Mandatory Proposal/Win/Loss Close-Out Modal | P0 |  S | E5-02 | Intercept drops onto PROPOSAL\\\_SENT, WON, and LOST to require BRL value, rental duration (if rental), and structured loss reason. \*\*DoD:\*\* Impossible to mark deal WON with null BRL value or LOST without reason. |
| \*\*E5-04\*\* | Live Transcript Viewer & Human Takeover UI | P0 |  M | E3-03, E5-02 | Side drawer displaying full message history, extracted technical specs, recommended Alfa Tennant model, \*\*Pause/Resume AI\*\* switch, and live reply composer. \*\*DoD:\*\* Human reply sends via Meta API and computes human\\\_first\\\_response\\\_at SLA. |
| \*\*E5-05\*\* | 3-Level ROI & 60-Day Stop-Loss Dashboard | P1 |  M | E5-03 | Dashboard page showing Ad Spend input (ad\\\_spend\\\_entries), CPL, SQL count vs. 10-SQL 60-day Stop Loss gauge, Pipeline BRL, Closed Revenue BRL, Breakdown by Origin Tag, and AI/Human SLA medians. \*\*DoD:\*\* Numbers reconcile 100% with SQL queries on leads and ad\\\_spend\\\_entries. |

## **Epic 6 — Live Pilot Tuning, QA & Multi-Tenant SaaS Packaging (Weeks 3–4)**

|  |  |  |  |  |  |
| :-: | :-: | :-: | :-: | :-: | :-: |
| \*\*ID\*\* | \*\*Story / Task\*\* | \*\*Prio\*\* | \*\*Effort\*\* | \*\*Deps\*\* | \*\*Technical Specs & Acceptance Criteria (DoD)\*\* |
| \*\*E6-01\*\* | Daily Conversation Audit & Prompt Calibration | P0 |  M | E5-04 | Review first 30–50 live Maquinabel conversations; refine sizing heuristics, tone, and edge cases (e.g., mixed sweeping+scrubbing requests, maintenance vs. parts). \*\*DoD:\*\* Qualification completion rate \\\> 65%; zero guardrail violations. |
| \*\*E6-02\*\* | Google Ads & Instagram Reels Attribution Audit | P0 |  S | E4-04, E5-05 | Verify 100% of paid Google Ads clicks and IG Reels comments resolve to non-null origin\\\_tag and lead\\\_attributions rows. \*\*DoD:\*\* Zero "Unknown" attribution on active ad campaigns. |
| \*\*E6-03\*\* | Multi-Tenant Admin Config Extraction | P1 |  M | E6-01 | Eliminate any hardcoded Maquinabel strings from codebase; move all prompts, allowed states, hours, and WhatsApp routing into tenants table + basic Tenant Settings UI. \*\*DoD:\*\* Spinning up a 2nd test tenant requires zero code changes. |
| \*\*E6-04\*\* | Pilot ROI Report & Case Study Export | P2 |  S | E5-05 | Add one-click CSV/PDF export of 60-day pilot KPIs (Response Time Before/After, CPL, SQLs, Pipeline, Closed Revenue) for Client Zero review and SaaS sales case study. \*\*DoD:\*\* Clean summary report generated directly from live production metrics. |

# **7. QA Test Suite, Go-Live Readiness & Post-MVP SaaS Scaling Path**

## **7.1 Automated Golden-Conversation QA Scenarios (Pre-Deploy Gate)**

Downstream agents MUST implement and pass these 10 automated test scenarios before production go-live:

  

1.  **Large Logistics Warehouse (Belém-PA):** 4,500 m² epoxy floor, heavy dust + daily wash, rental inquiry -\> Recommends **Brava** (wash) and/or **S16** (sweep), triggers QUALIFIED\_HANDOFF, zero prices quoted.
2.  **Autonomous Robotics Inquiry (São Luís-MA):** 8,000 m² wholesale supermarket, labor shortage, purchase -\> Recommends **T16AMR** (BrainOS®, 5,890 m²/h), triggers QUALIFIED\_HANDOFF.
3.  **Small Congested Clinic/Kitchen (Ananindeua-PA):** 350 m² porcelain floor, daily cleaning -\> Recommends **i-mop Lite** or **Alfa Mini**, triggers QUALIFIED\_HANDOFF.
4.  **Out-of-Region Filter (São Paulo-SP):** 3,000 m² warehouse in SP -\> Politely explains PA/MA/AP coverage, sets DISQUALIFIED\_OUT\_OF\_REGION, does NOT alert Vinicius's WhatsApp.
5.  **Adversarial Price Probe:** User repeatedly demands *"Me fala pelo menos o valor aproximado do aluguel da Brava"* -\> Refuses binding/approximate pricing, explains custom sizing quote by commercial team, stays compliant.
6.  **Maintenance / Parts Request:** Existing Alfa A260 owner in Macapá-AP needing squeegee rubber & preventive service -\> Classifies MANUTENCAO\_PECAS, validates AP coverage, triggers QUALIFIED\_HANDOFF.
7.  **Rapid Multi-Bubble Burst:** 5 separate messages sent over 3.5 seconds -\> BullMQ debounce merges into 1 LLM call and 1 coherent reply.
8.  **Immediate Human Request:** User says *"Quero falar direto com o Vinicius"* on turn 1 -\> Immediately sets HUMAN\_REQUESTED, pauses AI, notifies Vinicius.
9.  **After-Hours Inquiry (Saturday 14:00 BRT):** AI completes full triage 24/7, creates Kanban card, and explicitly informs lead that Vinicius will send the formal quote Monday starting at 08:00.
10. **Instagram Comment-to-DM-to-WhatsApp:** Comment *"Quanto custa alugar?"* on S16 Reel -\> Rotated public reply + DM mentioning S16 -\> Lead shares WhatsApp -\> Merged into single Kanban card with IG\_Reels\_S16 origin tag.
11. **Offline Conversion Dispatch Gate:** Lead created with gclid and fbclid reaches QUALIFIED\_HANDOFF -\> OfflineConversionSyncWorker executes and logs 200 OK conversion payload with Google Ads & Meta CAPI APIs.
12. **Google Ads Search-Term Negative Keyword Pruner:** Query report containing "lavadora de alta pressão residencial karcher" and "varredeira industrial tennant" -\> Worker adds "residencial karcher" as negative keyword and keeps "varredeira industrial tennant".
13. **AI Campaign Provisioner Blueprint & PAUSED Batch Deployment:** Trigger \`POST /api/v1/ads/campaigns/generate-blueprint\` for tenant \`maquinabel\` -\> validates generated Google Search & Meta ad blueprint JSON against Zod schema -\> executes \`POST /api/v1/ads/campaigns/deploy\` -\> verifies all created campaign entities on Google Ads & Meta APIs are in \`PAUSED\` status with external IDs stored in \`ad\_campaigns\` table.
14. **Live Ad Metrics Sync & 3-Level ROI Reconciliation:** Execute metric sync job -\> verifies impressions, clicks, spend BRL populate \`ad\_campaigns\` -\> reconciles CPL, SQLs, and Won BRL revenue in Next.js analytics dashboard with zero discrepancy.

## **7.2 Production Go-Live Checklist**

  - Meta Business Manager verified; WhatsApp Cloud API live; novo\_lead\_qualificado utility template approved.
  - Instagram Professional Account webhooks subscribed and tested on live post comment + DM.
  - WordPress \<script\> widget deployed on maquinabel.com.br and vendas.maquinabel.com.br with verified UTM propagation.
  - Google Ads bottom-of-funnel PA/MA campaigns live (Mon–Fri 8h–18h schedule) with UTM template attached.
  - All 10 Golden QA scenarios passing in CI; Sentry error tracking and DLQ failure alerts verified.
  - Vinicius Goés onboarded to Kanban dashboard, tested 1-click campaign activation (PAUSED -\> ENABLED), validated live WhatsApp handoff alert, and confirmed 15-minute SLA workflow.
  - Google Ads Developer Token Basic Access approved; PAUSED campaign structures verified on live ad account.

## **7.3 Post-MVP Multi-Tenant SaaS Generalization Path (v1 -\> v2)**

Per the multi-tenant roadmap in [03 - Planejamento Técnico](https://docs.google.com/document/d/16sNVOS3jkyHxbmyrdl0lJBFoikMIBDupkR8gIRIaowM/edit?usp=drivesdk&ouid=110218015828462459513), once Maquinabel's 60-day pilot validates ROI:

  

|  |  |  |
| :-: | :-: | :-: |
| \*\*Capability\*\* | \*\*v1 MVP (Maquinabel Client Zero)\*\* | \*\*v2 Commercial Multi-Tenant SaaS\*\* |
| \*\*Channel Onboarding\*\* | Typebot / tracked link embed code & Meta System User Token setup | Custom Preact Shadow DOM embeddable widget bundle & Meta Embedded Signup (OAuth) |
| \*\*Qualification Rules\*\* | Structured 4-field schema + automated Ads optimization & prospecting worker | Visual \*\*Qualification Checklist Builder\*\* & Self-Service \*\*B2B Prospect Finder UI\*\* |
| \*\*Knowledge Base\*\* | Seeded Markdown catalog (knowledge\\\_items) with Prompt Caching | Self-service \*\*KB Manager\*\* (PDF/CSV/URL upload) with automated pgvector chunking & retrieval |
| \*\*Lead Routing (Handoff)\*\* | 100% direct to Vinicius Goés's WhatsApp | Configurable routing engine (Regional Belém vs. São Luís, Product Line, Deal Size, Round-Robin) |
| \*\*Billing & Plans\*\* | Pilot agreement (R$ 0 license, direct infra pass-through) | Stripe/Asaas recurring SaaS billing with usage metering and tenant seats |

  