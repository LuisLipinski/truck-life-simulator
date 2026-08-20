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
- Banner de promoção Nível 2 / Nível 3
- Serviço compartilhado da Fase 1 em `src/lib/phase1.js`

## Compatibilidade de dados

A versão React usa as mesmas chaves da versão clássica:

- `ats_careers_v1`
- `ats_active_career`
- `ats_phase1_state_<careerId>`

O React também mantém `currentLevel` e `careerLevel` sincronizados para compatibilidade com versões anteriores da Fase 1, e novas viagens voltaram a usar IDs numéricos compatíveis com a tela clássica.

Isso permite abrir a mesma carreira na versão React ou clássica sem criar uma cópia dos dados.

## Ponte temporária

Regras, Mods sugeridos, Histórico completo e ferramentas CSV ainda usam os módulos clássicos durante a transição.

Os arquivos clássicos não devem ser removidos até a validação funcional completa da versão React.

## Próximos módulos

1. Migrar autocomplete/lista de cidades para um componente reutilizável.
2. Migrar promoções e HazMat totalmente para controles React.
3. Migrar Regras, Mods, Histórico e glossário.
4. Migrar importação/exportação e tutorial CSV.
5. Fazer revisão funcional e visual da Fase 1 em desktop e mobile.
6. Validar compatibilidade total com dados antigos do localStorage.
7. Remover arquivos legados apenas depois da validação completa.

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
