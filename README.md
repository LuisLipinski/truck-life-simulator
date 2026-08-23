# Truck Life Simulator

Companion de carreira para American Truck Simulator e Euro Truck Simulator 2. Cada jogo mantém carreiras, estado financeiro, unidades, qualificações, backups, links e regras próprios.

## Jogos e rotas

| Item | ATS | ETS2 |
| --- | --- | --- |
| Entrada | `#/ats` | `#/ets2` |
| Distância | milhas (`mi`) | quilômetros (`km`) |
| Folha | semanal | mensal |
| Sede fiscal | estado escolhido | país escolhido |
| Mercado local | cidade-base dentro do estado | cidade-base dentro do país |
| Moeda | USD ou EUR | 16 moedas de exibição; país fiscal separado |
| Carga perigosa | HazMat | ADR |
| Combinação avançada | Doubles | Euro Combi |
| Backup tabular | `ATS_CAREERS_TABLE` | `ETS2_CAREERS_TABLE` |

As chaves de `localStorage` de ATS e ETS2 são separadas. A importação também recusa arquivos do jogo errado.

## Autenticação pública

As telas públicas ficam nas rotas `#/login`, `#/register`, `#/verify-email`, `#/forgot-password` e `#/reset-password`. O endereço da API pode ser definido em `VITE_API_BASE_URL`; na ausência da variável, o frontend usa `https://truck-life-simulator-api.onrender.com`.

O token de acesso permanece somente em memória. O frontend envia cookies de renovação com `credentials: include` e não grava credenciais ou tokens no `localStorage` nem no `sessionStorage`. Os fluxos de recuperação de senha já possuem interface e tratamento de indisponibilidade, mas dependem da publicação dos endpoints correspondentes no backend.

## Modelo financeiro do ATS

O estado-sede é escolhido antes da cidade-base. Ele filtra as cidades disponíveis, define retenções e fornece a referência financeira estadual. A cidade-base aplica um multiplicador municipal diferente para custo de vida e para mercado salarial; cruzar a divisa durante uma viagem não muda a folha da carreira.

Os 20 estados presentes no mapa atual estão configurados: Arizona, Arkansas, Califórnia, Colorado, Idaho, Illinois, Iowa, Kansas, Louisiana, Missouri, Montana, Nebraska, Nevada, Novo México, Oklahoma, Oregon, Texas, Utah, Washington e Wyoming.

- imposto federal: faixas e dedução-padrão de solteiro de 2026;
- Social Security: 6,2% até o teto anual de 2026;
- Medicare: 1,45%, com adicional quando aplicável;
- imposto estadual: alíquota única ou faixas do estado selecionado;
- Califórnia: também inclui California SDI;
- Washington: não tributa salários com imposto estadual, mas inclui WA Cares;
- Nevada, Texas e Wyoming: sem imposto estadual sobre salários.

As tarifas por milha dos Níveis 2 e 3 agora variam primeiro pelo mercado salarial do estado e depois pela cidade-base, assim como o salário fixo e a hora extra do Nível 1. Aluguel, caução, alimentação, transporte e outras despesas urbanas recebem o fator de custo da cidade. Itens regulatórios e retenções continuam ligados ao estado.

Custos e salários são referências editáveis de roleplay baseadas em dados ocupacionais e diferenças metropolitanas; não são uma proposta de emprego nem uma folha oficial. Impostos municipais, distritais, créditos e condições pessoais não modeladas ficam fora do cálculo.

O ATS original oferece USD e EUR como moedas de exibição. A moeda fiscal permanece USD; quando EUR é escolhido, toda a carreira é convertida pela cotação registrada na criação.

## Modelo financeiro do ETS2

O ETS2 usa camadas complementares:

- regras operacionais comuns da Europa para jornada, pausas e descanso;
- salário, custo de vida, retenções e taxas definidos pelo país-sede da carreira, na moeda fiscal local;
- multiplicadores da cidade-base para aluguel, despesas urbanas e salários dos três níveis;
- moeda de exibição e lançamentos escolhida pelo usuário.

O país-sede é escolhido antes da cidade-base. Ele não muda quando o motorista cruza uma fronteira: uma carreira sediada na Alemanha continua com folha alemã durante viagens pelo restante da Europa. A cidade representa a diferença regional dentro do país — por exemplo, Londres e Plymouth mantêm os mesmos impostos britânicos, mas recebem referências diferentes de aluguel e salário. A moeda da carreira é independente: Londres pode usar regras britânicas em GBP e exibir todos os valores em EUR.

Todas as cidades mapeadas no ATS e no ETS2 recebem um perfil entre cidade menor, centro regional, metrópole principal e mercado de custo alto, com ajustes específicos para mercados excepcionais. Cidades adicionadas manualmente por mods usam fator neutro da sede até que o usuário edite os valores.

### Jornada, pausas e horas extras no ETS2

A regra operacional de condução não muda por cidade. A referência europeia exige 45 minutos de pausa após no máximo 4h30 de condução, com possibilidade de divisão em 15 + 30 minutos. Para a jornada móvel, o intervalo total mínimo é de 30 minutos quando o trabalho fica entre 6 e 9 horas e de 45 minutos acima de 9 horas, em blocos de pelo menos 15 minutos. Leis nacionais e acordos coletivos podem oferecer condições mais favoráveis, mas não são usados para criar regras municipais de almoço na simulação.

No Registro de Viagens do ETS2, saída e chegada formam o tempo corrido do trecho. O campo de pausa guarda o total não trabalhado ocorrido dentro desse intervalo. Se ficar vazio, a aplicação sugere automaticamente 45 minutos para cada bloco completo de até 4h30 que precise ser sucedido por nova condução; o usuário pode substituir a sugestão pelo tempo realmente usado. Intervalos entre duas viagens já não entram nas horas registradas.

Para o motorista do Nível 1, o holerite agrupa os trechos por dia, desconta as pausas e compara o tempo líquido com a jornada normal de 8 horas. A prévia e o fechamento preservam tempo corrido, pausas, tempo computado, saldo de horas extras, tarifa e valor pago. Nos Níveis 2 e 3, a pausa continua registrada para o roleplay operacional, mas a remuneração permanece por quilômetro.

### Viagens preparadas para telemetria

O registro manual de viagens de ATS e ETS2 aceita marca e modelo do caminhão em texto livre, inclusive veículos de mods, além das leituras inicial e final do odômetro. As leituras formam uma distância auxiliar de conferência e nunca substituem automaticamente a distância oficial informada pelo motorista, porque troca de caminhão, Truck Tools e outras alterações podem produzir diferenças legítimas.

Cada trecho guarda sua origem de dados como `MANUAL`, `TELEMETRY` ou `IMPORT`. Viagens novas criadas na tela usam `MANUAL`; backups modernos preservam a origem e importações legadas recebem normalização compatível.

### Perfil, empregadora e mudança de base

Na Visão Geral, **Gerenciar carreira** permite corrigir o nome do motorista, atualizar ou remover a biografia, trocar de empregadora e mudar a sede/cidade-base. Trocas de empresa e base exigem uma data efetiva e confirmação em modal.

As mudanças geram eventos estruturados com os valores anterior e novo. Antes de trocar empresa ou base, viagens e holerites legados recebem somente os snapshots históricos que ainda não possuíam; dados já registrados não são substituídos. Novas viagens guardam a empregadora e a base vigentes, e novos holerites também preservam o motorista e a empresa do período.

Ao mudar de base, a moeda de exibição escolhida para a carreira é mantida. País ou estado, moeda fiscal, cotação, impostos, salários e despesas padrão passam ao novo perfil para os próximos cálculos; saldo, movimentações financeiras e períodos fechados não são recalculados. A linha do tempo fica disponível no Histórico e é incluída no backup tabular.

### País fiscal e moeda da carreira

Na criação da carreira, a moeda local do país vem selecionada por padrão, mas pode ser trocada. A aplicação mantém duas referências:

- `baseCurrency`: moeda em que os salários, custos e faixas fiscais do país foram pesquisados;
- `currency`: moeda em que saldo, despesas, tarifas e holerites aparecem para o usuário.

Quando elas diferem, o bruto é convertido de volta para a moeda fiscal antes de aplicar faixas e limites. Cada retenção é então convertida para a moeda da carreira. Assim, escolher EUR em Londres não transforma os limites britânicos em números de euro nem altera as alíquotas.

A cotação é registrada na criação e permanece fixa nessa carreira. Isso impede que um holerite antigo, um saldo salvo ou uma despesa histórica mude quando o câmbio variar. A tabela atual usa referências de 20/08/2026.

Moedas disponíveis no seletor, acompanhando as moedas de exibição do ETS2 atual:

| Código | Moeda | Código | Moeda |
| --- | --- | --- | --- |
| EUR | Euro | CHF | Franco suíço |
| CZK | Coroa tcheca | GBP | Libra esterlina |
| PLN | Złoty polonês | HUF | Forint húngaro |
| DKK | Coroa dinamarquesa | SEK | Coroa sueca |
| NOK | Coroa norueguesa | RUB | Rublo russo |
| RON | Leu romeno | TRY | Lira turca |
| ALL | Lek albanês | BAM | Marco conversível bósnio |
| MKD | Dinar macedônio | RSD | Dinar sérvio |

### Países disponíveis

Todos os 34 países representados na lista de cidades possuem perfil financeiro. Alemanha, Reino Unido e Polônia mantêm modelos detalhados; os demais usam alíquotas pessoais efetivas de referência separadas entre renda e contribuições sociais.

| Países-sede | Moeda fiscal |
| --- | --- |
| Alemanha, Áustria, Bélgica, Bulgária, Croácia, Eslováquia, Eslovênia, Espanha, Estônia, Finlândia, França, Grécia, Itália, Kosovo, Letônia, Lituânia, Luxemburgo, Montenegro, Países Baixos e Portugal | EUR |
| Reino Unido | GBP |
| Suíça | CHF |
| Polônia | PLN |
| Tchéquia | CZK |
| Hungria | HUF |
| Dinamarca | DKK |
| Noruega | NOK |
| Suécia | SEK |
| Romênia | RON |
| Turquia | TRY |
| Albânia | ALL |
| Bósnia e Herzegovina | BAM |
| Macedônia do Norte | MKD |
| Sérvia | RSD |

Os valores são parâmetros simplificados de roleplay para 2025/26, não uma folha oficial nem orientação fiscal. Condições pessoais reais — classe fiscal, região, família, benefícios, contrato e deduções — podem alterar o resultado.

### Exemplos de tarifas por quilômetro

| País | Padrão | ADR | Euro Combi | ADR + Euro Combi | Vazio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Alemanha | € 0,30 | € 0,33 | € 0,35 | € 0,38 | € 0,25 |
| Reino Unido | £ 0,27 | £ 0,30 | £ 0,32 | £ 0,35 | £ 0,22 |
| Polônia | zł 1,15 | zł 1,25 | zł 1,30 | zł 1,40 | zł 0,95 |

Os valores da tabela são referências nacionais antes do fator municipal. Os demais países recebem tarifas proporcionais ao perfil salarial nacional. A cidade-base ajusta o salário mensal fixo do Nível 1 e as tarifas por quilômetro dos Níveis 2 e 3; diária internacional e categorias continuam condicionadas ao nível e à qualificação ADR.

### Fechamento mensal

O ATS continua fechando e pagando uma semana por vez. No ETS2:

1. o motorista registra viagens e ocorrências da semana operacional;
2. encerra a semana no Holerite, congelando seus trechos sem depositar salário;
3. repete o ciclo até acumular no mínimo 4 e no máximo 5 semanas;
4. gera um único holerite mensal com todas as viagens, diárias, retenções e ocorrências do período;
5. o depósito entra no saldo, o rendimento mensal da reserva é creditado e o próximo mês começa com a semana atual aberta.

Semanas operacionais encerradas não podem ser alteradas ou excluídas. O histórico mostra tanto as semanas incluídas quanto o mês de cada holerite.

### Reserva e despesas

- a reserva de emergência não faz parte das despesas mensais;
- aportes podem ser manuais ou configurados no Holerite;
- o rendimento simulado é de 3,25% ao ano, proporcional por semana no ATS e por mês no ETS2;
- despesas padrão e custos iniciais mudam conforme o país-sede e o mercado da cidade-base.

## Progressão do ETS2

- promoção para Nível 2 aos 16.000 km;
- promoção para Nível 3 aos 80.000 km;
- ADR disponível a partir do Nível 2;
- Euro Combi disponível no Nível 3;
- Driving Academy com `Truck Driving Proficiency` e `Double Trailer Handling`;
- workshop, Steam, site oficial e sugestões de mods apontam para o ETS2 (app 227300).

## Tutorial e confirmações

Ao criar uma carreira, a opção **Ver tutorial após criar a carreira** inicia um tour guiado que navega pelas telas, destaca cada recurso e oferece **Próximo**, **Voltar** e **Sair do tutorial**. O texto do ETS2 explica o país-sede e o ciclo mensal de 4–5 semanas.

Ações financeiras, destrutivas ou que fecham períodos usam a modal compartilhada de confirmação/cancelamento; não há confirmações por `alert` nativo.

## Backup tabular v12

O formato v12 deixa CSV, XLS e XLSX em uma tabela simples:

- a primeira linha contém os títulos em português;
- cada linha seguinte representa uma carreira;
- os campos obrigatórios aparecem com `*`;
- saldo inicial, saldo atual, nível, semana e reserva aceitam os padrões indicados no título;
- as colunas JSON técnicas ficam vazias no modelo para preenchimento;
- nas exportações, essas colunas preservam perfil, viagens, histórico, despesas, ocorrências, holerites e reserva;
- a tela de carreiras permite selecionar várias carreiras e exportá-las no mesmo CSV;
- a exportação CSV individual continua disponível dentro de cada carreira.

Toda importação cria IDs novos e valida todas as linhas antes de salvar. O mesmo arquivo não pode misturar ATS e ETS2. Backups v1 a v11 continuam aceitos nos formatos antigos `ATS_CAREER_BACKUP` e `ETS2_CAREER_BACKUP`.

### Histórico do v11

CSV, XLS e XLSX continuam compatíveis com versões anteriores. O formato v11 preserva tudo do v10 e acrescenta:

- versão e nome do perfil municipal da carreira;
- multiplicadores congelados de custo e salário da cidade-base;
- cidade e perfil municipal em cada holerite fechado.

O formato v10 já preservava:

- `stateCode` e `stateName` da carreira ATS;
- estado fiscal em cada holerite fechado;
- moeda USD/EUR e cotação congelada também para o ATS.

O formato v9 já preservava:

- moeda fiscal, moeda selecionada, cotação e data de referência da carreira;
- a mesma referência de conversão em cada holerite fechado.

O formato v8 já preservava:

- `countryCode`, nome do país e moeda local da carreira;
- mês atual da folha e semana inicial do período;
- lista de semanas operacionais encerradas;
- semana de referência das ocorrências pendentes;
- despesas padrão editadas e preferência de aporte automático;
- tipo do período, mês, intervalo de semanas e moeda do holerite;
- detalhamento das retenções nacionais.

Backups ETS2 antigos têm o país inferido pela cidade-base quando possível; caso contrário, migram para Alemanha. Backups ATS antigos inferem o estado pela sigla da cidade e usam Califórnia apenas quando não há informação suficiente. Toda importação cria um novo ID e nunca sobrescreve outra carreira.

## Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `src/App.jsx` | rotas, carreiras, criação e seleção de sede fiscal e moeda |
| `src/config/games.js` | configuração compartilhada de ATS e ETS2 |
| `src/config/atsStates.js` | perfis financeiros e fiscais dos 20 estados do ATS |
| `src/config/atsCurrencies.js` | dólar/euro no ATS, cotação versionada e conversão |
| `src/config/ets2Countries.js` | perfis financeiros dos 34 países do ETS2 |
| `src/config/ets2Currencies.js` | moedas do ETS2, cotações versionadas e conversão |
| `src/config/cityMarkets.js` | perfis municipais e multiplicadores de custo e salário |
| `src/components/Phase1Page.jsx` | shell da Fase 1 e registro de viagens |
| `src/components/phase1/PayslipTab.jsx` | fechamento semanal do ATS e mensal do ETS2 |
| `src/components/GuidedTutorial.jsx` | tour guiado contextual por jogo |
| `src/components/ConfirmProvider.jsx` | modal compartilhada de confirmação |
| `src/lib/phase1.js` | estado, folha, impostos, progressão e reserva |
| `src/lib/csv.js` | backup tabular v12, importação múltipla, migração legada, validação e planilhas |
| `.github/workflows/delivery-pipeline.yml` | testes, promoção, rollback e Pages |

## Fontes oficiais usadas no modelo

- [IRS — parâmetros federais de 2026](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill), [SSA — contribuições e teto de 2026](https://www.ssa.gov/news/en/cola/factsheets/2026.html), [Tax Foundation — impostos estaduais de 2026](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/) e [BLS — salários estaduais por ocupação](https://www.bls.gov/oes/tables.htm)
- [HUD — Fair Market Rents por área metropolitana](https://www.huduser.gov/portal/datasets/fmr.html) e [BLS OEWS — salários por estado, área metropolitana e área não metropolitana](https://www.bls.gov/oes/)
- [Fórum oficial da SCS — economia do ATS baseada em USD e opções USD/EUR](https://forum.scssoft.com/viewtopic.php?t=202506)
- [União Europeia — tempos de condução e descanso](https://transport.ec.europa.eu/transport-modes/road/social-provisions/driving-time-and-rest-periods_en)
- [OCDE — Taxing Wages 2026](https://www.oecd.org/en/publications/taxing-wages-2026_3a5169ef-en/full-report/overview_d93131c3.html), [Comissão Europeia — Taxes in Europe](https://ec.europa.eu/taxation_customs/tedb/), [Eurostat — salários e custos do trabalho](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Wages_and_labour_costs) e [EURES — remuneração de motoristas](https://eures.europa.eu/how-find-and-train-jobs-are-demand-2025-04-17_en)
- [Eurostat — Housing in Europe 2025](https://ec.europa.eu/eurostat/web/interactive-publications/housing-2025) e [mercado de trabalho regional](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Labour_market_statistics_at_regional_level)
- [Your Europe — contribuições sociais por país](https://europa.eu/youreurope/business/hiring-managing-staff/social-security-health/paying-contributions/index_en.htm)
- [Alemanha — previdência](https://www.deutsche-rentenversicherung.de/DRV/EN/Versicherung/versicherung_node.html), [saúde](https://www.bundesgesundheitsministerium.de/beitraege) e [parâmetros sociais 2026](https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2025/das-aendert-sich-im-neuen-jahr.html)
- [Reino Unido — Income Tax](https://www.gov.uk/income-tax-rates) e [National Insurance](https://www.gov.uk/national-insurance-rates-letters)
- [Polônia — PIT](https://www.podatki.gov.pl/en/residents/personal-income-tax-rates/) e [contribuições ZUS](https://lang.zus.pl/finances/contributions)
- [Banco Central Europeu — cotações de referência do euro](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html), [Banco da Albânia](https://www.bankofalbania.org/Markets/Official_exchange_rate/), [Banco Central da Bósnia e Herzegovina](https://www.cbbh.ba/press/ShowNews/1385), [Banco Nacional da Macedônia do Norte](https://www.nbrm.mk/kursna_lista-en.nspx), [Banco Nacional da Sérvia](https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate) e [Banco da Rússia](https://www.cbr.ru/eng/currency_base/daily/)
- [Truck Simulator Wiki — moedas de exibição e economia do ETS2](https://trucksimulator.wiki.gg/wiki/Economy)
- [site do ETS2](https://eurotrucksimulator2.com/), [Steam](https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/) e [Workshop](https://steamcommunity.com/app/227300/workshop/)

## Desenvolvimento

```bash
npm install
npm test
npm run build
```

O Vite utiliza `base: '/truck-life-simulator/'`. O GitHub Pages é publicado somente a partir de `development`; branches de recurso devem ser validadas e promovidas pelo fluxo descrito em [DEPLOYMENT.md](DEPLOYMENT.md).
