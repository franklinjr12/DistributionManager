# Maquinabel — Central de Aquisição (demo)

Demo **somente front-end** do SaaS multi-tenant "Ads Autônomos + SDR IA + Kanban CRM", configurado para o tenant Client Zero **Maquinabel** (concessionária Alfa Tennant · PA, MA, AP · CEO/vendedor Vinicius Goés).

A demo cobre o ciclo completo de aquisição: geração de campanhas Google/Meta por IA, ativação 1-clique, SDR IA no WhatsApp com handoff qualificado, Kanban com close-out obrigatório, conversões offline (Google Ads / Meta CAPI) e o painel de ROI com stop-loss do piloto de 60 dias.

> **Tudo é simulado.** Não há backend, banco de dados nem chamadas reais às APIs (Google Ads API v26, Meta Marketing API v26.0, Meta CAPI, WhatsApp Cloud API, gpt-4o-mini). Os dados vivem em memória (zustand) com latência simulada e são reiniciados ao recarregar a página. O "agora" da demo é **sexta, 20/11/2026 10:30 (America/Belem)** — dia 39 de 60 do piloto.

## Como rodar

Requisitos: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros comandos:

```bash
npm run build      # typecheck (tsc -b) + build de produção em dist/
npm run preview    # serve o build
npm run typecheck
```

Stack: Vite + React 18 + TypeScript + Tailwind CSS v4, react-router, zustand, dnd-kit, recharts, lucide-react, date-fns (pt-BR).

## Páginas

| Rota | Página |
|---|---|
| `/` | Painel ROI (3 níveis de ROI, stop-loss de 10 SQLs, origem dos leads) |
| `/ads` | Campanhas (Ads Manager) — métricas, inspetor, ativar/pausar |
| `/ads/blueprint` | Gerador de Campanhas IA (blueprint → validação → implantação PAUSADA) |
| `/crm` | Kanban CRM — arrastar cards, conversa, takeover humano, close-out |
| `/sdr` | Simulador SDR IA — cenários dourados, inspetor da IA, handoff |
| `/automacao` | Automação & CAPI — otimizador de termos, conversões offline, outbound, IG Comentário→DM |
| `/catalogo` | Catálogo Alfa Tennant + regras de dimensionamento |
| `/configuracoes` | Configurações do tenant, IA, integrações, usuários, modo demo |

## Roteiro sugerido (≈ 5 minutos)

1. **Painel ROI (`/`) — 30 s.** Mostre o stop-loss do piloto (7/10 SQLs no dia 39, "no ritmo"), os três níveis Mídia → Leads → SQLs → Receita e o mini-card do piloto na barra lateral.
2. **Gerador de Campanhas IA (`/ads/blueprint`) — 1 min.** Clique em **Gerar blueprint com IA**. Aponte a validação (título acima de 30 caracteres) e use **Corrigir automaticamente**. Clique em **Implantar campanhas (PAUSADAS)** → **Confirmar implantação**. Ao fim, **Revisar e ativar no Ads Manager**.
3. **Campanhas (`/ads`) — 45 s.** As novas campanhas aparecem como **Pausada**. Ative uma pelo switch → diálogo de confirmação com gasto estimado → **Ativar agora** → toast. Clique no nome para abrir o inspetor (visão geral, anúncios, negativas, rastreamento).
4. **Simulador SDR IA (`/sdr`) — 1 min.** Rode o cenário **1 · Galpão Belém** e acompanhe o inspetor (campos obrigatórios, recomendação Brava/S16, máquina de estados). No handoff, clique **Criar card no Kanban** → **Abrir no CRM**: o drawer do lead abre já em "Enviado ao Vendedor", com a IA pausada.
5. **Kanban CRM (`/crm`) — 1 min.** Arraste um card de "Em Qualificação" para **Enviado ao Vendedor** (toasts de handoff + conversão SQL). Depois mova para **Proposta Enviada** (valor obrigatório), **Fechado (Ganho)** em **Locação** (mensalidade × meses) e outro card para **Perdido** (motivo obrigatório). Volte ao Painel: SQLs, pipeline, receita e stop-loss já refletem as mudanças.
6. **Automação & CAPI (`/automacao`) — 45 s.** Aba **Conversões offline (CAPI)**: os eventos SQL/WON recém-gerados aparecem como Enviado; reenvie o evento com falha 504. Aba **Otimizador de termos** → **Executar agora** (negativas adicionadas + digest no WhatsApp). Aba **Prospecção outbound** → **Enviar ao SDR IA** num prospect que respondeu → **Ver lead** abre o card no CRM.
7. **Fechamento.** Abra o sino de notificações — cada item leva à tela correspondente.

Dica: em **Configurações → Modo demonstração** é possível ajustar a latência simulada e a taxa de falhas das "APIs" para mostrar estados de erro.
