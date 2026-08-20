# Migração React

Branch: `react-migration`

## Stack

- React
- Vite
- JavaScript
- localStorage (mantido nesta etapa)

## Já migrado

- Home / seleção de jogo
- Lista de carreiras ATS
- Criação de nova carreira
- Seleção de fases
- Serviço central de leitura e gravação das carreiras
- Sistema visual responsivo
- Autocomplete reutilizável de cidades ATS
- Inclusão manual de cidades de mods
- Shell da Fase 1 em React
- Abas React da Fase 1
- Visão Geral da Fase 1
- Progresso / registro de viagens
- Resumo de milhas por semana e carreira
- Cálculo de pagamento por categoria de milhas para Nível 2/3
- Cálculo de dias qualificáveis de per diem
- Saldo e Despesas
- Gastos personalizados e aplicação de despesas mensais
- Holerite e fechamento semanal
- Estimativa de impostos, benefícios e per diem
- Desconto de ocorrências pendentes no holerite
- Histórico de semanas fechadas
- Infrações e Acidentes
- Cobrança imediata no saldo ou pendente no holerite
- Promoções Nível 2 / Nível 3 com confirmação de Academy/treinamento
- Qualificação HazMat e débito automático do custo
- Regras da Fase 1
- Mods sugeridos
- Histórico financeiro e de semanas fechadas
- Importação de carreira CSV em React
- Exportação de carreira CSV em React
- Download do modelo CSV v6 em React
- Ajuda/tutorial básico do CSV em React
- Normalização de backups antigos para a chave atual de estado
- Serviço compartilhado da Fase 1 em `src/lib/phase1.js`

## Compatibilidade de dados

A versão React usa as chaves atuais:

- `ats_careers_v1`
- `ats_active_career`
- `ats_phase1_state_<careerId>`

O React mantém `currentLevel` e `careerLevel` sincronizados para compatibilidade com versões anteriores da Fase 1, e novas viagens usam IDs numéricos compatíveis com dados antigos.

O importador CSV aceita versões anteriores do backup e normaliza a carreira importada para a estrutura atual, criando um novo ID para evitar sobrescrever uma carreira existente.

## Estado atual

O fluxo normal do aplicativo React já não depende de `ats.html` ou `fase1.html`. Os arquivos clássicos permanecem no repositório apenas como fallback de segurança enquanto a nova versão é testada.

## Próximas etapas

1. Rodar `npm install` e `npm run build` em um ambiente com acesso à internet.
2. Fazer revisão funcional completa: criar carreira, registrar viagens, promoções, despesas, ocorrências, holerite e CSV.
3. Fazer revisão visual em desktop e mobile.
4. Validar importação de backups CSV antigos reais.
5. Preparar uma publicação de teste da `react-migration` separada da `master`.
6. Só depois da validação, decidir quando substituir a versão clássica e remover arquivos legados.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Observação sobre validação neste ambiente

A tentativa de clonar a branch e executar o build aqui falhou porque o ambiente de execução não conseguiu resolver `github.com`. Portanto, o build ainda precisa ser executado em um ambiente com acesso de rede antes de qualquer merge na `master`.
