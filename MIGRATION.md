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

## Ponte temporária

A Fase 1 ainda abre `fase1.html` para preservar todas as regras e funções existentes enquanto o módulo é migrado por partes.

A importação e o tutorial CSV ainda usam `ats.html` durante a transição.

## Próximos módulos

1. Migrar autocomplete/lista de cidades.
2. Migrar CSV para serviços React.
3. Migrar shell da Fase 1 e sistema de abas.
4. Migrar Visão Geral e Progresso.
5. Migrar Saldo/Despesas, Holerite e Ocorrências.
6. Migrar Regras, Mods, Histórico e glossário.
7. Validar compatibilidade total com os dados existentes no localStorage.
8. Remover arquivos legados apenas depois da validação completa.

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
