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
- Sistema visual responsivo em `src/styles.css`
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
- Serviço compartilhado da Fase 1 em `src/lib/phase1.js`

## Compatibilidade de dados

A versão React usa as mesmas chaves da versão clássica:

- `ats_careers_v1`
- `ats_active_career`
- `ats_phase1_state_<careerId>`

O React mantém `currentLevel` e `careerLevel` sincronizados para compatibilidade com versões anteriores da Fase 1, e novas viagens usam IDs numéricos compatíveis com a tela clássica.

Isso permite abrir a mesma carreira na versão React ou clássica sem criar uma cópia dos dados.

## Ponte temporária

Neste ponto, a principal dependência funcional da interface clássica é o conjunto de ferramentas CSV (importação, exportação e tutorial/modelo). Os arquivos clássicos continuam preservados até a validação funcional completa da versão React.

## Próximos módulos

1. Migrar autocomplete/lista de cidades para um componente reutilizável.
2. Migrar importação/exportação e tutorial CSV.
3. Fazer revisão funcional e visual completa da Fase 1 em desktop e mobile.
4. Validar compatibilidade total com dados antigos do localStorage.
5. Preparar build/deploy da branch React para teste separado da `master`.
6. Remover arquivos legados apenas depois da validação completa.

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
