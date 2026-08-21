import { ATS_CITIES } from '../data/atsCities.js'
import { ETS2_CITIES } from '../data/ets2Cities.js'
import { ETS2_COUNTRY_OPTIONS, getEts2CountryProfile } from './ets2Countries.js'
import {
  convertEts2Currency,
  ETS2_CURRENCY_OPTIONS,
  ETS2_EXCHANGE_RATE_DATE,
  getEts2Currency,
  getEts2ExchangeRate,
  roundCurrency,
} from './ets2Currencies.js'

const ATS_IMAGE = 'https://cdn.cloudflare.steamstatic.com/steam/apps/270880/header.jpg'
const ETS2_IMAGE = 'https://cdn.cloudflare.steamstatic.com/steam/apps/227300/header.jpg'

const commonSetupLabels = {
  rent: 'Primeiro mês de aluguel',
  deposit: 'Depósito caução',
  groceries: 'Mercado inicial',
  home: 'Itens básicos da casa',
  phone: 'Celular / chip',
  internet: 'Internet / instalação',
  transit: 'Transporte público inicial',
}

const expenseLabels = {
  rent: 'Aluguel', electricity: 'Eletricidade', water: 'Água / lixo', internet: 'Internet', phone: 'Celular',
  groceries: 'Mercado', eatingOut: 'Alimentação fora', health: 'Saúde / parcela pessoal', publicTransport: 'Ônibus / metrô',
  household: 'Higiene / casa', leisure: 'Lazer',
}

const atsMods = [
  ['Sound Fixes Pack', 'Melhora sons gerais do ATS, suspensão, pneus, ambiente e acoplamento de trailer.', 'https://steamcommunity.com/sharedfiles/filedetails/?id=830663438'],
  ['Sons de motor', 'Escolha um pacote compatível com o caminhão e a versão atual do ATS.', 'https://steamcommunity.com/workshop/browse/?appid=270880&searchtext=engine+sound&browsesort=trend&section=readytouseitems'],
  ['Empresas e postos reais', 'Pacotes visuais aumentam a imersão sem mudar o salário da carreira.', 'https://steamcommunity.com/workshop/browse/?appid=270880&searchtext=real+companies&browsesort=trend&section=readytouseitems'],
  ['Tráfego realista', 'Ajustes de densidade e variedade para rodovias dos Estados Unidos.', 'https://steamcommunity.com/workshop/browse/?appid=270880&searchtext=traffic&browsesort=trend&section=readytouseitems'],
  ['Clima e chuva', 'Melhorias visuais de chuva e clima que não alteram a economia.', 'https://steamcommunity.com/workshop/browse/?appid=270880&searchtext=rain&browsesort=trend&section=readytouseitems'],
]

const ets2Mods = [
  ['Sound Fixes Pack', 'Versões compatíveis com ETS2 melhoram ambiente, pneus, suspensão e acoplamento.', 'https://steamcommunity.com/workshop/browse/?appid=227300&searchtext=Sound+Fixes+Pack&browsesort=trend&section=readytouseitems'],
  ['Sons de caminhões europeus', 'Procure sons atualizados para DAF, Iveco, MAN, Mercedes-Benz, Renault, Scania ou Volvo.', 'https://steamcommunity.com/workshop/browse/?appid=227300&searchtext=engine+sound&browsesort=trend&section=readytouseitems'],
  ['Empresas europeias reais', 'Substituições visuais de empresas, postos e outdoors mantêm a economia do app intacta.', 'https://steamcommunity.com/workshop/browse/?appid=227300&searchtext=real+companies&browsesort=trend&section=readytouseitems'],
  ['Tráfego europeu', 'Ajustes de densidade e variedade voltados às estradas e cidades europeias.', 'https://steamcommunity.com/workshop/browse/?appid=227300&searchtext=traffic+density&browsesort=trend&section=readytouseitems'],
  ['Clima e chuva', 'Melhorias de chuva, iluminação e clima sem interferir no pagamento da carreira.', 'https://steamcommunity.com/workshop/browse/?appid=227300&searchtext=weather+rain&browsesort=trend&section=readytouseitems'],
  ['Mapas para ETS2', 'Expansões comunitárias podem exigir DLCs e ordem de carregamento específica.', 'https://steamcommunity.com/workshop/browse/?appid=227300&searchtext=map&browsesort=trend&section=readytouseitems'],
]

export const GAMES = {
  ats: {
    id: 'ats', slug: 'ats', shortName: 'ATS', name: 'American Truck Simulator', region: 'Estados Unidos', image: ATS_IMAGE,
    description: 'Carreira nos Estados Unidos, começando como motorista empregado.', cities: ATS_CITIES,
    routes: { careers: '/ats', new: '/new', phases: '/phases', phase1: '/phase1' },
    storagePrefix: 'ats', backupMarker: 'ATS_CAREER_BACKUP', backupStem: 'ats', sheetName: 'Carreira ATS',
    currency: 'USD', locale: 'en-US', currencyLabel: 'US$', distanceUnit: 'mi', distanceName: 'milhas', distanceField: 'miles',
    arrivalLabel: 'Dinheiro ao chegar aos EUA', cityPlaceholder: 'Los Angeles, CA', companyPlaceholder: 'Pacific Horizon Logistics',
    bioPlaceholder: 'Brasileiro que imigrou legalmente para os EUA e começou como motorista empregado.',
    setupCosts: { rent: 1650, deposit: 1650, license: 100, groceries: 250, home: 350, phone: 60, internet: 75, transit: 72 },
    setupLabels: { ...commonSetupLabels, license: 'Licença / CDL inicial' },
    expenses: { rent: 1650, electricity: 100, water: 60, internet: 65, phone: 55, groceries: 400, eatingOut: 150, health: 180, publicTransport: 72, household: 80, leisure: 150 },
    expenseLabels,
    payRates: { normal: 0.60, hazmat: 0.63, doubles: 0.64, hazmat_doubles: 0.67, deadhead: 0.50 },
    payLabels: { normal: 'Loaded normal', hazmat: 'Loaded HazMat', doubles: 'Loaded Doubles / bitrem', hazmat_doubles: 'Loaded HazMat + Doubles', deadhead: 'Deadhead' },
    tripTypes: { loaded: 'Loaded', deadhead: 'Deadhead' },
    levelRoles: ['Trainee / Local Driver', 'Company Driver / OTR', 'Experienced Driver / Doubles'],
    promotionGoals: [10000, 50000], promotionCosts: [300, 59], promotionModules: ['Truck Driving Proficiency', 'Double Trailer Handling'],
    promotionSubtitles: ['Seu próximo passo é provar que está pronto para a operação OTR.', 'Você chegou à etapa avançada da carreira. Agora é hora de treinar Doubles.'],
    academyModules: [
      { level: 'Nível 2', goal: 10000, title: 'Truck Driving Proficiency', version: 'Disponível no ATS desde a versão 1.55', text: 'Cenários avançados de precisão, controle do caminhão e manobras exigentes.', cost: 300, official: 'https://blog.scssoft.com/2025/06/american-truck-simulator-155-update.html' },
      { level: 'Nível 3', goal: 50000, title: 'Double Trailer Handling', version: 'Disponível no ATS desde a versão 1.58', text: 'Treinamento de condução, manobras e ré com dois trailers.', cost: 59, official: 'https://blog.scssoft.com/2026/02/american-truck-simulator-158-update.html' },
    ],
    dangerousQualification: { name: 'HazMat', stateLabel: 'HazMat', cost: 144.25, activeText: 'HazMat ativo', description: 'Libera cargas perigosas e tarifas HazMat.' },
    payrollPeriod: 'weekly', payrollPeriodLabel: 'semanal', payrollBenefits: 36, minWeeksPerPayroll: 1, maxWeeksPerPayroll: 1,
    level1Gross: 850, routeOverrunRate: 21.25, weeklyBenefits: 36, perDiemRate: 80, perDiemLabel: 'Per diem', overtimeLabel: 'Route Overrun',
    taxModel: 'us-california', taxes: [
      ['federal', 'Federal', 'Retenção federal simplificada da simulação.'], ['ss', 'Social Security', 'Contribuição estimada de Social Security.'],
      ['medicare', 'Medicare', 'Contribuição estimada do Medicare.'], ['ca', 'California Income Tax', 'Imposto estadual simplificado da Califórnia.'], ['sdi', 'California SDI', 'Retenção estadual adicional simulada.'],
    ],
    officialUrl: 'https://americantrucksimulator.com/', storeUrl: 'https://store.steampowered.com/app/270880/American_Truck_Simulator/', workshopUrl: 'https://steamcommunity.com/app/270880/workshop/',
    mods: atsMods,
  },
  ets2: {
    id: 'ets2', slug: 'ets2', shortName: 'ETS2', name: 'Euro Truck Simulator 2', region: 'Europa', image: ETS2_IMAGE,
    description: 'Carreira europeia em quilômetros, país-sede e regras financeiras nacionais.', cities: ETS2_CITIES,
    routes: { careers: '/ets2', new: '/ets2/new', phases: '/ets2/phases', phase1: '/ets2/phase1' },
    storagePrefix: 'ets2', backupMarker: 'ETS2_CAREER_BACKUP', backupStem: 'ets2', sheetName: 'Carreira ETS2',
    currency: 'EUR', locale: 'de-DE', currencyLabel: '€', distanceUnit: 'km', distanceName: 'quilômetros', distanceField: 'distance',
    countryOptions: ETS2_COUNTRY_OPTIONS, currencyOptions: ETS2_CURRENCY_OPTIONS, payrollPeriod: 'monthly', payrollPeriodLabel: 'mensal', payrollBenefits: 0, minWeeksPerPayroll: 4, maxWeeksPerPayroll: 5,
    arrivalLabel: 'Dinheiro disponível ao iniciar no país', cityPlaceholder: 'Selecione primeiro o país-sede', companyPlaceholder: 'Euro Horizon Logistics',
    bioPlaceholder: 'Motorista que iniciou uma nova carreira internacional na Europa.',
    setupCosts: { rent: 950, deposit: 950, license: 150, groceries: 220, home: 300, phone: 35, internet: 40, transit: 60 },
    setupLabels: { ...commonSetupLabels, license: 'Licença profissional / CPC inicial' },
    expenses: { rent: 950, electricity: 90, water: 35, internet: 40, phone: 30, groceries: 300, eatingOut: 120, health: 80, publicTransport: 65, household: 70, leisure: 120 },
    expenseLabels,
    payRates: { normal: 0.36, hazmat: 0.39, doubles: 0.40, hazmat_doubles: 0.43, deadhead: 0.30 },
    payLabels: { normal: 'Carga padrão', hazmat: 'Carga ADR', doubles: 'Euro Combi', hazmat_doubles: 'ADR + Euro Combi', deadhead: 'Reposicionamento vazio' },
    tripTypes: { loaded: 'Com carga', deadhead: 'Reposicionamento vazio' },
    levelRoles: ['Motorista local em treinamento', 'Motorista internacional', 'Motorista experiente / Euro Combi'],
    promotionGoals: [16000, 80000], promotionCosts: [300, 60], promotionModules: ['Truck Driving Proficiency', 'Double Trailer Handling'],
    promotionSubtitles: ['Seu próximo passo é provar que está pronto para rotas internacionais.', 'Você chegou à operação avançada com combinações Euro Combi.'],
    academyModules: [
      { level: 'Nível 2', goal: 16000, title: 'Truck Driving Proficiency', version: 'Disponível no ETS2 desde a versão 1.55', text: 'Cenários avançados de precisão, controle do caminhão europeu e manobras exigentes.', cost: 300, official: 'https://blog.scssoft.com/2025/07/euro-truck-simulator-2-155-update.html' },
      { level: 'Nível 3', goal: 80000, title: 'Double Trailer Handling', version: 'Disponível no ETS2 desde a versão 1.58', text: 'Treinamento de condução, manobra e ré com a combinação Euro Combi.', cost: 60, official: 'https://blog.scssoft.com/2026/02/euro-truck-simulator-2-158-update.html' },
    ],
    dangerousQualification: { name: 'ADR', stateLabel: 'ADR', cost: 125, activeText: 'ADR ativo', description: 'Libera cargas perigosas e tarifas ADR.' },
    level1Gross: 0, routeOverrunRate: 0, weeklyBenefits: 0, perDiemRate: 0, perDiemLabel: 'Diária internacional', overtimeLabel: 'Hora extra de rota',
    taxModel: 'country-required', taxes: [],
    officialUrl: 'https://eurotrucksimulator2.com/', storeUrl: 'https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/', workshopUrl: 'https://steamcommunity.com/app/227300/workshop/',
    mods: ets2Mods,
  },
}

function convertedRecord(record, fromCurrency, toCurrency, exchangeRate, precision = 2) {
  return Object.fromEntries(Object.entries(record || {}).map(([key, value]) => {
    const converted = convertEts2Currency(value, fromCurrency, toCurrency, exchangeRate)
    const factor = 10 ** precision
    return [key, Math.round((converted + Number.EPSILON) * factor) / factor]
  }))
}

export function getGame(gameId = 'ats', countryCode = null, currencyCode = null, savedExchangeRate = null, savedExchangeRateAsOf = null) {
  const game = GAMES[gameId] || GAMES.ats
  if (game.id !== 'ets2' || !countryCode) return game
  const country = getEts2CountryProfile(countryCode)
  if (!country) return game
  const baseCurrency = country.currency
  const baseCurrencyProfile = getEts2Currency(baseCurrency)
  const selectedCurrency = getEts2Currency(currencyCode) || getEts2Currency(baseCurrency)
  const exchangeRate = selectedCurrency.code === baseCurrency
    ? 1
    : Number(savedExchangeRate) > 0
      ? Number(savedExchangeRate)
      : getEts2ExchangeRate(baseCurrency, selectedCurrency.code)
  const convertMoney = (value) => roundCurrency(convertEts2Currency(value, baseCurrency, selectedCurrency.code, exchangeRate))
  return {
    ...game,
    ...country,
    currencyOptions: ETS2_CURRENCY_OPTIONS,
    currency: selectedCurrency.code,
    currencyName: selectedCurrency.name,
    currencyLabel: selectedCurrency.symbol,
    locale: selectedCurrency.locale,
    baseCurrency,
    baseCurrencyLabel: country.currencyLabel,
    baseLocale: country.locale,
    exchangeRate,
    exchangeRateAsOf: savedExchangeRateAsOf || ETS2_EXCHANGE_RATE_DATE,
    exchangeRateSources: [...new Map([baseCurrencyProfile.source, selectedCurrency.source].map((source) => [source[1], source])).values()],
    defaultArrivalBalance: convertMoney(country.defaultArrivalBalance),
    setupCosts: convertedRecord(country.setupCosts, baseCurrency, selectedCurrency.code, exchangeRate),
    expenses: convertedRecord(country.expenses, baseCurrency, selectedCurrency.code, exchangeRate),
    payRates: convertedRecord(country.payRates, baseCurrency, selectedCurrency.code, exchangeRate, 4),
    level1Gross: convertMoney(country.level1Gross),
    routeOverrunRate: convertMoney(country.routeOverrunRate),
    payrollBenefits: convertMoney(country.payrollBenefits),
    perDiemRate: convertMoney(country.perDiemRate),
    promotionCosts: country.promotionCosts.map(convertMoney),
    dangerousQualificationCost: convertMoney(country.dangerousQualificationCost),
    cities: game.cities,
    baseCities: country.cities,
    countryCode: country.code,
    countryName: country.name,
    countryFlag: country.flag,
    countryProfile: country,
    weeklyBenefits: convertMoney(country.payrollBenefits),
    academyModules: game.academyModules.map((module, index) => ({ ...module, cost: convertMoney(country.promotionCosts[index]) })),
    dangerousQualification: { ...game.dangerousQualification, cost: convertMoney(country.dangerousQualificationCost) },
  }
}

export function getGameForCareer(career, gameId = career?.gameId || 'ats') {
  return getGame(
    gameId,
    career?.countryCode,
    career?.currency,
    career?.exchangeRate,
    career?.exchangeRateAsOf,
  )
}

export function gameIdFromPath(path = '') {
  return String(path).startsWith('/ets2') ? 'ets2' : 'ats'
}

export function gameIdFromBackupMarker(marker) {
  return Object.values(GAMES).find((game) => game.backupMarker === marker)?.id || null
}

export function formatMoney(value, gameOrId = 'ats') {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  return Number(value || 0).toLocaleString(game.locale, { style: 'currency', currency: game.currency })
}

export function formatNumber(value, gameOrId = 'ats') {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  return Number(value || 0).toLocaleString(game.locale)
}

export function formatDistance(value, gameOrId = 'ats', includeName = false) {
  const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId
  return `${formatNumber(value, game)} ${includeName ? game.distanceName : game.distanceUnit}`
}
