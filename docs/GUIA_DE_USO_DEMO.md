# Guia de uso do app de demonstração — Maquinabel · Central de Aquisição

> Documento pessoal de referência. Explica **o que o app de demo é, o que ele inclui, como cada tela funciona e como os fluxos se conectam**. Para o roteiro de apresentação ao Vinicius, veja [ROTEIRO_DEMO_VINICIUS.md](ROTEIRO_DEMO_VINICIUS.md).
>
> Base: spec "04 - MVP Engineering Specification, Architecture & Implementation Backlog - Maquinabel SaaS" (Google Docs) + código em `src/`.

---

## 1. O que é a demo (em 1 minuto)

- É o **front-end clicável** do SaaS "Ads Autônomos + SDR IA + Kanban CRM", configurado para o tenant **Maquinabel** (concessionária Alfa Tennant · PA, MA, AP · CEO e único vendedor **Vinicius Goés**).
- **Nada é real**: não existe backend, banco ou chamada às APIs (Google Ads, Meta, WhatsApp, OpenAI). Tudo roda em memória com latência simulada.
- **Recarregar a página (F5) zera tudo** e volta aos dados iniciais. Isso é o "reset" da demo.
- **Relógio da demo:** sexta-feira **20/11/2026, 10:30 (horário de Belém)**. O piloto começou em 12/10 → estamos no **dia 39 de 60**.
- Os números iniciais (30 leads, 7 SQLs, R$ 442 mil de pipeline, R$ 104,9 mil fechados, ROAS ~85x) são **fictícios**, coerentes entre si, só para a demo.

### Como rodar

```powershell
npm install
```

```powershell
npm run dev
```

Abre em `http://localhost:5173`. Requer Node.js 20+.

---

## 2. Glossário rápido (o que cada termo significa no app)

| Termo | Significado |
|---|---|
| **Lead** | Qualquer contato que chegou (Google, Meta, Instagram, site, WhatsApp, outbound). |
| **SQL** | Lead **qualificado pela IA** (os 4 campos obrigatórios preenchidos) e enviado ao Vinicius. É a métrica-chave do piloto. Pedido direto de humano **não** conta como SQL até virar proposta. |
| **4 campos obrigatórios** | Modalidade (compra/locação/manutenção-peças) · Segmento · Dimensão (m², piso, sujeira) · Localização (cidade/UF). |
| **Handoff** | Momento em que a IA para de responder e passa o lead para o Vinicius, com um **brief de 4 linhas** no WhatsApp dele. |
| **Stop-loss** | Regra do piloto: se não gerar **10 SQLs em 60 dias**, a Maquinabel pode encerrar sem custo. |
| **CPL / Custo por SQL** | Investimento ÷ leads pagos / Investimento ÷ SQLs. |
| **Pipeline** | Soma dos valores dos cards em "Proposta Enviada". |
| **ROAS** | Receita fechada ÷ investimento em mídia. |
| **Conversão offline (CAPI)** | Aviso automático ao Google/Meta de que um lead virou SQL ou venda, para o algoritmo dos anúncios aprender a buscar clientes parecidos. |
| **Origem / tag de origem** | De onde o lead veio, ex.: `Google_Ads_Locacao`, `IG_Reels_S16`, `Site_Brava`, `Outbound_CNAE`. |
| **PAUSED / Pausada** | Toda campanha criada pela IA nasce pausada; só gasta dinheiro quando o Vinicius ativa. |

---

## 3. Elementos globais (aparecem em todas as telas)

### Barra lateral (esquerda)
- **Aquisição:** Painel ROI · Campanhas (Ads Manager) · Gerador de Campanhas IA
- **Vendas:** Kanban CRM (badge vermelho = leads em handoff com mensagens não lidas) · Simulador SDR IA
- **Operação:** Automação & CAPI · Catálogo Alfa Tennant · Configurações
- **Mini-card "Piloto 60 dias"** no rodapé: `dia 39/60`, SQLs `X/10`, barra com marcador "Ritmo esperado", e texto "No ritmo para bater a meta" / "Abaixo do ritmo esperado".
- Botão **"Recolher menu"** encolhe a barra (desktop). No celular vira menu hambúrguer.

### Barra superior
- **Breadcrumb:** Maquinabel › página atual.
- **Seletor de tenant:** mostra "Maquinabel (Alfa Tennant)" + 2 tenants "em breve" (Higinorte, Limpatec) → ilustra que é um SaaS multi-cliente.
- **Sino de notificações:** contador de não lidas; cada item leva à tela certa (CRM, Ads, aba específica da Automação). "Marcar todas como lidas".
- **Menu do usuário (Vinicius Goés):** "Meu perfil", "Configurações do tenant", "Sair" (desativado na demo).

### Comportamentos gerais
- **Toasts** (avisos no canto) confirmam toda ação.
- **Esc** fecha modais/gavetas; **Enter** confirma formulários.
- Falhas simuladas só acontecem se você aumentar a "Taxa de falha" em Configurações → Modo demonstração (padrão = 0%).

---

## 4. Tela a tela

### 4.1 Painel ROI (`/`)
**Para quê:** visão do dono. Mostra se o piloto está dando resultado: **Mídia → Leads → SQLs → Receita**.

Ações no topo: seletor de **Período** (7 dias / 30 dias / Desde o início do piloto), **"Importar CSV"**, **"Lançar investimento"**.

De cima para baixo:
1. **Stop-loss do piloto · 10 SQLs em 60 dias**: número grande `7 / 10 SQLs`, selo "No ritmo"/"Em risco"/"Meta atingida", barra com o realizado, a projeção para o dia 60 e o marcador "Esperado hoje". À direita: dia do piloto, dias restantes, projeção e % da meta.
2. **Faixa de atribuição em 3 níveis**
   - Nível 1 *Mídia → Leads*: Investimento, Leads, **CPL**.
   - Nível 2 *Leads → SQLs*: **SQLs**, taxa Lead→SQL, Custo/SQL.
   - Nível 3 *SQLs → Receita*: Pipeline, **Receita**, ROAS.
3. **8 KPIs:** Investimento vs orçamento (R$ 1.000/mês), Leads totais, Taxa lead→SQL, Mediana resposta IA (meta < 10 s), Mediana SLA humano (meta ≤ 15 min), Cobertura de rastreamento (meta 100%), Custo IA (US$), Negócios ganhos.
4. **Investimento diário vs leads e SQLs** (gráficos sincronizados; fim de semana = sem gasto, pois anúncios rodam seg–sex).
5. **Funil por etapa do Kanban** + link "Abrir Kanban".
6. **Desempenho por tag de origem**: gráfico + tabela (leads, SQLs, taxa, invest., CPL, pipeline, ganho). Ordenável.
7. **Próximas ações**: leads aguardando resposta do Vinicius com **cronômetro de SLA ao vivo** (fica vermelho após 15 min) e campanhas pausadas aguardando ativação. Cada linha leva à tela certa.
8. **Atividade recente**: handoffs, vendas, otimizador e conversões offline (filtros por tipo).
9. **Divisão por canal**: barra 100% por Leads/SQLs/Invest.
10. **Lançamentos de investimento**: tabela de gastos (origem API/Manual/CSV), com lixeira.

Modais:
- **Lançar investimento:** plataforma, mês, campanha, valor, observação → recalcula CPL e Custo/SQL.
- **Importar CSV:** arraste um arquivo ou clique **"Usar exemplo"** (tem 1 linha com erro de propósito) → prévia com linhas válidas/erro → "Importar N linhas".

### 4.2 Campanhas — Ads Manager (`/ads`)
**Para quê:** acompanhar Google Ads e Meta e **ligar/desligar campanhas com 1 clique**.

- Topo: **"Sincronizar métricas"** (puxa números "novos") e **"Gerar campanhas com IA"** (vai ao Gerador).
- Barra de conexão (Google Ads API, Meta Marketing API, Meta CAPI) + seletor de período.
- **KPIs:** Investimento (com barra do mês vs R$ 1.000), Impressões, Cliques·CTR, Leads, SQLs, CPL, Receita·ROAS.
- **Tabela de campanhas** (8 iniciais: 3 Google ativas, 1 Google pausada, 2 Meta ativas, 2 Meta pausadas): filtros por plataforma/status, busca, seleção em massa ("Ativar"/"Pausar").
  - Colunas: status (switch), estados, orçamento/dia, horário, % de rastreamento, métricas, mini-gráfico, leads, SQLs, CPL.
- **Ativar** abre a confirmação **"Ativar campanha?"** com gasto máximo estimado por dia/mês → **"Ativar agora"**. Pausar é imediato.
- **Clicar no nome abre o Inspetor** (gaveta à direita) com 4 abas:
  - **Visão geral:** desempenho, gráfico diário, **orçamento diário editável** (limite piloto R$ 5–200/dia), estados (PA/MA/AP), horário (herdado do horário comercial).
  - **Anúncios:** Google → palavras-chave (adicionar/remover, tipo de correspondência), **prévia do anúncio no Google** ("Outra combinação"), títulos (máx. 30) e descrições (máx. 90). Meta → criativos, posicionamentos, público.
  - **Negativas:** lista de termos bloqueados (os com ✨ foram adicionados pela IA do otimizador).
  - **Rastreamento:** template de UTM/gclid, cobertura de captura e conversões offline enviadas.
  - Rodapé: **"Salvar alterações"** / "Descartar" (valida antes de salvar).

### 4.3 Gerador de Campanhas IA (`/ads/blueprint`)
**Para quê:** a IA monta as campanhas completas a partir do catálogo e das regras da Maquinabel. É o que **substitui a agência**.

Assistente em 3 passos:

**Passo 1 — Configurar** (tudo vem pré-preenchido):
- Região (PA/MA/AP) e cronograma (seg–sex 08–18h).
- Orçamento mensal (R$ 1.000) e divisão Google 65% / Meta 35%.
- Objetivos (cada um vira uma campanha): Locação, Compra, Peças/Manutenção, Robótica Autônoma (Google); Click-to-WhatsApp, Instagram Reels/Direct (Meta).
- Semente de catálogo (máquinas usadas nos anúncios) e tom de voz.
- Botão **"Gerar blueprint com IA"** → painel de geração (~6 s) com log passo a passo.

**Passo 2 — Revisar blueprint:**
- Chips de resumo + **painel de validação**. Uma geração nova **sempre traz 1 erro de propósito** (título "Locação de Lavadoras Industriais" com 32 caracteres > 30). Clique **"Corrigir automaticamente"** (ou "Corrigir").
- Colunas Google e Meta com cada campanha expansível: grupos de anúncios, palavras-chave (clique no tipo para alternar Ampla/Frase/Exata), títulos, descrições, negativas, rastreamento; criativos Meta, posicionamentos, segmentação. Botões "Regenerar".
- **"Implantar campanhas (PAUSADAS)"** → modal com totais (campanhas, grupos, palavras-chave, anúncios) → **"Confirmar implantação"**.

**Passo 3 — Implantar:** log estilo terminal (~8 s) com as chamadas às APIs, todas em `PAUSED`. Tela de sucesso → **"Revisar e ativar no Ads Manager"**.

Efeitos: as campanhas novas aparecem em `/ads` como **Pausada · Gerada por IA**, no Painel em "Campanhas pausadas pendentes de ativação" e no sino. Histórico de blueprints à direita (rascunhos podem ser reabertos).

### 4.4 Kanban CRM (`/crm`)
**Para quê:** o funil de vendas do Vinicius. O lead chega pronto, ele só atende e registra o resultado.

- Topo: contadores (Leads, SQLs, Pipeline, "SLA estourado"), **"Novo lead"**, busca, filtros (canal, origem, modalidade, estado), alternância **Kanban / Lista**.
- **6 colunas:** Novos · Em Qualificação · Enviado ao Vendedor · Proposta Enviada · Fechado (Ganho) · Perdido / Desqualificado.
- **Card:** canal, nome, empresa, origem, modalidade, cidade/UF (vermelho se fora da região), m², máquina recomendada, valor, status da IA ("IA ativa"/"IA pausada"/"Humano"), cronômetro de SLA, lua 🌙 se chegou fora do horário.

**Arrastar cards (regras de negócio):**
| Para | O que acontece |
|---|---|
| Novos / Em Qualificação | Move direto. |
| **Enviado ao Vendedor** | Brief de 4 linhas "enviado" ao WhatsApp do Vinicius, IA pausada, lead vira SQL, conversão SQL enviada ao Google/Meta (se origem paga), notificação. |
| **Proposta Enviada** | Modal obrigatório: **valor estimado** (R$). Alimenta o pipeline. |
| **Fechado (Ganho)** | Modal obrigatório: **Venda** (valor final) ou **Locação** (mensalidade × meses, total calculado). Dispara conversão WON com valor. |
| **Perdido / Desqualificado** | Modal obrigatório: **motivo** (Preço, Prazo, Fora de Região, Sem Retorno, Concorrente, Curioso/Residencial). "Fora de Região" e "Curioso" = Desqualificado (não conta como oportunidade perdida). |

**Gaveta do lead** (clique no card; URL `/crm?lead=…`):
- Cabeçalho: botão **WhatsApp**, **"Mover etapa"**.
- **Conversa** (esquerda): transcrição estilo WhatsApp (IA em roxo, Vinicius em verde, sistema ao centro). **"Pausar IA"/"Retomar IA"**. Respostas rápidas ("Apresentação", "Agendar visita"…). Enviar mensagem **pausa a IA automaticamente** (takeover) e registra o SLA humano; o lead "responde" sozinho alguns segundos depois.
- **Abas (direita):**
  - **Qualificação:** checklist dos 4 campos + edição dos dados.
  - **Recomendação IA:** máquinas indicadas com produtividade e motivo; "Recalcular".
  - **Brief 4 linhas:** prévia exata da mensagem que o Vinicius recebe; "Copiar", "Reenviar ao Vinicius".
  - **Atribuição:** sessão MQ-XXXX, UTMs, gclid/fbclid, conversões offline enviadas.
  - **Histórico:** SLA da IA e humano + linha do tempo.

**Novo lead** (manual, ex.: indicação): nome, empresa, WhatsApp, origem, cidade, UF, modalidade → abre a gaveta do lead novo.

### 4.5 Simulador SDR IA (`/sdr`)
**Para quê:** "conversar como se fosse o cliente" e ver a IA qualificar, recomendar a máquina e passar para o Vinicius. **É a tela de maior impacto.**

3 colunas:
1. **Cenários:** canal (WhatsApp / Instagram Direct / Widget do site), tag de origem, relógio ("Horário comercial" ou "Sábado 14:00"), debounce (5 s/2 s/Off) e a lista de **cenários dourados**.
2. **Celular:** a conversa. Você pode **digitar livremente** ("Digite como o lead…") ou rodar um cenário.
3. **Inspetor IA:** card do handoff (o WhatsApp do Vinicius), máquina de estados, campos obrigatórios (X/4), modelos recomendados, métricas (latência, tokens, custo, cache) e guardrails (Preço, Catálogo, Região, Horário), JSON por turno.

**Os 9 cenários dourados:**
| # | Cenário | O que demonstra | Resultado |
|---|---|---|---|
| 1 | Galpão Belém 4.500 m² | 5 mensagens seguidas agrupadas em 1 resposta; locação | Brava / S16 → handoff |
| 2 | Atacarejo São Luís 8.000 m² | Compra, falta de mão de obra, robótica | T16AMR (+ Brava) → handoff |
| 3 | Clínica Ananindeua 350 m² | Ambiente pequeno e apertado | i-mop Lite / Alfa Mini → handoff |
| 4 | Fora de região (SP) | Filtro de região | Desqualificado; **Vinicius não é incomodado** |
| 5 | Sondagem de preço | Cliente insiste 3× no preço; IA nunca dá valor | Guardrail 3× → depois handoff |
| 6 | Manutenção Macapá A260 | Pós-venda/peças | Manutenção/Peças → handoff |
| 7 | "Quero falar com o Vinicius" | Pedido de humano no 1º turno | Transferência imediata, IA pausada |
| 8 | Sábado fora do horário | IA atende 24/7 | Handoff + "Vinicius retorna segunda às 08:00" |
| 9 | Comentário IG Reels S16 → DM | Comentário "Quanto custa alugar?" → resposta pública + Direct → captura WhatsApp | S16 → handoff, origem IG_Reels_S16 |

Ao final de um cenário com handoff: **"Criar card no Kanban"** → **"Abrir no CRM"** (o card abre em "Enviado ao Vendedor", com conversa, brief, atribuição e conversão SQL).

Controles: clicar no cenário = play; **"Parar"**; **"Reiniciar"**. Não há controle de velocidade.

Dica para digitar livre: a IA reconhece cidades de PA/MA/AP (Belém, Ananindeua, Castanhal, Marabá, São Luís, Imperatriz, Macapá…), áreas ("4.500 m²", "8 mil metros"), pedidos de preço ("quanto custa", "valor") e pedidos de humano ("quero falar com o Vinicius").

### 4.6 Automação & CAPI (`/automacao`)
**Para quê:** a "sala de máquinas": o que roda sozinho em segundo plano.

- **Faixa de 6 workers** com status e botão **"Executar agora"** (OfflineConversionSync, Otimizador semanal, Prospecção, Sync de métricas, Webhook IG, Fila de debounce).
- **Abas:**
  1. **Otimizador de termos:** **"Executar agora"** → console mostra a IA analisando buscas do Google, negativando termos residenciais (ex.: "residencial karcher") e mantendo os B2B ("varredeira industrial tennant"); histórico, tabela de termos (Reverter/Negativar), **prévia do resumo enviado ao WhatsApp do Vinicius**, biblioteca de negativas.
  2. **Conversões offline (CAPI):** eventos SQL/WON enviados ao Google e Meta. Há **1 evento com falha 504** (Dra. Patrícia Nunes) → **"Reenviar"** → 200 OK. "Sincronizar pendentes".
  3. **Prospecção outbound:** empresas B2B de PA/MA/AP mineradas por CNAE/Google Places. **"Minerar novos prospects"**, **"Próximo toque"** (e-mail/WhatsApp), e no filtro "Respondeu": **"Enviar ao SDR IA"** → vira lead no CRM → **"Ver lead"**. Editor da sequência multi-toque.
  4. **Instagram Comentário→DM:** lista de comentários e simulador: escolha o post, digite "Quanto custa alugar?" → **"Enviar webhook simulado"** → resposta pública + DM. Configura palavras-gatilho e respostas.
  5. **Webhooks & filas:** logs técnicos, fila de debounce animada, dead-letter, **"Simular erro 500 da Meta"** (dispara alerta). *Técnico: não usar com o cliente.*

### 4.7 Catálogo Alfa Tennant (`/catalogo`)
**Para quê:** a "base de conhecimento" da IA — as 10 máquinas e as regras de dimensionamento.

- **Máquinas:** cards (Alfa Mini, i-mop Lite, A260, T600e, Brava, T16AMR, Alfa Bizz, S16, Alfa Pressure 400, Ext52). Switch **"Ativo para IA"**. Clique abre a ficha editável.
- **Matriz de dimensionamento:** faixas de m² → modelo (ex.: 500–2.500 m² → A260; 2.500–6.000 → Brava; > 5.000 multi-turno → T16AMR). Limites editáveis.
- **Calculadora rápida:** presets ("CD Belém 8.000 m²", "Clínica 300 m²"…) → mostra a máquina recomendada e horas/dia de uso. Ótima para mostrar a lógica da IA.
- **Prévia do contexto LLM:** o prompt e o catálogo que a IA recebe. *Técnico.*

### 4.8 Configurações (`/configuracoes`)
Seções: **Empresa** · **Cobertura & horário** (UFs atendidas, horário comercial, mensagem fora do horário) · **Roteamento & handoff** (WhatsApp do Vinicius, template do brief, SLA 15 min) · **IA SDR** (modelo, guardrails, custo do mês) · **Integrações** (Google Ads, Meta, WhatsApp, OpenAI…; Google Places "pendente" → "Testar conexão") · **Widget & links rastreados** (gerador de link wa.me com UTM) · **Usuários** (convidar) · **Segurança & LGPD** · **Modo demonstração**.

**Modo demonstração** (importante para apresentar):
- **"Apresentação rápida"** = latência 0,25× e 0% de falhas (recomendado na reunião).
- **"Padrão"** = 1×, 0%.
- **"Modo caos"** = 30% de falhas (só para testar telas de erro).
- **"Restaurar dados de demonstração"** = recarrega a página.

---

## 5. Os fluxos de ponta a ponta (como tudo se conecta)

### Fluxo A — Do zero à campanha no ar
Gerador IA → Gerar blueprint → Corrigir automaticamente → Implantar (PAUSADAS) → Confirmar → "Revisar e ativar no Ads Manager" → em `/ads`, ligar o switch → "Ativar agora".

### Fluxo B — Do lead ao Vinicius
Simulador SDR → cenário 1 (Galpão Belém) → IA qualifica e recomenda Brava/S16 → handoff (brief de 4 linhas) → "Criar card no Kanban" → "Abrir no CRM".

### Fluxo C — Do atendimento ao contrato
CRM → card em "Enviado ao Vendedor" → responder na conversa (IA pausa, SLA registrado) → arrastar para "Proposta Enviada" (valor) → "Fechado (Ganho)" (Locação: mensalidade × meses) → Painel ROI atualiza SQLs, pipeline, receita e stop-loss.

### Fluxo D — O sistema aprendendo sozinho
Ganho/SQL no CRM → Automação → "Conversões offline (CAPI)" mostra o evento enviado ao Google/Meta → Otimizador "Executar agora" corta buscas ruins → resumo no WhatsApp do Vinicius.

### Fluxo E — Gerar demanda ativa (outbound)
Automação → Prospecção outbound → "Respondeu" → "Enviar ao SDR IA" → "Ver lead" → card no CRM com origem Outbound.

### Fluxo F — Instagram
Automação → Instagram Comentário→DM → "Quanto custa alugar?" → "Enviar webhook simulado" (ou cenário 9 no Simulador, que é mais visual).

---

## 6. Dicas e pegadinhas

- **F5 zera tudo.** Faça um ensaio completo e depois recarregue antes da reunião.
- A **confirmação de ativação** de campanha só aparece na 1ª vez por campanha na sessão.
- A **Prospecção outbound** e a aba **Webhooks** resetam ao trocar de aba.
- Comentário simulado na aba Instagram **não cria lead**; o cenário 9 do Simulador cria.
- No cenário de sábado, o card criado no CRM mostra o texto de "horário comercial" (o relógio global é sexta 10:30) — detalhe conhecido, não chame atenção para ele.
- O lead **ld_005 (Macapá A260)** está em handoff desde 10:18 → o cronômetro de SLA está correndo ao vivo no Painel ("Próximas ações") e no CRM. Bom para mostrar urgência.
- Números do seed são ilustrativos. **Nunca apresente o ROAS de 85x como promessa.**
