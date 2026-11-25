# Maquinabel SaaS — Demo UI: Shared Conventions (READ FIRST)

Source spec: `docs/SPEC.md` (read the sections your task names; skip infra/CI sections).
Concept art (vague reference only, NOT a hard guideline): `docs/1.png` (blueprint preview), `docs/2.png` (campaign list + inspector drawer).

## Goal
Clickable, polished **front-end-only demo** of the Maquinabel multi-tenant "Autonomous Paid Ads + AI SDR + Kanban CRM" SaaS.
No backend, no DB, no real API calls. Everything mocked in-memory with simulated latency. Focus = UI quality & usability.

## Hard rules
- **All UI text in Portuguese (pt-BR)**. Code identifiers in English. Currency `R$ 1.234,56` (use shared `formatBRL`), dates `dd/MM/yyyy`, pt-BR number formatting.
- Product/API names stay as-is: Google Ads API v26, Meta Marketing API v26.0, Meta CAPI, WhatsApp Cloud API, gpt-4o-mini, UTM/gclid/fbclid, PAUSED/ENABLED badges may show pt-BR labels ("Pausada"/"Ativa").
- Client Zero tenant: **Maquinabel** (concessionária Alfa Tennant), CEO/único vendedor **Vinicius Goés**, cobertura **PA, MA, AP**, horário seg–sex 08:00–18:00 (America/Belem), orçamento mídia R$ 1.000/mês, piloto 60 dias com stop-loss de 10 SQLs.
- **Demo "now" = 2026-11-20 (sexta) 10:30 BRT.** Pilot started 2026-10-12 (≈ dia 39 de 60). Keep all mock dates consistent with this.
- Mock async calls: every "API" call goes through `src/mock/api.ts` helpers (simulated delay 300–1500ms, optional fake progress). Show loading states, toasts on success/error.
- No new npm dependencies after the foundation task. Use what's installed.
- Responsive: must work at 1280px+ desktop and be usable at mobile width (sidebar collapses to drawer).

## Stack (installed by foundation task)
Vite + React 18 + TypeScript (strict) + Tailwind CSS v4 (`@tailwindcss/vite`) + react-router-dom + zustand + @dnd-kit/core & @dnd-kit/sortable + recharts + lucide-react + clsx + date-fns (with `ptBR` locale).
Run: `npm run dev` (port 5173). Typecheck: `npx tsc -b --noEmit` or `npm run build`.

## File layout & ownership
```
src/
  main.tsx, App.tsx, router.tsx        # foundation only
  index.css                            # foundation only (theme tokens)
  components/layout/*                  # foundation only (Sidebar, Topbar, AppShell)
  components/ui/*                      # foundation only (shared primitives)
  lib/format.ts, lib/utils.ts          # foundation only
  types/domain.ts                      # foundation only (all domain types)
  mock/data/*.ts                       # foundation only (seed data)
  mock/api.ts                          # foundation only (delay/progress helpers + mock endpoints)
  store/*.ts                           # foundation only (zustand stores + actions)
  pages/<feature>/**                   # OWNED by the feature task — page tasks edit ONLY their own folder
```
**Feature tasks must NOT edit files outside their own `src/pages/<feature>/` folder.** If you need extra mock data or helper logic, create it inside your folder (e.g. `src/pages/ads/mockBlueprint.ts`). If a shared primitive is missing, build a local one in your folder. If you truly need a shared-store action that's missing, implement it locally (e.g. wrap `useStore.setState`) inside your folder. Other agents may be editing other folders in parallel — ignore typecheck errors that originate outside your folder.

## Routes (sidebar order, pt-BR labels) → owning folder
| Route | Label | Folder |
|---|---|---|
| `/` | Painel ROI | `src/pages/dashboard` |
| `/ads` | Campanhas (Ads Manager) | `src/pages/ads` |
| `/ads/blueprint` | Gerador de Campanhas IA | `src/pages/blueprint` |
| `/crm` | Kanban CRM | `src/pages/crm` |
| `/sdr` | Simulador SDR IA | `src/pages/sdr` |
| `/automacao` | Automação & CAPI | `src/pages/automation` |
| `/catalogo` | Catálogo Alfa Tennant | `src/pages/catalog` |
| `/configuracoes` | Configurações | `src/pages/settings` |

Each folder exposes `index.tsx` with a default-exported page component (router imports it).

## Foundation API reference
Import alias `@/` = `src/`. Build passes (`npm run build`). TS 7 strict, Vite 8, Tailwind v4, React 18, react-router-dom 6, zustand 5, recharts 3, lucide-react **v1**.

**lucide v1 gotchas:** renamed icons — use `TriangleExclamationPoint` (not AlertTriangle), `CircleExclamationPoint`, `CircleCheck`/`CircleCheckBig`, `LoaderCircle` (not Loader2), `SquareKanban`, `Building` (not Building2), `Trash` (not Trash2), `CircleX`. **No brand icons** (Instagram/Facebook) → use `<ChannelIcon>`. Verify a name: `grep "declare const Name:" node_modules/lucide-react/dist/lucide-react.d.ts`.
**zustand v5:** never return a new array/object from a selector (`useStore(s => s.leads.filter(...))` → infinite loop). Select raw arrays then `useMemo`, or use the hooks below.

### Theme tokens (`src/index.css`, Tailwind utilities)
`primary-50…900` (blue), `ink-50…900` (neutrals/text), `canvas` (page bg), `surface`, `line`/`line-strong` (borders), `sidebar*` (navy), `success|warning|danger|info-{50,100,500,600,700}`, `violet-*` (Tailwind default), brands `google-{blue,red,yellow,green}`, `meta`, `meta-light`, `whatsapp`, `whatsapp-dark`, `whatsapp-light`, `instagram`, `instagram-light`, `.ig-gradient`; charts `chart-1…6` (hex also in `TONE_HEX`). `shadow-card`, `shadow-pop`, `animate-fade-in|scale-in|slide-in-right|toast-in`. Classes: `.data-table` (+`.is-hover`, `.is-compact`), `.num` (tabular nums), `.scrollbar-thin`.

### UI primitives — `import { … } from '@/components/ui'`
- `Button` variant `primary|secondary|outline|ghost|danger|success|link`, size `xs|sm|md|lg|icon|icon-sm`, `loading`, `leftIcon`, `rightIcon`, `fullWidth`
- `Card` (`padding none|sm|md|lg`, `interactive`), `CardHeader` (`title, description, icon, actions`), `CardBody`, `CardFooter`
- `Badge` (`tone: Tone`, `size sm|md`, `dot`, `icon`, `solid`); `StatusPill` `kind: 'campaign'|'stage'|'conversation'|'conversion'` + `value` (pt-BR label & tone auto)
- `Input` (`label, hint, error, leftIcon, prefix, suffix, size`), `Textarea`, `Select` (`options: {value,label}[]`, `placeholder`, native onChange), `Field` (label wrapper)
- `Switch` (`checked, onChange(bool), label, description, size, tone`)
- `Tabs` (`items: {value,label,icon?,count?}[]`, `value`, `onChange`, `variant underline|pills`, `size`) — header only, render panel yourself
- `Modal` / `Dialog` (`open, onClose, title, description, icon, iconTone, footer, size sm|md|lg|xl, persistent`)
- `Drawer` right panel (`open, onClose, title, description, headerActions, footer, width sm|md|lg|xl, flush`)
- `Tooltip` (`content, side`), `Dropdown` (`trigger(open)=>node`, children or `(close)=>node`, `align`, `width`) + `DropdownItem` (`icon, description, onClick, disabled, active, right, danger`), `DropdownSeparator`
- Toasts: `toast.success|error|info|warning(title, description?)` (plain function, works anywhere; `<Toaster/>` already mounted in AppShell). `useToast()` also available.
- `EmptyState` (`icon, title, description, action, compact`), `Skeleton` (`className`, `lines`, `circle`), `ProgressBar` (`value, max, tone, size xs|sm|md|lg, label, valueLabel, marker, markerLabel, striped`)
- `KpiCard` (`label, value, delta (ratio), deltaLabel, invertDelta, icon, iconTone, hint, caption, footer, loading`)
- `ChannelIcon` (`channel: 'google'|'meta'|'whatsapp'|'instagram'|'site'|'outbound'`, `size xs|sm|md|lg`, `variant chip|plain`, `withLabel`, `label`)
- `Avatar` (`name, size xs|sm|md|lg, src, status`), `Table` (`hover, compact, wrapperClassName`; wraps `.data-table` w/ horizontal scroll), `Num` (right-aligned numeric cell), `PageHeader` (`title, description, actions, eyebrow`) — use at top of every page.
- Layout (`@/components/layout`): `AppShell`, `Sidebar`, `Topbar`, `NAV_ITEMS`, `matchNav(path)`. Breadcrumb/title are automatic from the route.

### Stores — `import { … } from '@/store'`
- `useLeadStore`: `leads, conversations, messages, attributions, handoffEvents`
  - `moveLeadStage(id, stage, payload?: { proposalValue, closedValue, modality, rentalMonths, rentalMonthly, lossReason, lossNotes, trigger: 'QUALIFIED'|'HUMAN_REQUESTED', silent })` → sets stage fields (proposalAt/closedAt/sqlAt…), appends SYSTEM msg, HANDOFF: pauses AI + HandoffEvent + 4-line summary + notification; first SQL → `OfflineConversionEvent` SQL (PENDING→SENT ~2 s); WON → WON event + notification; re-syncs campaign lead metrics. WON rental: closedValue defaults to monthly × months.
  - `handoffLead(id, trigger?)`, `updateLeadFields(id, patch)`, `createLead(input: { name, originTag, channel?, attributionChannel?, attribution?, …LeadFields }) → Lead`, `deleteLead(id)`
  - `addMessage(convId, { senderType, text, …Message }) → Message` (HUMAN_AGENT → records humanFirstResponseAt/humanSlaMinutes, state HUMAN_ACTIVE, aiPaused; AI on NEW lead w/ ≥2 lead msgs → card to QUALIFYING)
  - `toggleAiPaused(convId, paused?)` (+SYSTEM msg), `setConversationState(convId, state)`, `markConversationRead(convId)`
- `useCampaignStore`: `campaigns, blueprints`; `toggleCampaignStatus(id)`, `setCampaignStatus(id, status)`, `updateCampaign(id, patch)` (budget, negatives, schedule, meta…), `updateAdGroup(cid, agId, patch)` (headlines/descriptions/keywords), `addKeyword(cid, agId, {text, matchType})`, `removeKeyword(cid, agId, kwId)`, `addCampaigns(list)`, `removeCampaign(id)` (status REMOVED), `addCampaignNegatives(cid, terms)`, `addBlueprint(bp)`, `updateBlueprint(id, patch)`, `syncLeadMetrics(leads, trackedIds?)`
- `useAutomationStore`: `optimizationRuns, optimizationLogs, negativeKeywords, conversionEvents, prospects, igEvents, adSpendEntries`; `addOptimizationRun(run, logs)`, `addNegatives(items: (string|Partial<NegativeKeyword>)[], defaults?) → added[]` (dedupes), `removeNegative(id)`, `updateOptimizationLog(id, patch)`, `addConversionEvent/updateConversionEvent`, `addProspects/updateProspect`, `addIgEvent/updateIgEvent`, `addAdSpendEntry(e) → entry`, `updateAdSpendEntry`, `removeAdSpendEntry`
- `useCatalogStore`: `machines, sizingRules`; `updateMachine(id, patch)`, `toggleMachineActive(id)`, `updateSizingRule(id, patch)`; `useMachine(id)`
- `useTenantStore`: `tenant, otherTenants, users, currentUserId`; `updateTenant(patch)`, `updateAiSettings(patch)`, `updateBusinessHours(patch)`, `updateIntegration(key, patch)`, `updateUser(id, patch)`; `useCurrentUser()`
- `useNotificationStore`: `notifications`; `pushNotification({type,title,body,href})`, `markRead(id)`, `markAllRead()`, `removeNotification(id)`; `selectUnreadCount`
- `useUiStore`: `sidebarCollapsed, mobileNavOpen, mockFailureRate (0..1, default 0), latencyMultiplier`; `toggleSidebar, setSidebarCollapsed, setMobileNavOpen, setMockFailureRate, setLatencyMultiplier`

### Selectors / hooks (`@/store`, from `store/selectors.ts`)
- `useKpis(): Kpis` → `totalSpend, googleSpend, metaSpend, monthlyBudget, totalLeads, paidLeads, cpl, sqlCount, costPerSql, leadToSqlRate, pipelineBRL (PROPOSAL_SENT), closedBRL, wonCount, lostCount, disqualifiedCount, roas, medianAiResponseMs, medianHumanSlaMin, humanSlaWithinTargetRate, trackingCoverage, stopLoss, funnel[{stage,count}], byOrigin[{originTag,label,channel,paid,leads,sqls,won,wonBRL,pipelineBRL,spend,cpl,sqlRate}], byChannel[{channel,leads,sqls,wonBRL,spend,cpl}], daily[{date,spend,leads,sqls,impressions,clicks}], aiCostUsd`. Pure version: `computeKpis({...})`.
- `useStopLoss()` → `{target, current, pct, dayOfPilot, totalDays, daysLeft, expectedByNow, onTrack, projected}`; `computeStopLoss(sqls, tenant)`
- `useLead(id)`, `useConversation(id)`, `useConversationByLead(leadId)`, `useAttributionByLead(leadId)`, `useMessages(convId)` (sorted asc), `useLeadsByStage()` (Record<KanbanStage, Lead[]>), `useInbox()` ([{conversation, lead, lastMessage}] newest first), `useCampaignTotals()` (count, enabled, paused, enabledDailyBudget, impressions, clicks, ctr, spend, leads, sqls, wonBRL, cpl, costPerSql)
- Business rule: **SQL = lead with `sqlAt` set** (reached HANDOFF via qualification; human-requested handoff is not SQL until moved to PROPOSAL/WON).

### Mock API — `import * as api from '@/mock/api'`
Helpers: `delay(min=300,max=1500)`, `maybeFail(op)` (uses `mockFailureRate`), `withProgress(steps: (string|{label,ms})[], onStep?(i, step|null, pct))`, `ApiError`, step lists `BLUEPRINT_STEPS`, `DEPLOY_STEPS`.
Endpoints (all async, mutate stores after delay; optional `onStep` for progress UIs):
`generateBlueprint(config, onStep?) → CampaignBlueprint` · `buildBlueprint(config)` (sync, no delay) · `defaultBlueprintConfig()` · `deployCampaigns(blueprint, onStep?) → AdCampaign[]` (PAUSED, only `included`) · `patchCampaignStatus(id, status)` · `updateCampaign(id, patch)` · `syncCampaignMetrics()` · `dispatchOfflineConversion(leadId, 'SQL'|'WON')` · `retryConversion(eventId)` · `syncConversions(onStep?) → count` · `runSearchTermOptimizer(onStep?) → {run, logs}` · `addNegativeKeywords(terms, campaignId?)` · `triggerProspecting({states?, segments?, source?, limit?}, onStep?) → OutboundProspect[]` · `sendOutboundTouch(prospectId, 'EMAIL'|'WHATSAPP')` · `convertProspectToLead(prospectId) → Lead` · `sendHumanReply(convId, text) → Message` (status SENT→DELIVERED→READ) · `toggleAi(convId, paused)` · `patchLeadStage(leadId, stage, payload?)` · `patchLead(leadId, patch)` · `simulateIgComment({mediaTag, mediaCaption?, username, text}) → IgCommentEvent` · `updateTenantSettings(patch)` · `testIntegration(key)` · `exportPilotReportCsv() → string (; separated)`.
Not provided (build locally in your folder): SDR AI reply engine — use `recommendMachines()` + `useLeadStore.addMessage`.

### Lib
- `@/lib/format`: `formatBRL(v, {compact?, decimals?: 0|2})`, `formatNumber(v, {maxDecimals, minDecimals, compact})`, `formatPercent(ratio, decimals=1)`, `formatDelta`, `formatMs`, `formatMinutes`, `formatArea`, `formatPhone`, `formatDate` (dd/MM/yyyy), `formatDateTime`, `formatTime`, `formatDayMonth` ("20 nov"), `formatMonthYear`, `formatWeekdayShort`, `formatRelative` (vs demo clock, pt-BR), `formatChatStamp`. Maps: `STAGE_ORDER, STAGE_LABEL, STAGE_TONE, MODALITY_LABEL/TONE, SEGMENT_LABEL, FLOOR_LABEL, DIRT_LABEL, POWER_LABEL, LOSS_REASON_LABEL, CAMPAIGN_STATUS_LABEL/TONE, CAMPAIGN_TYPE_LABEL, PLATFORM_LABEL, CONV_STATE_LABEL/TONE, CONV_CHANNEL_LABEL, ATTRIBUTION_CHANNEL_LABEL, CONVERSION_STATUS_LABEL/TONE, PROSPECT_STATUS_LABEL/TONE, SEARCH_TERM_CLASS_LABEL/TONE, INTEGRATION_STATUS_LABEL/TONE, MACHINE_CATEGORY_LABEL, UF_NAME, ORIGIN_LABEL, CHANNEL_KIND_LABEL, TONE_SOFT/TONE_DOT/TONE_HEX`; `originLabel(tag)`, `originChannel(tag) → ChannelKind`, `isPaidOrigin(tag)`.
- `@/lib/utils`: `cn`, `DEMO_NOW`, `now()` (demo clock = 2026-11-20 10:30 BRT + elapsed), `nowISO()`, `belem(date, time)`, `belemDay`, `belemWeekday`, `toBelemISO`, `addMinutes`, `addSeconds`, `diffMinutes`, `isBusinessHours(d?)`, `uid(prefix)`, `seededRandom(seed)`, `hashString`, `fakeSha256`, `median`, `sum`, `groupBy`, `clamp`, `initials`, `sessionCode()`. **Always use `now()`/`nowISO()` instead of `new Date()`.**
- `@/lib/sizing`: `recommendMachines({areaM2, segment, floorType, dirtProfile, powerPreference, laborShortage, needsSweeping, sweepOnly}, catalog?) → RecommendedModel[]` (SPEC §3.2).
- Types: `@/types/domain` (Tenant, User, Lead, LeadAttribution, Conversation, Message, HandoffEvent, Machine, SizingRule, AdCampaign, AdGroup, Keyword, MetaCreative, DailyMetric, CampaignBlueprint, BlueprintCampaign, BlueprintConfig, BlueprintTheme, OptimizationRun, OptimizationLog, NegativeKeyword, OfflineConversionEvent, OutboundProspect, IgCommentEvent, AdSpendEntry, Notification, Tone, ChannelKind, enums…).

### Seed data (`src/mock/data/*`, demo now = sex 20/11/2026 10:30, piloto desde 12/10 → dia 39/60)
- Tenant Maquinabel + 2 "em breve" tenants; users: Vinicius Goés (`usr_vinicius`), Equipe Plataforma. 9 integrations (Google Places = PENDING).
- Catalog: 10 machines (`m_alfa_mini, m_imop_lite, m_a260, m_t600e, m_brava, m_t16amr, m_alfa_bizz, m_s16, m_alfa_pressure_400, m_ext52`) + 8 sizing rules.
- 30 leads (`ld_001…ld_030`): NEW 5 · QUALIFYING 7 · HANDOFF 3 · PROPOSAL_SENT 2 · WON 2 · LOST 5 · DISQUALIFIED 6. **7 SQLs** (stop-loss on track: 7 ≥ 6,5 esperado). Pipeline R$ 442.000 (T16AMR São Luís R$ 380k + T600e Castanhal R$ 62k). Closed R$ 104.900 (Belém CD Brava+S16 locação R$ 7.200 × 12 + Clínica i-mop Lite R$ 18.500). Golden scenarios: ld_001 Belém CD, ld_002 São Luís T16AMR, ld_003 clínica Ananindeua, ld_004 SP fora da região, ld_005 Macapá A260 (handoff 10:18 hoje, aguardando Vinicius — SLA ao vivo), ld_006 "Quero falar direto com o Vinicius", ld_007 sábado fora do horário, ld_008 IG Reels S16 → WhatsApp, ld_010 price-probe.
- 30 conversations / 180 messages (AI msgs carry tokens/cost/latency); 30 attributions (MQ-XXXX, UTMs, gclid/fbclid); 8 handoff events.
- 8 campaigns (`c_g_locacao, c_g_compra, c_g_pecas` ENABLED, `c_g_robotica` PAUSED since 05/11, `c_m_ctwa, c_m_reels` ENABLED, `c_m_remarketing, c_m_leadads` PAUSED never run) with daily series 12/10→20/11 (Mon–Fri only, campaign leads/SQLs reconcile with leads). Total spend ≈ R$ 1.240, CPL ≈ R$ 59, cost/SQL ≈ R$ 177, ROAS ≈ 85x. 12 ad spend entries (out/nov per campaign).
- 5 optimizer runs (Mondays, last 16/11 = 7 negativas) / 41 term logs; 41 negative keywords; 9 offline conversion events (1 FAILED 504 — Clínica WON, retryable); 25 outbound prospects (2 CONVERTED → ld_012, ld_020); 12 IG comment events; 10 notifications (5 unread).
