# Roteiro de demonstração — para o Vinicius Goés (Maquinabel)

> **Objetivo da reunião:** o Vinicius sair convencido de que o sistema **traz mais leads qualificados para ele, sem agência e sem perder tempo com curioso**, e topar começar o piloto de 60 dias.
>
> **Duração:** 12–15 min de demo + conversa. **Regra de ouro:** falar a língua dele (orçamento, locação, cliente, WhatsApp), não a nossa (API, CAPI, LLM, webhook).

---

## 0. Antes da reunião (5 min de preparação)

1. `npm run dev` e abrir `http://localhost:5173` em tela cheia.
2. **Configurações → Modo demonstração → "Apresentação rápida"** (tudo responde rápido, sem falhas).
3. Fazer um ensaio completo do roteiro abaixo e depois **recarregar a página (F5)** para zerar os dados.
4. Deixar o **celular de lado**: a demo inteira acontece na tela.
5. Ter em mente: **os números são ilustrativos**. Diga isso uma vez, logo no começo.

**Frase de abertura (30 s):**
> "Vinicius, a gente partiu das três coisas que você falou: falta volume de lead, o cliente procura a máquina mas não sabe qual é a certa, e tudo cai em você. Vou te mostrar como o sistema resolve as três, do anúncio até o contrato fechado. Os números aqui são de exemplo, simulando o dia 39 do piloto."

---

## 1. Mapa da demo (as 3 dores → o que mostrar)

| Dor do Vinicius | O que o sistema faz | Tela |
|---|---|---|
| **"Falta volume de lead"** | A IA cria e otimiza as campanhas no Google e no Meta sozinha, sem agência | Gerador IA → Campanhas |
| **"O cliente não sabe qual máquina"** | Consultor técnico virtual 24h no WhatsApp/Instagram, dimensiona a máquina em segundos | Simulador SDR IA |
| **"Tudo é direcionado para mim"** | Só chega para ele quem é cliente de verdade, já com resumo de 4 linhas | Brief + Kanban CRM |
| **"Está dando resultado?"** | Painel mostra investimento → leads → orçamentos → receita | Painel ROI |

---

## 2. Roteiro passo a passo

### Ato 1 — "Sem agência: a IA monta suas campanhas" (3 min)
**Tela:** Gerador de Campanhas IA (`/ads/blueprint`)

1. Mostre que já vem configurado: **PA, MA, AP**, seg–sex 8h–18h, **R$ 1.000/mês**, objetivos Locação, Compra, Peças, Robótica, WhatsApp e Reels.
2. Clique **"Gerar blueprint com IA"**.
3. Na revisão, abra uma campanha Google e mostre as palavras-chave e os títulos dos anúncios.
4. Aponte o erro de validação (título longo) → **"Corrigir automaticamente"**.
5. **"Implantar campanhas (PAUSADAS)"** → **"Confirmar implantação"** → **"Revisar e ativar no Ads Manager"**.
6. Em Campanhas, ligue o switch de uma campanha nova → mostre o gasto máximo estimado → **"Ativar agora"**.

**O que dizer:**
> "Isso que uma agência levaria dias para montar, a IA fez em segundos, usando o catálogo Alfa Tennant e a sua região. Nada vai ao ar sem você aprovar: tudo nasce pausado, e você liga com um clique. Você não precisa contratar gestor de tráfego."

**Ponto-chave:** anúncios só rodam **na região que você atende e no horário que você pode atender**. Dinheiro não vaza para SP nem para sábado.

---

### Ato 2 — "Seu consultor técnico 24 horas" (4 min) ⭐ momento principal
**Tela:** Simulador SDR IA (`/sdr`)

1. Diga: "Agora eu sou um cliente que clicou no seu anúncio de locação."
2. Rode o cenário **1 · Galpão Belém 4.500 m²**.
3. Enquanto a conversa roda, mostre no painel da direita os **4 campos sendo preenchidos** (modalidade, segmento, área/piso, cidade).
4. No final: **recomendação Brava + S16** com o motivo técnico, e o **card verde "WhatsApp do Vinicius Goés"** com o resumo de 4 linhas.

**O que dizer:**
> "Em poucas mensagens, a IA descobriu o que o cliente precisa, indicou a máquina certa e te mandou o resumo pronto no WhatsApp. Você já chega na ligação sabendo: quem é, empresa, cidade, locação ou compra, metragem, piso e qual máquina oferecer."

**Se houver tempo, mostre 1 ou 2 cenários rápidos (escolha conforme o interesse dele):**
- **4 · Fora de região (SP):** "Esse aqui **nem chega até você**. A IA explica educadamente que vocês atendem PA, MA e AP." → protege o tempo dele.
- **5 · Sondagem de preço:** "A IA **nunca passa preço**, nem aproximado. Preço é com você." → tranquiliza sobre risco.
- **8 · Sábado 14:00:** "Cliente chegou no sábado: a IA atende, qualifica e avisa que você retorna segunda às 8h. **Você não perde o lead do fim de semana.**"
- **9 · Comentário no Reels:** "Alguém comenta 'quanto custa alugar?' no seu vídeo da S16 → a IA responde e puxa para o Direct e depois para o WhatsApp."

---

### Ato 3 — "Você só atende e fecha" (3 min)
**Tela:** no final do cenário 1, **"Criar card no Kanban"** → **"Abrir no CRM"**

1. A ficha abre em **"Enviado ao Vendedor"** com toda a conversa, o brief e a máquina recomendada.
2. Mostre o botão **WhatsApp** e a resposta rápida: "Você assume a conversa e a IA sai de cena automaticamente."
3. Feche a ficha e mostre o **Kanban**. Aponte o cronômetro de **SLA** (meta: responder em até 15 min).
4. Arraste um card de **Proposta Enviada → Fechado (Ganho)** → escolha **Locação**, mensalidade × 12 meses → **"Registrar ganho"**.
5. Arraste outro para **Perdido** → mostre que pede o motivo (Preço, Prazo, Concorrente…).

**O que dizer:**
> "Seu trabalho no sistema é só esse: responder rápido e arrastar o card. Quando você marca uma venda, o sistema avisa o Google e o Meta qual anúncio trouxe esse cliente, e eles passam a buscar mais clientes iguais a esse. Os anúncios ficam mais inteligentes a cada venda."

---

### Ato 4 — "O resultado em uma tela" (2 min)
**Tela:** Painel ROI (`/`)

1. **Stop-loss:** "7 de 10 orçamentos qualificados no dia 39: no ritmo."
2. Os **3 níveis**: quanto investiu → quantos leads → quantos orçamentos qualificados → quanto virou de contrato.
3. **Desempenho por origem:** "Você vê qual anúncio traz cliente de verdade, não só clique."
4. **Próximas ações:** "Aqui o sistema te diz o que fazer agora: quem está esperando sua resposta."

**O que dizer:**
> "Você vai saber exatamente quanto cada real de anúncio virou em orçamento e em contrato. Sem achismo."

---

### Ato 5 (opcional, 1 min) — "Trabalhando enquanto você dorme"
**Tela:** Automação & CAPI — mostre só se ele estiver engajado.

- **Otimizador de termos → "Executar agora":** "Toda segunda a IA corta buscas que não são de cliente, como 'lavadora residencial karcher', e te manda um resumo no WhatsApp."
- **Prospecção outbound:** "Além dos anúncios, o sistema busca empresas da região (CDs, supermercados, indústrias), manda e-mail e WhatsApp, e quem responde cai direto na IA."

---

## 3. Fechamento: os termos do piloto (2 min)

| Item | Proposta |
|---|---|
| Duração | **60 dias** |
| Garantia (stop-loss) | Se não gerar **10 orçamentos qualificados (SQLs)** em 60 dias, você pode encerrar |
| Custo para a Maquinabel | **R$ 0 de licença/desenvolvimento** · R$ 50–110/mês de infraestrutura · R$ 1.000/mês de mídia (pago direto ao Google/Meta) |
| Ponto de equilíbrio | **1 locação** (ex.: R$ 3.500/mês × 24 meses ≈ R$ 84 mil) **ou 1 venda** já paga o piloto inteiro |

**O que precisamos de você (fora do sistema):**
1. Contas do **Google Ads** e **Meta Business** em nome da Maquinabel (CNPJ e cartão).
2. **Gravar vídeos curtos** das máquinas trabalhando (galpão, shopping) para os Reels.
3. **Responder o lead em até 15 min** no horário comercial.
4. **Arrastar os cards** e registrar valor de proposta/fechamento e motivo de perda.
5. Um onboarding de **15 minutos** para ativar as campanhas e testar o alerta no WhatsApp.

**Frase de fechamento:**
> "Comparado com as mentorias de R$ 2.500 a R$ 6.000 por mês com contrato anual, aqui você paga só a mídia e a infraestrutura, e tem uma meta clara de 10 orçamentos em 60 dias. Se não bater, você sai. Podemos começar?"

---

## 4. Perguntas prováveis (e respostas curtas)

| Pergunta | Resposta |
|---|---|
| "A IA pode falar besteira para o cliente?" | Ela só indica máquinas do catálogo Alfa Tennant e **nunca passa preço, desconto ou prazo**. Preço é sempre com você. |
| "E se o cliente quiser falar comigo?" | Ele pede e a IA transfere na hora (cenário 7). Você também pode assumir qualquer conversa com um clique. |
| "Vai gastar meu dinheiro sem eu saber?" | Tudo nasce pausado, você liga e desliga com 1 clique, e o painel mostra o gasto contra o orçamento de R$ 1.000. |
| "Preciso de alguém para mexer nisso?" | Não. Seu trabalho é responder o lead e arrastar o card. O resto é automático. |
| "Funciona no Instagram?" | Sim: comentário no post/Reels vira conversa no Direct e depois no WhatsApp, com a origem rastreada. |
| "E fim de semana / à noite?" | A IA atende 24h e avisa que você retorna no próximo dia útil às 8h. |
| "Isso aqui já está funcionando de verdade?" | Isto é a demonstração de como vai funcionar. Na implantação, conectamos às suas contas reais do Google, Meta e WhatsApp. |

---

## 5. O que NÃO fazer

- **Não abrir** Webhooks & filas, Prévia do contexto LLM, JSON do Inspetor, Integrações. É técnico e tira o foco.
- **Não prometer** os números da tela (ROAS 85x, R$ 104 mil fechados): são de exemplo. A promessa é a **meta do stop-loss: 10 SQLs em 60 dias**.
- **Não usar siglas** sem traduzir: SQL = "orçamento qualificado"; CAPI = "o sistema avisa o Google/Meta quem virou cliente"; Handoff = "a IA te passa o cliente".
- **Não passar de 15 min de tela.** Se ele se interessar por algo, aprofunde ali e pule o Ato 5.
- **Não ativar o "Modo caos"** nem mexer na taxa de falha durante a reunião.

---

## 6. Cola de 1 linha por tela

1. **Gerador IA:** "A IA monta suas campanhas em segundos, sem agência."
2. **Campanhas:** "Você liga e desliga com um clique, só na sua região e no seu horário."
3. **Simulador SDR:** "Seu consultor técnico 24h que indica a máquina certa."
4. **Brief no WhatsApp:** "Você recebe o cliente pronto, em 4 linhas."
5. **Kanban:** "Você só atende, arrasta e fecha."
6. **Painel ROI:** "Cada real de anúncio, rastreado até o contrato."
