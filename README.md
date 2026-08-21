# Truck Life Simulator

Companion de carreira para American Truck Simulator e Euro Truck Simulator 2. Cada jogo mantém carreiras, estado financeiro, unidades, qualificações, backups, links e regras próprios.

## Jogos e rotas

| Item | ATS | ETS2 |
| --- | --- | --- |
| Entrada | `#/ats` | `#/ets2` |
| Distância | milhas (`mi`) | quilômetros (`km`) |
| Folha | semanal | mensal |
| Moeda | USD | escolhida pelo usuário; país fiscal separado |
| Carga perigosa | HazMat | ADR |
| Combinação avançada | Doubles | Euro Combi |
| Backup | `ATS_CAREER_BACKUP` | `ETS2_CAREER_BACKUP` |

As chaves de `localStorage` de ATS e ETS2 são separadas. A importação também recusa arquivos do jogo errado.

## Modelo financeiro do ETS2

O ETS2 usa um modelo em duas camadas:

- regras operacionais comuns da Europa para jornada, pausas e descanso;
- salário, custo de vida, retenções e taxas definidos pelo país-sede da carreira, na moeda fiscal local;
- moeda de exibição e lançamentos escolhida pelo usuário.

O país-sede é escolhido antes da cidade-base. Ele não muda quando o motorista cruza uma fronteira: uma carreira sediada na Alemanha continua com folha alemã durante viagens pelo restante da Europa. A moeda da carreira é independente: Londres pode usar regras britânicas em GBP e exibir todos os valores em EUR.

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

| País-sede | Moeda fiscal | Salário mensal Nível 1 na origem | Cidade-base | Retenções estimadas |
| --- | --- | ---: | --- | --- |
| 🇩🇪 Alemanha (`DE`) | EUR | € 2.800 | somente cidades alemãs | renda, previdência, saúde, desemprego e cuidados |
| 🇬🇧 Reino Unido (`GB`) | GBP | £ 2.600 | somente cidades britânicas | Income Tax e National Insurance |
| 🇵🇱 Polônia (`PL`) | PLN | zł 10.000 | somente cidades polonesas | PIT, aposentadoria, invalidez, doença e saúde |

Os valores são parâmetros simplificados de roleplay para 2026/27, não uma folha oficial nem orientação fiscal. Condições pessoais reais — classe fiscal, região, família, benefícios, contrato e deduções — podem alterar o resultado.

### Tarifas por quilômetro

| País | Padrão | ADR | Euro Combi | ADR + Euro Combi | Vazio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Alemanha | € 0,30 | € 0,33 | € 0,35 | € 0,38 | € 0,25 |
| Reino Unido | £ 0,27 | £ 0,30 | £ 0,32 | £ 0,35 | £ 0,22 |
| Polônia | zł 1,15 | zł 1,25 | zł 1,30 | zł 1,40 | zł 0,95 |

Nível 1 recebe salário mensal fixo e usa os quilômetros apenas para progressão. Níveis 2 e 3 recebem por quilômetro, com diária internacional e categorias condicionadas ao nível e à qualificação ADR.

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
- despesas padrão e custos iniciais também mudam conforme o país-sede.

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

## Backup v9

CSV, XLS e XLSX continuam compatíveis com versões anteriores. O formato v9 preserva tudo do v8 e acrescenta:

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

Backups ETS2 antigos têm o país inferido pela cidade-base quando possível; caso contrário, migram para Alemanha. Toda importação cria um novo ID e nunca sobrescreve outra carreira.

## Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `src/App.jsx` | rotas, carreiras, criação e seleção de país-sede e moeda |
| `src/config/games.js` | configuração compartilhada de ATS e ETS2 |
| `src/config/ets2Countries.js` | perfis financeiros de Alemanha, Reino Unido e Polônia |
| `src/config/ets2Currencies.js` | moedas do ETS2, cotações versionadas e conversão |
| `src/components/Phase1Page.jsx` | shell da Fase 1 e registro de viagens |
| `src/components/phase1/PayslipTab.jsx` | fechamento semanal do ATS e mensal do ETS2 |
| `src/components/GuidedTutorial.jsx` | tour guiado contextual por jogo |
| `src/components/ConfirmProvider.jsx` | modal compartilhada de confirmação |
| `src/lib/phase1.js` | estado, folha, impostos, progressão e reserva |
| `src/lib/csv.js` | backup v9, migração, validação e planilhas |
| `.github/workflows/delivery-pipeline.yml` | testes, promoção, rollback e Pages |

## Fontes oficiais usadas no modelo

- [União Europeia — tempos de condução e descanso](https://transport.ec.europa.eu/transport-modes/road/social-provisions/driving-time-and-rest-periods_en)
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
