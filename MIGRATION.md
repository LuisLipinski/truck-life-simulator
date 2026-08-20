# Migração React e estado atual

Atualizado em: **20/08/2026**

Branch ativa: **`react-migration`**

Aplicação publicada: **https://luislipinski.github.io/truck-life-simulator/**

## 1. Visão geral

O **Truck Life Simulator** é um companion de carreira realista para o American Truck Simulator. A aplicação mantém uma economia pessoal própria, separada da economia do ATS, e permite acompanhar a vida profissional e financeira de um motorista nos Estados Unidos.

O fluxo atual começa com um brasileiro chegando legalmente aos Estados Unidos, sem caminhão próprio, iniciando como motorista empregado. O usuário cria um ou mais personagens, registra viagens, fecha holerites, paga despesas, mantém uma reserva de emergência, registra ocorrências e evolui pelos três níveis da Fase 1.

Princípios atuais:

- o valor dos fretes mostrado pelo ATS é ignorado;
- a economia pessoal é calculada pelo Truck Life Simulator;
- cada carreira possui progresso e finanças independentes;
- todos os dados ficam salvos localmente no navegador;
- backups são necessários para transportar a carreira entre navegadores ou dispositivos;
- o aplicativo não possui backend, conta online ou sincronização em nuvem;
- limpar os dados do navegador pode apagar carreiras que não tenham backup.

## 2. Stack e arquitetura

- React `^19.2.8`;
- React DOM `^19.2.8`;
- Vite `^8.2.0`;
- JavaScript com módulos ES;
- SheetJS/XLSX `^0.18.5` para leitura e geração de planilhas;
- Vitest `^4.0.0`;
- JSDOM para testes de integração de componentes;
- `localStorage` para persistência;
- roteamento por hash, sem biblioteca externa de rotas;
- GitHub Actions para testes, build e publicação;
- GitHub Pages para hospedagem estática.

Versões de Node aceitas pelo projeto:

- Node `^20.19.0`; ou
- Node `>=22.12.0`.

### Estrutura principal

| Caminho | Responsabilidade |
| --- | --- |
| `src/App.jsx` | Home, carreiras, criação de carreira, seleção de fases e rotas da aplicação |
| `src/components/Phase1Page.jsx` | Shell da Fase 1, navegação, visão geral e registro de viagens |
| `src/components/phase1/` | Abas de finanças, holerite, ocorrências, qualificações, Academy, regras, mods, histórico e gráficos |
| `src/lib/storage.js` | Leitura e gravação das carreiras no `localStorage` |
| `src/lib/phase1.js` | Estado, cálculos financeiros, progressão, milhas, per diem e Route Overrun |
| `src/lib/csv.js` | Backup v7, CSV, XLS, XLSX, validação, importação e exportação |
| `src/data/atsCities.js` | Cidades disponíveis no autocomplete do ATS |
| `src/components/MobileHelp.jsx` | Exibição dos textos dos ícones de informação no mobile |
| `.github/workflows/react-migration-ci.yml` | Testes, build e deploy no GitHub Pages |

## 3. Branches e publicação

### `master`

Continua com a versão clássica baseada em HTML, CSS e JavaScript. É também a branch padrão do repositório.

### `node-migration`

Branch intermediária criada durante a discussão inicial sobre a migração. Ela permanece no mesmo ponto da versão clássica e não é a versão ativa.

### `react-migration`

Contém a aplicação React atual e é a origem do deploy público no GitHub Pages.

O workflow é executado em todo `push` para `react-migration` ou manualmente por `workflow_dispatch` e realiza:

1. checkout da branch;
2. configuração do Node 22;
3. instalação das dependências;
4. execução dos testes unitários e de integração;
5. configuração do GitHub Pages;
6. build de produção com Vite;
7. upload da pasta `dist`;
8. deploy no GitHub Pages.

O fluxo normal da versão React não depende de `ats.html`, `fase1.html` ou das páginas clássicas. Esses arquivos continuam na branch apenas como fallback temporário enquanto a migração não for incorporada à `master`.

## 4. Rotas React

| Rota | Tela |
| --- | --- |
| `#/` | Seleção de jogo |
| `#/ats` | Lista de carreiras do ATS |
| `#/new` | Criação de nova carreira |
| `#/phases?career=<id>` | Seleção das fases da carreira |
| `#/phase1?career=<id>` | Fase 1 da carreira selecionada |

O roteamento por hash permite abrir e atualizar a aplicação no GitHub Pages sem depender de regras de rewrite do servidor.

## 5. Persistência e compatibilidade

A versão React utiliza estas chaves:

- `ats_careers_v1`: lista de carreiras;
- `ats_active_career`: ID da carreira ativa;
- `ats_phase1_state_<careerId>`: estado completo da Fase 1 de cada carreira.

O estado da Fase 1 inclui, entre outros:

- saldo disponível;
- reserva de emergência;
- despesas padrão;
- despesas personalizadas;
- viagens;
- semana atual;
- semanas fechadas;
- histórico financeiro;
- infrações e acidentes;
- nível atual;
- progresso da Driving Academy;
- qualificação HazMat;
- configuração de aporte automático à reserva.

`currentLevel` e `careerLevel` permanecem sincronizados para compatibilidade com versões anteriores. Viagens novas usam IDs numéricos, mantendo compatibilidade com backups antigos.

Na ausência do estado específico de uma carreira, o carregador ainda tenta ler as antigas chaves `ats_phase1_tabs_v3` e `ats_phase1_tabs_v2`.

## 6. Home e seleção de jogos

A Home apresenta:

- American Truck Simulator como disponível;
- Euro Truck Simulator 2 como futuro;
- aviso de que os dados permanecem salvos localmente no navegador.

O card do ATS abre a lista de carreiras. O card do ETS2 permanece desabilitado e marcado como **Em breve**.

## 7. Lista de carreiras

A tela **Suas carreiras** permite:

- criar uma nova carreira;
- abrir uma carreira clicando no card inteiro;
- abrir o card também pelo teclado com `Enter` ou espaço;
- excluir uma carreira usando o botão compacto de lixeira;
- importar backups CSV, XLS ou XLSX;
- abrir o tutorial de importação;
- baixar modelos CSV, XLS e XLSX.

Cada card exibe:

- nível atual;
- nome do motorista;
- cidade base;
- empresa;
- saldo inicial;
- biografia.

## 8. Criação da carreira

Campos obrigatórios:

- nome do motorista;
- cidade inicial;
- empresa.

Campos adicionais:

- dinheiro ao chegar aos Estados Unidos;
- custos iniciais editáveis;
- biografia.

### Valores iniciais padrão

| Item | Valor |
| --- | ---: |
| Dinheiro ao chegar aos EUA | US$ 5.000,00 |
| Primeiro mês de aluguel | US$ 1.650,00 |
| Depósito caução | US$ 1.650,00 |
| Licença/CDL inicial | US$ 100,00 |
| Mercado inicial | US$ 250,00 |
| Itens básicos da casa | US$ 350,00 |
| Celular/chip | US$ 60,00 |
| Internet/instalação | US$ 75,00 |
| Transporte público inicial | US$ 72,00 |
| Total dos custos iniciais | US$ 4.207,00 |
| Saldo inicial restante | **US$ 793,00** |

Os custos podem ser editados, restaurados para os valores padrão ou zerados. Se os custos forem maiores que o dinheiro disponível, a aplicação solicita confirmação antes de criar uma carreira com saldo negativo.

### Cidades

O componente de cidade:

- permite busca por texto;
- ignora acentos e diferenças entre maiúsculas e minúsculas;
- aceita navegação por teclado;
- lista cidades dos estados disponíveis na base atual do ATS, incluindo Illinois e Louisiana;
- permite adicionar manualmente cidades provenientes de mods.

## 9. Fases da carreira

### Fase 1 — Motorista empregado

- Company Driver;
- sem caminhão próprio;
- contém Níveis 1, 2 e 3;
- é a fase totalmente implementada.

### Fase 2 — Em breve

- primeiro caminhão próprio;
- operação como owner-operator.

### Fase 3 — Em breve

- reservada para uma etapa futura da simulação.

## 10. Navegação da Fase 1

### Abas principais

- Visão Geral;
- Diário de Bordo;
- Financeiro;
- Regras;
- Mods.

### Diário de Bordo

- Registro de Viagens;
- Infrações e Acidentes;
- Qualificações;
- Driving Academy.

### Financeiro

- Saldo e Despesas;
- Holerite;
- Histórico.

Todas as páginas possuem uma introdução explicando para que servem. Os ícones `i` exibem dicas adicionais:

- no desktop, por tooltip;
- no mobile, por uma janela de ajuda na parte inferior da tela.

## 11. Visão Geral

O cabeçalho da Fase 1 mostra:

- motorista, cidade e empresa;
- saldo disponível;
- nível atual;
- progresso total de milhas;
- semana atual;
- milhas registradas na semana.

A Visão Geral também mostra:

- despesas mensais;
- estado do resumo semanal;
- dados do perfil;
- banner de promoção quando os requisitos são atingidos;
- atalhos para Financeiro, Holerite e Qualificações;
- exportação da carreira em CSV.

## 12. Registro de Viagens

Cada trecho registra:

- semana;
- data e horário de saída;
- data e horário de chegada;
- cidade de origem;
- filial ou empresa de origem;
- cidade de destino;
- empresa de destino;
- tipo Loaded ou Deadhead;
- categoria de pagamento;
- carga;
- milhas;
- data de criação do registro.

Validações atuais:

- saída e chegada são obrigatórias;
- a chegada deve ser posterior à saída;
- origem e destino são obrigatórios;
- as milhas devem ser maiores que zero;
- Deadhead remove a carga e força a categoria `deadhead`;
- categorias bloqueadas pelo nível ou qualificação não podem ser selecionadas.

Loaded e Deadhead contam para a progressão da carreira.

Viagens de semanas já fechadas pelo holerite não podem ser excluídas. Viagens da semana atual podem ser excluídas após confirmação.

O Diário de Bordo possui um gráfico de barras com as milhas das últimas oito semanas que contenham viagens.

## 13. Regras operacionais e pagamento

### Resumo por nível

| Nível | Função | Operação | Pagamento principal | Per diem |
| --- | --- | --- | --- | --- |
| 1 | Trainee / Local Driver | Day cab, local/regional, retorno à base como padrão | US$ 850 bruto/semana + Route Overrun | Não se aplica |
| 2 | Company Driver / OTR | Sleeper cab, interestadual e multi-day | Pagamento por milha | US$ 80/dia qualificável |
| 3 | Experienced Driver / Doubles | Operação avançada com Doubles | Pagamento por milha e categorias avançadas | US$ 80/dia qualificável |

### Tarifas por milha

| Categoria | Tarifa |
| --- | ---: |
| Loaded normal | US$ 0,60/mi |
| Loaded HazMat | US$ 0,63/mi |
| Loaded Doubles/bitrem | US$ 0,64/mi |
| Loaded HazMat + Doubles | US$ 0,67/mi |
| Deadhead | US$ 0,50/mi |

Regras de disponibilidade:

- Nível 1 registra milhas apenas para progressão e recebe salário semanal;
- Nível 2 libera pagamento por milha e viagens OTR;
- HazMat exige Nível 2 ou superior e qualificação ativa;
- Doubles exige Nível 3;
- HazMat + Doubles exige Nível 3 e HazMat ativo;
- Deadhead permanece em US$ 0,50/mi em todos os níveis pagos por milha.

### Route Overrun do Nível 1

O Route Overrun é calculado automaticamente a partir dos horários das viagens:

1. o sistema divide viagens que atravessam a meia-noite entre os dias correspondentes;
2. soma todos os minutos trabalhados em cada dia;
3. considera 8 horas por dia como jornada normal;
4. paga somente o tempo excedente;
5. utiliza US$ 21,25/h como tarifa padrão;
6. permite editar a tarifa por hora no Holerite;
7. exibe o detalhamento diário de horas normais e excedentes.

### Per diem

- disponível somente a partir do Nível 2;
- tarifa padrão de US$ 80 por dia;
- exige uma viagem que atravesse ao menos uma mudança de data;
- conta os dias de calendário qualificáveis;
- evita contar a mesma data duas vezes quando há mais de uma viagem no mesmo dia.

### Jornada e roleplay

Nível 1:

- referência de segunda a sexta, 07:00–15:30;
- 30 minutos de refeição;
- day cab;
- operação local ou regional;
- retorno à base no mesmo dia como padrão.

Nível 2 e Nível 3:

- até aproximadamente 11 horas dirigindo;
- janela de aproximadamente 14 horas;
- descanso de 10 horas;
- viagens longas podem utilizar sleeper cab e pernoite.

O aplicativo registra horários e calcula Route Overrun e per diem, mas o cumprimento completo do HOS permanece como regra de roleplay.

### Origem, retorno e Deadhead no Nível 1

- novas cargas devem começar em uma filial da empregadora;
- se existir carga de retorno em uma filial do destino, ela pode ser utilizada;
- sem carga de retorno, o motorista retorna vazio;
- também é permitido fazer Deadhead regional até uma filial próxima para procurar carga.

### Custos da empresa

Como motorista empregado, diesel, manutenção, pneus, seguro comercial, licenciamento, reparos e pedágios autorizados são custos da transportadora e não saem do saldo pessoal.

## 14. Progressão, Academy e qualificações

### Nível 1 para Nível 2

Requisitos:

- 10.000 milhas totais;
- conclusão do módulo **Truck Driving Proficiency** no ATS Driving Academy;
- confirmação manual da conclusão;
- pagamento de US$ 300,00 com o saldo pessoal.

Ao concluir, a carreira passa para **Company Driver / OTR**.

### Qualificação HazMat

- opcional;
- disponível a partir do Nível 2;
- custo de US$ 144,25;
- libera Loaded HazMat a US$ 0,63/mi;
- no Nível 3, também libera HazMat + Doubles a US$ 0,67/mi.

### Nível 2 para Nível 3

Requisitos:

- 50.000 milhas totais;
- conclusão do módulo **Double Trailer Handling**;
- confirmação manual da conclusão;
- pagamento de US$ 59,00 com o saldo pessoal.

Ao concluir, a carreira passa para **Experienced Driver / Doubles**.

### Marcos de promoção

Quando uma nova viagem faz a carreira cruzar 10.000 ou 50.000 milhas, a aplicação exibe uma tela comemorativa com:

- nível liberado;
- meta alcançada;
- treinamento necessário;
- atalho para Qualificações;
- atalho para o guia da Driving Academy.

O modal não reaparece se o motorista já estava acima da meta antes da viagem recém-registrada.

### Guia da Driving Academy

O guia explica:

- como abrir o Driving Academy no ATS;
- qual módulo corresponde a cada promoção;
- como confirmar o treinamento na aplicação;
- links para anúncios oficiais da SCS;
- Truck Driving Proficiency disponível no ATS desde a versão 1.55;
- Double Trailer Handling disponível desde a versão 1.58.

## 15. Saldo, despesas e reserva de emergência

### Despesas mensais padrão

| Despesa | Valor |
| --- | ---: |
| Aluguel | US$ 1.650,00 |
| Eletricidade | US$ 100,00 |
| Água/lixo | US$ 60,00 |
| Internet | US$ 65,00 |
| Celular | US$ 55,00 |
| Mercado | US$ 400,00 |
| Alimentação fora | US$ 150,00 |
| Saúde/parcela pessoal | US$ 180,00 |
| Ônibus/metrô | US$ 72,00 |
| Higiene/casa | US$ 80,00 |
| Lazer | US$ 150,00 |
| Total de despesas | **US$ 2.962,00** |
| Aporte mensal padrão à reserva | US$ 200,00 |
| Saída mensal total da conta | **US$ 3.162,00** |

O aporte à reserva não é tratado como dinheiro perdido. Ele sai do saldo disponível e entra no patrimônio reservado.

### Recursos financeiros

- ajuste manual do saldo;
- valores monetários limitados a duas casas decimais;
- aceitação de vírgula ou ponto nos campos financeiros da interface;
- despesas padrão editáveis;
- despesas personalizadas;
- opção de incluir ou retirar uma despesa personalizada do desconto mensal;
- aplicação conjunta das despesas mensais;
- histórico de todas as movimentações.

### Reserva de emergência

- fica separada do saldo disponível;
- integra o patrimônio pessoal total;
- permite aporte manual;
- permite resgate com motivo obrigatório;
- permite aporte automático no fechamento semanal;
- recebe o aporte mensal configurado quando as despesas são aplicadas;
- rende 3,25% ao ano na simulação;
- o rendimento semanal é calculado como `saldo da reserva × 3,25% ÷ 52`;
- o rendimento é creditado ao fechar cada holerite;
- aporte, resgate e rendimento ficam registrados no Histórico.

## 16. Holerite e fechamento semanal

### Nível 1

O salário bruto é:

`salário semanal configurado + Route Overrun calculado`

O salário semanal padrão é US$ 850,00.

### Nível 2 e Nível 3

O salário bruto é a soma de:

`milhas da categoria × tarifa da categoria`

O per diem é calculado separadamente e adicionado após o salário líquido.

### Retenções estimadas

| Retenção | Regra simplificada da simulação |
| --- | --- |
| Social Security | 6,2% do bruto |
| Medicare | 1,45% do bruto |
| California SDI | 1,3% do bruto |
| Federal | fórmula progressiva simplificada usada pelo aplicativo |
| California Income Tax | 5,27% sobre a parcela acima de US$ 500 |

Fórmula federal simplificada:

- até US$ 260: US$ 0;
- acima de US$ 260 e até US$ 1.000: 10% sobre o valor acima de US$ 260;
- acima de US$ 1.000: US$ 74 + 12% sobre o valor acima de US$ 1.000.

Esses valores servem somente para o roleplay financeiro e não representam cálculo fiscal oficial.

O desconto semanal padrão de benefícios é US$ 36,00 e pode ser editado.

### Ordem do cálculo

1. calcular salário bruto;
2. calcular impostos estimados;
3. descontar benefícios;
4. obter salário líquido;
5. somar per diem;
6. descontar ocorrências pendentes até o limite disponível;
7. obter o depósito final;
8. creditar o depósito no saldo;
9. transferir eventual aporte automático à reserva;
10. creditar o rendimento semanal da reserva;
11. arquivar a semana;
12. iniciar a próxima semana.

Ao fechar a semana:

- o holerite é salvo em `closedWeeks`;
- o depósito entra no saldo;
- infrações parcialmente pagas mantêm o restante pendente;
- viagens daquela semana ficam protegidas contra exclusão;
- o número da semana é incrementado;
- o Histórico recebe as movimentações correspondentes.

## 17. Infrações e acidentes

Tipos disponíveis:

- Infração;
- Acidente;
- Pedágio/cobrança;
- Outra ocorrência.

Cada ocorrência pode registrar:

- valor;
- data;
- hora;
- viagem relacionada ou rota manual;
- descrição;
- método de cobrança;
- status;
- saldo pendente.

Métodos de cobrança:

- **Saldo imediato:** desconta o valor na hora e registra no Histórico;
- **Próximo holerite:** mantém o valor pendente e desconta nos fechamentos semanais.

Se um holerite não comportar toda a cobrança, o restante continua pendente para as próximas semanas.

Proteções:

- uma ocorrência já descontada diretamente do saldo não pode ser excluída;
- uma ocorrência parcialmente descontada em holerite não pode ser excluída;
- uma ocorrência ainda totalmente pendente pode ser excluída após confirmação.

As ocorrências não bloqueiam promoções, mas afetam o saldo ou o pagamento semanal.

## 18. Histórico e gráficos

O Histórico reúne:

- salários;
- despesas mensais;
- ajustes de saldo;
- aportes, resgates e rendimentos da reserva;
- qualificações e promoções;
- ocorrências pagas;
- semanas fechadas.

Gráficos atuais:

- evolução do saldo nas últimas movimentações com saldo registrado;
- depósitos das últimas semanas fechadas;
- milhas das últimas semanas com viagens.

O gráfico de linha possui pontos interativos com tooltip. Todos os gráficos possuem textos alternativos e estados vazios quando ainda não existem dados suficientes.

## 19. Backups e planilhas

### Versão atual

O formato atual é **`ATS_CAREER_BACKUP` v7**.

Tipos de linha do backup:

- `CAREER`;
- `SETUP_COST`;
- `STATE`;
- `TRIP`;
- `HISTORY`;
- `EXPENSE`;
- `INCIDENT`;
- `CLOSED_WEEK`.

O backup pode guardar:

- perfil;
- custos iniciais;
- saldo;
- reserva de emergência;
- nível;
- semana atual;
- Academy;
- HazMat;
- viagens;
- histórico financeiro;
- despesas personalizadas;
- ocorrências;
- semanas fechadas.

### Formatos

| Operação | CSV | XLS | XLSX |
| --- | ---: | ---: | ---: |
| Importar carreira | Sim | Sim | Sim |
| Baixar modelo | Sim | Sim | Sim |
| Exportar pela interface atual | Sim | Não | Não |

A biblioteca possui suporte interno para exportar Excel, mas a interface atual da carreira expõe apenas o botão de exportação CSV.

### Validação

- o arquivo precisa começar com `ATS_CAREER_BACKUP`;
- a versão deve ser inteira e maior ou igual a 1;
- campos obrigatórios são validados antes da importação;
- níveis aceitos vão de 1 a 3;
- semanas e IDs numéricos precisam ser inteiros válidos;
- milhas precisam ser maiores que zero;
- valores financeiros inválidos são recusados;
- erros informam tipo, campo e linha do problema;
- o CSV exige ponto decimal e não aceita separador de milhar ou símbolo de moeda;
- XLS/XLSX devem utilizar células numéricas normais.

Exemplos válidos no CSV:

- `850`;
- `1602.63`;
- `0.50`;
- `21.25`.

Exemplos inválidos no CSV:

- `1602,63`;
- `1,602.63`;
- `1.602,63`;
- `$850`.

Backups antigos são normalizados para a estrutura atual. Toda importação cria um novo ID de carreira para evitar sobrescrever uma carreira existente.

## 20. Regras de ATS Skills

Sugestão de distribuição no jogo:

- Nível 1: Fuel Economy e, opcionalmente, High-Value;
- Nível 2: Long Distance, Fragile, Just-in-Time e HazMat somente após qualificação;
- Nível 3: progressão avançada e Doubles.

Essa distribuição é uma recomendação de roleplay e não bloqueia funcionalidades do aplicativo.

## 21. Mods sugeridos

Ordem recomendada no Mod Manager:

1. [Sound Fixes Pack](https://steamcommunity.com/sharedfiles/filedetails/?id=830663438);
2. [Cummins Signature Gen II Sounds](https://steamcommunity.com/sharedfiles/filedetails/?id=3536394213);
3. [Real Companies, Gas Stations & Billboards](https://steamcommunity.com/sharedfiles/filedetails/?id=2316796205);
4. [Real Traffic Density ATS](https://steamcommunity.com/sharedfiles/filedetails/?id=1213282672);
5. [Realistic AI Traffic Pack](https://steamcommunity.com/sharedfiles/filedetails/?id=3713185881);
6. [Better Raindrops](https://steamcommunity.com/sharedfiles/filedetails/?id=2980935675).

Os mods são opcionais e não fazem parte da lógica financeira. Mods de economia que alteram pagamento, salários ou XP devem ser evitados para não gerar conflito com a economia própria do Truck Life Simulator.

Antes de mudanças grandes em mods de mapas ou cidades, é recomendado fazer backup do save do ATS e exportar o backup do Truck Life Simulator.

## 22. Interface, responsividade e acessibilidade

Recursos implementados:

- layout responsivo para desktop e mobile;
- navegação principal e subtabs;
- cards clicáveis;
- navegação por teclado na lista de carreiras;
- autocomplete acessível de cidades;
- descrições de todas as abas;
- ícones de informação em formulários, métricas, regras e cálculos;
- tooltips no desktop;
- painel inferior de ajuda no mobile;
- notificações compartilhadas de sucesso, erro e informação;
- confirmações antes de ações financeiras ou destrutivas;
- tabelas responsivas;
- estados vazios;
- gráficos responsivos e com descrição acessível;
- modal de marco de promoção.

## 23. Testes automatizados

Estado validado em 20/08/2026:

- **12 arquivos de teste aprovados**;
- **59 testes aprovados**;
- nenhum teste falhando.

Coberturas existentes:

- armazenamento e compatibilidade de estado;
- cálculos de milhas;
- categorias de pagamento;
- per diem;
- Route Overrun diário e tarifa editável;
- impostos estimados;
- cobranças de ocorrências;
- limites de promoção;
- reserva de emergência;
- aporte automático do holerite;
- valores financeiros com duas casas decimais;
- vírgula e ponto nos campos financeiros da interface;
- backup CSV v7;
- importação CSV, XLS e XLSX;
- validação de campos obrigatórios e numéricos;
- cards de carreira e exclusão isolada;
- modal de marcos de promoção;
- notificações;
- gráficos e estados vazios;
- agregação de milhas por semana;
- tooltips dos gráficos.

## 24. Desenvolvimento local

Instalação:

```bash
npm install
```

Servidor de desenvolvimento:

```bash
npm run dev
```

Testes:

```bash
npm test
```

Build de produção:

```bash
npm run build
```

Prévia do build:

```bash
npm run preview
```

O Vite utiliza `base: '/truck-life-simulator/'`, necessário para carregar os assets corretamente no GitHub Pages.

## 25. Validação atual do build

Validado em 20/08/2026:

- dependências instaladas com sucesso;
- 59 testes executados com sucesso;
- 40 módulos transformados no build;
- build de produção concluído;
- bundle publicado no GitHub Pages corresponde ao build da branch ativa.

Tamanhos observados no build validado:

- HTML: aproximadamente 0,62 kB;
- CSS: aproximadamente 47,63 kB, 9,69 kB gzip;
- JavaScript: aproximadamente 741,53 kB, 235,06 kB gzip.

O build apresenta apenas um aviso não bloqueante por existir um chunk JavaScript maior que 500 kB. Uma otimização futura pode carregar recursos pesados, especialmente planilhas, sob demanda.

## 26. Limitações conhecidas

- os dados permanecem somente no navegador e não existe sincronização entre dispositivos;
- salário semanal do Nível 1, tarifa de Route Overrun, benefícios e tarifa de per diem podem ser editados no Holerite, mas ainda não são preferências persistidas da carreira;
- o Route Overrun usa o tempo decorrido entre saída e chegada e não possui campo específico para descontar refeição, pausa ou outro período sem trabalho;
- o aplicativo apresenta regras de HOS como roleplay, mas ainda não bloqueia automaticamente uma viagem que ultrapasse os limites;
- o backup v7 preserva despesas personalizadas, mas ainda não serializa as alterações feitas na lista de despesas mensais padrão nem a preferência de aporte automático semanal;
- despesas personalizadas criadas pela interface usam IDs no formato `exp_<timestamp>`, enquanto a validação atual do importador espera um ID numérico; isso deve ser corrigido antes de depender do reimport de um backup que contenha esses gastos;
- excluir uma carreira remove seu cadastro e a seleção ativa, mas a chave `ats_phase1_state_<careerId>` correspondente ainda pode permanecer órfã no `localStorage`;
- a exportação XLS/XLSX existe na biblioteca, mas ainda não está conectada a um botão da interface;
- o bundle JavaScript ainda é entregue em um chunk principal maior que 500 kB;
- os testes automatizados atuais são unitários e de integração com JSDOM; ainda não existe uma suíte end-to-end em navegador real.

## 27. Próximos passos reais

1. realizar regressão funcional manual completa no navegador;
2. validar criação, exclusão e troca entre várias carreiras;
3. validar viagens Loaded e Deadhead nos três níveis;
4. validar promoções com dados reais de carreira;
5. validar despesas, reserva, ocorrências e holerites em várias semanas;
6. testar backups antigos reais em CSV;
7. testar arquivos XLS e XLSX reais criados no Excel mobile e desktop;
8. revisar visualmente aparelhos mobile com larguras diferentes;
9. corrigir a compatibilidade dos IDs de despesas personalizadas no backup;
10. incluir despesas padrão editadas e configuração de aporte automático no próximo formato de backup;
11. remover as chaves de estado órfãs ao excluir uma carreira;
12. considerar divisão do bundle e carregamento sob demanda do módulo XLSX;
13. considerar versionar o `package-lock.json` e trocar o CI para `npm ci`;
14. decidir quando incorporar a `react-migration` à `master`;
15. remover os arquivos clássicos somente depois da validação e do merge.

## 28. Status da migração

A migração funcional para React está concluída para o fluxo atualmente existente da Fase 1. A versão React já cria e gerencia carreiras, registra viagens, calcula pagamentos, controla finanças, processa ocorrências, aplica progressões, mantém backups e está publicada no GitHub Pages.

O trabalho restante é principalmente de validação funcional e visual, otimização, consolidação da branch e planejamento das futuras Fases 2 e 3.
