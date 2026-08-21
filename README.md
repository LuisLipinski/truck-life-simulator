# Truck Life Simulator

Companion de carreira para American Truck Simulator e Euro Truck Simulator 2. Cada jogo possui rotas, carreiras, estado financeiro, unidades, qualificações, backups e links próprios.

## Jogos

| Item | ATS | ETS2 |
| --- | --- | --- |
| Entrada | `#/ats` | `#/ets2` |
| Distância | milhas (`mi`) | quilômetros (`km`) |
| Moeda da simulação | USD | EUR |
| Carga perigosa | HazMat | ADR |
| Combinação avançada | Doubles | Euro Combi |
| Backup | `ATS_CAREER_BACKUP` | `ETS2_CAREER_BACKUP` |
| Steam app | 270880 | 227300 |

O ETS2 usa uma lista europeia própria com mais de 200 cidades. Cidades adicionadas por mods também podem ser informadas manualmente.

## Separação de dados

- ATS: `ats_careers_v1`, `ats_active_career` e `ats_phase1_state_<id>`.
- ETS2: `ets2_careers_v1`, `ets2_active_career` e `ets2_phase1_state_<id>`.
- A importação recusa um backup quando ele é aberto na área do jogo errado.
- Backups antigos do ATS permanecem compatíveis.

## Modelo do ETS2

- Valores exibidos em euro e distâncias em quilômetros.
- Promoções em 16.000 km e 80.000 km.
- Qualificação ADR e categoria Euro Combi.
- Driving Academy com `Truck Driving Proficiency` e `Double Trailer Handling`.
- Holerite com retenções europeias genéricas, sem copiar impostos da Califórnia. Regras reais variam por país e os valores do app são parâmetros de roleplay editáveis.
- Workshop, loja Steam e site oficial apontam para o ETS2, app 227300.

Referências oficiais: [site do ETS2](https://eurotrucksimulator2.com/), [Steam](https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/), [Workshop](https://steamcommunity.com/app/227300/workshop/), [Driving Academy 1.55](https://blog.scssoft.com/2025/07/euro-truck-simulator-2-155-update.html) e [Double Trailer Handling 1.58](https://blog.scssoft.com/2026/02/euro-truck-simulator-2-158-update.html).

## Desenvolvimento

```bash
npm install
npm test -- --run
npm run build
```

O GitHub Pages continua sendo publicado pela branch `development`. Branches de recurso, como `feature/euro-truck-simulator-2`, não alteram o site até serem promovidas pelo fluxo documentado em [DEPLOYMENT.md](DEPLOYMENT.md).
