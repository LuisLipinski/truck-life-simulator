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
- Banner de promoção Nível 2 / Nível 3
- Serviço compartilhado da Fase 1 em `src/lib/phase1.js`

## Compatibilidade de dados

A versão React usa as mesmas chaves da versão clássica:

- `ats_careers_v1`
- `ats_active_career`
- `ats_phase1_state_<careerId>`

Isso permite abrir a mesma carreira na versão React ou clássica sem criar uma cópia dos dados.

## Ponte temporária

Holerite, Saldo/Despesas, Infrações/Acidentes, Regras e Histórico ainda abrem `fase1.html` enquanto são convertidos para componentes React.

A importação e o tutorial CSV ainda usam `ats.html` durante a transição.

Os arquivos clássicos não devem ser removidos até a validação funcional completa da versão React.

## Próximos módulos

1. Migrar autocomplete/lista de cidades para um componente reutilizável.
2. Migrar Saldo e Despesas.
3. Migrar Holerite e fechamento semanal.
4. Migrar Infrações e Acidentes.
5. Migrar promoções/HazMat totalmente para controles React.
6. Migrar Regras, Mods, Histórico e glossário.
7. Migrar importação/exportação e tutorial CSV.
8. Validar compatibilidade total com os dados existentes no localStorage.
9. Remover arquivos legados apenas depois da validação completa.

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
