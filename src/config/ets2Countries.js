import { ETS2_CITIES } from '../data/ets2Cities.js'
import { getEts2Currency, getEts2ExchangeRate, roundCurrency } from './ets2Currencies.js'

function citiesEndingWith(countryName) {
  return ETS2_CITIES.filter((city) => city.endsWith(`, ${countryName}`))
}

const OECD_SOURCE = ['OCDE — Taxing Wages 2026', 'https://www.oecd.org/en/publications/taxing-wages-2026_3a5169ef-en/full-report/overview_d93131c3.html']
const EU_TAX_SOURCE = ['Comissão Europeia — Taxes in Europe', 'https://ec.europa.eu/taxation_customs/tedb/']
const EUROSTAT_SOURCE = ['Eurostat — salários e custos do trabalho', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Wages_and_labour_costs']
const EURES_SOURCE = ['EURES — remuneração de motoristas', 'https://eures.europa.eu/how-find-and-train-jobs-are-demand-2025-04-17_en']

const EUR_SETUP = { rent: 950, deposit: 950, license: 150, groceries: 220, home: 300, phone: 35, internet: 40, transit: 60 }
const EUR_EXPENSES = { rent: 950, electricity: 90, water: 35, internet: 40, phone: 30, groceries: 300, eatingOut: 120, health: 80, publicTransport: 65, household: 70, leisure: 120 }
const EUR_PAY_RATES = { normal: 0.30, hazmat: 0.33, doubles: 0.35, hazmat_doubles: 0.38, deadhead: 0.25 }

function convertRecord(record, currency, factor = 1, precision = 2) {
  const rate = getEts2ExchangeRate('EUR', currency)
  const scale = 10 ** precision
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, Math.round(value * factor * rate * scale) / scale]))
}

function makeEffectiveProfile(definition) {
  const {
    code, name, flag, currency, locale, placeholder, costFactor, grossEur,
    incomeTaxRate, socialRate,
  } = definition
  const currencyProfile = getEts2Currency(currency)
  const rate = getEts2ExchangeRate('EUR', currency)
  const payFactor = Math.max(0.65, Math.min(1.35, grossEur / 2800))
  const local = (value) => roundCurrency(value * rate)
  return {
    code, name, flag, currency, currencyLabel: currencyProfile.symbol, locale,
    cityPlaceholder: `${placeholder}, ${name}`,
    cities: citiesEndingWith(name),
    defaultArrivalBalance: local(Math.max(2500, grossEur * 1.25)),
    setupCosts: convertRecord(EUR_SETUP, currency, costFactor),
    expenses: convertRecord(EUR_EXPENSES, currency, costFactor),
    payRates: convertRecord(EUR_PAY_RATES, currency, payFactor, 4),
    level1Gross: local(grossEur),
    routeOverrunRate: local(grossEur / 160),
    payrollBenefits: 0,
    perDiemRate: local(48 * costFactor),
    promotionCosts: [local(300 * costFactor), local(60 * costFactor)],
    dangerousQualificationCost: local(125 * costFactor),
    taxModel: 'effective-country-2025',
    taxRates: { incomeTax: incomeTaxRate, socialContributions: socialRate },
    taxes: [
      ['incomeTax', 'Imposto de renda (efetivo estimado)', 'Alíquota pessoal média usada para o roleplay; a retenção real depende de faixas, deduções e situação familiar.'],
      ['socialContributions', 'Contribuições sociais (estimadas)', 'Parcela média do empregado para previdência, saúde e outros regimes obrigatórios.'],
    ],
    taxAssumptions: `${name} · perfil efetivo de referência 2025/2026 · pessoa solteira, sem dependentes. Valores nacionais simplificados e editáveis.`,
    financeSources: [OECD_SOURCE, EU_TAX_SOURCE, EUROSTAT_SOURCE, EURES_SOURCE],
  }
}

const EFFECTIVE_COUNTRY_DEFINITIONS = [
  { code: 'FR', name: 'França', flag: '🇫🇷', currency: 'EUR', locale: 'fr-FR', placeholder: 'Paris', costFactor: 0.98, grossEur: 2550, incomeTaxRate: 0.167, socialRate: 0.113 },
  { code: 'NL', name: 'Países Baixos', flag: '🇳🇱', currency: 'EUR', locale: 'nl-NL', placeholder: 'Amsterdam', costFactor: 1.13, grossEur: 3000, incomeTaxRate: 0.178, socialRate: 0.10 },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪', currency: 'EUR', locale: 'nl-BE', placeholder: 'Bruxelas', costFactor: 1.05, grossEur: 2850, incomeTaxRate: 0.256, socialRate: 0.14 },
  { code: 'LU', name: 'Luxemburgo', flag: '🇱🇺', currency: 'EUR', locale: 'fr-LU', placeholder: 'Luxemburgo', costFactor: 1.22, grossEur: 3300, incomeTaxRate: 0.197, socialRate: 0.123 },
  { code: 'CH', name: 'Suíça', flag: '🇨🇭', currency: 'CHF', locale: 'de-CH', placeholder: 'Zürich', costFactor: 1.50, grossEur: 5200, incomeTaxRate: 0.117, socialRate: 0.064 },
  { code: 'AT', name: 'Áustria', flag: '🇦🇹', currency: 'EUR', locale: 'de-AT', placeholder: 'Viena', costFactor: 1.00, grossEur: 2850, incomeTaxRate: 0.146, socialRate: 0.179 },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', currency: 'EUR', locale: 'it-IT', placeholder: 'Milano', costFactor: 0.88, grossEur: 2300, incomeTaxRate: 0.191, socialRate: 0.095 },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR', locale: 'pt-PT', placeholder: 'Lisboa', costFactor: 0.72, grossEur: 1650, incomeTaxRate: 0.139, socialRate: 0.11 },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', currency: 'EUR', locale: 'es-ES', placeholder: 'Madrid', costFactor: 0.78, grossEur: 2050, incomeTaxRate: 0.171, socialRate: 0.065 },
  { code: 'CZ', name: 'Tchéquia', flag: '🇨🇿', currency: 'CZK', locale: 'cs-CZ', placeholder: 'Praha', costFactor: 0.67, grossEur: 1700, incomeTaxRate: 0.097, socialRate: 0.116 },
  { code: 'SK', name: 'Eslováquia', flag: '🇸🇰', currency: 'EUR', locale: 'sk-SK', placeholder: 'Bratislava', costFactor: 0.64, grossEur: 1500, incomeTaxRate: 0.109, socialRate: 0.134 },
  { code: 'HU', name: 'Hungria', flag: '🇭🇺', currency: 'HUF', locale: 'hu-HU', placeholder: 'Budapest', costFactor: 0.58, grossEur: 1350, incomeTaxRate: 0.15, socialRate: 0.185 },
  { code: 'DK', name: 'Dinamarca', flag: '🇩🇰', currency: 'DKK', locale: 'da-DK', placeholder: 'København', costFactor: 1.26, grossEur: 4100, incomeTaxRate: 0.353, socialRate: 0 },
  { code: 'NO', name: 'Noruega', flag: '🇳🇴', currency: 'NOK', locale: 'nb-NO', placeholder: 'Oslo', costFactor: 1.35, grossEur: 4200, incomeTaxRate: 0.204, socialRate: 0.077 },
  { code: 'SE', name: 'Suécia', flag: '🇸🇪', currency: 'SEK', locale: 'sv-SE', placeholder: 'Stockholm', costFactor: 1.12, grossEur: 3300, incomeTaxRate: 0.156, socialRate: 0.07 },
  { code: 'FI', name: 'Finlândia', flag: '🇫🇮', currency: 'EUR', locale: 'fi-FI', placeholder: 'Helsinki', costFactor: 1.08, grossEur: 3200, incomeTaxRate: 0.212, socialRate: 0.095 },
  { code: 'EE', name: 'Estônia', flag: '🇪🇪', currency: 'EUR', locale: 'et-EE', placeholder: 'Tallinn', costFactor: 0.72, grossEur: 1900, incomeTaxRate: 0.216, socialRate: 0.016 },
  { code: 'LV', name: 'Letônia', flag: '🇱🇻', currency: 'EUR', locale: 'lv-LV', placeholder: 'Rīga', costFactor: 0.63, grossEur: 1550, incomeTaxRate: 0.155, socialRate: 0.105 },
  { code: 'LT', name: 'Lituânia', flag: '🇱🇹', currency: 'EUR', locale: 'lt-LT', placeholder: 'Vilnius', costFactor: 0.64, grossEur: 1700, incomeTaxRate: 0.192, socialRate: 0.195 },
  { code: 'RO', name: 'Romênia', flag: '🇷🇴', currency: 'RON', locale: 'ro-RO', placeholder: 'București', costFactor: 0.50, grossEur: 1200, incomeTaxRate: 0.10, socialRate: 0.35 },
  { code: 'BG', name: 'Bulgária', flag: '🇧🇬', currency: 'EUR', locale: 'bg-BG', placeholder: 'Sofia', costFactor: 0.46, grossEur: 1050, incomeTaxRate: 0.10, socialRate: 0.1378 },
  { code: 'TR', name: 'Turquia', flag: '🇹🇷', currency: 'TRY', locale: 'tr-TR', placeholder: 'İstanbul', costFactor: 0.43, grossEur: 1050, incomeTaxRate: 0.143, socialRate: 0.15 },
  { code: 'SI', name: 'Eslovênia', flag: '🇸🇮', currency: 'EUR', locale: 'sl-SI', placeholder: 'Ljubljana', costFactor: 0.76, grossEur: 2200, incomeTaxRate: 0.121, socialRate: 0.241 },
  { code: 'HR', name: 'Croácia', flag: '🇭🇷', currency: 'EUR', locale: 'hr-HR', placeholder: 'Zagreb', costFactor: 0.68, grossEur: 1800, incomeTaxRate: 0.15, socialRate: 0.20 },
  { code: 'BA', name: 'Bósnia e Herzegovina', flag: '🇧🇦', currency: 'BAM', locale: 'bs-BA', placeholder: 'Sarajevo', costFactor: 0.50, grossEur: 1200, incomeTaxRate: 0.10, socialRate: 0.31 },
  { code: 'RS', name: 'Sérvia', flag: '🇷🇸', currency: 'RSD', locale: 'sr-RS', placeholder: 'Beograd', costFactor: 0.48, grossEur: 1100, incomeTaxRate: 0.10, socialRate: 0.199 },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', currency: 'EUR', locale: 'sr-ME', placeholder: 'Podgorica', costFactor: 0.55, grossEur: 1200, incomeTaxRate: 0.09, socialRate: 0.15 },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', currency: 'EUR', locale: 'sq-XK', placeholder: 'Pristina', costFactor: 0.48, grossEur: 1050, incomeTaxRate: 0.10, socialRate: 0.05 },
  { code: 'MK', name: 'Macedônia do Norte', flag: '🇲🇰', currency: 'MKD', locale: 'mk-MK', placeholder: 'Skopje', costFactor: 0.44, grossEur: 950, incomeTaxRate: 0.10, socialRate: 0.28 },
  { code: 'AL', name: 'Albânia', flag: '🇦🇱', currency: 'ALL', locale: 'sq-AL', placeholder: 'Tirana', costFactor: 0.46, grossEur: 1000, incomeTaxRate: 0.13, socialRate: 0.112 },
  { code: 'GR', name: 'Grécia', flag: '🇬🇷', currency: 'EUR', locale: 'el-GR', placeholder: 'Athína', costFactor: 0.70, grossEur: 1700, incomeTaxRate: 0.127, socialRate: 0.134 },
]

const DETAILED_COUNTRY_PROFILES = {
  DE: {
    code: 'DE',
    name: 'Alemanha',
    flag: '🇩🇪',
    currency: 'EUR',
    currencyLabel: '€',
    locale: 'de-DE',
    cityPlaceholder: 'Berlin, Alemanha',
    cities: citiesEndingWith('Alemanha'),
    defaultArrivalBalance: 3500,
    setupCosts: { rent: 950, deposit: 950, license: 150, groceries: 220, home: 300, phone: 35, internet: 40, transit: 60 },
    expenses: { rent: 950, electricity: 90, water: 35, internet: 40, phone: 30, groceries: 300, eatingOut: 120, health: 80, publicTransport: 65, household: 70, leisure: 120 },
    payRates: { normal: 0.30, hazmat: 0.33, doubles: 0.35, hazmat_doubles: 0.38, deadhead: 0.25 },
    level1Gross: 2800,
    routeOverrunRate: 18,
    payrollBenefits: 0,
    perDiemRate: 48,
    promotionCosts: [300, 60],
    dangerousQualificationCost: 125,
    taxModel: 'de-2026-simplified',
    taxes: [
      ['incomeTax', 'Imposto de renda (estimado)', 'Estimativa mensal anualizada para um perfil padrão. A folha real alemã depende da classe fiscal e de outras condições pessoais.'],
      ['pensionInsurance', 'Seguro previdenciário', 'Parcela estimada do empregado para a previdência pública alemã.'],
      ['healthInsurance', 'Seguro-saúde público', 'Parcela estimada do empregado com contribuição adicional média.'],
      ['unemploymentInsurance', 'Seguro-desemprego', 'Parcela estimada do empregado para o seguro-desemprego.'],
      ['careInsurance', 'Seguro de cuidados', 'Perfil padrão sem filhos; a parcela real varia conforme a situação familiar.'],
    ],
    taxAssumptions: 'Alemanha · estimativa 2026 · pessoa solteira, sem filhos, sem imposto religioso e segurada no sistema público.',
    financeSources: [
      ['Previdência alemã', 'https://www.deutsche-rentenversicherung.de/DRV/EN/Versicherung/versicherung_node.html'],
      ['Saúde e cuidados', 'https://www.bundesgesundheitsministerium.de/beitraege'],
      ['Parâmetros sociais 2026', 'https://www.bmas.de/DE/Service/Presse/Pressemitteilungen/2025/das-aendert-sich-im-neuen-jahr.html'],
    ],
  },
  GB: {
    code: 'GB',
    name: 'Reino Unido',
    flag: '🇬🇧',
    currency: 'GBP',
    currencyLabel: '£',
    locale: 'en-GB',
    cityPlaceholder: 'Londres, Reino Unido',
    cities: citiesEndingWith('Reino Unido'),
    defaultArrivalBalance: 3500,
    setupCosts: { rent: 1000, deposit: 1000, license: 180, groceries: 240, home: 300, phone: 35, internet: 45, transit: 85 },
    expenses: { rent: 1000, electricity: 110, water: 40, internet: 35, phone: 25, groceries: 320, eatingOut: 140, health: 0, publicTransport: 90, household: 70, leisure: 130 },
    payRates: { normal: 0.27, hazmat: 0.30, doubles: 0.32, hazmat_doubles: 0.35, deadhead: 0.22 },
    level1Gross: 2600,
    routeOverrunRate: 16,
    payrollBenefits: 0,
    perDiemRate: 45,
    promotionCosts: [260, 50],
    dangerousQualificationCost: 110,
    taxModel: 'gb-2026-simplified',
    taxes: [
      ['incomeTax', 'Income Tax (estimado)', 'Estimativa PAYE anualizada com Personal Allowance e faixas padrão de Inglaterra, País de Gales e Irlanda do Norte.'],
      ['nationalInsurance', 'National Insurance', 'Estimativa da contribuição Class 1 do empregado para o ano fiscal 2026/27.'],
    ],
    taxAssumptions: 'Reino Unido · estimativa 2026/27 · código fiscal padrão; a Escócia possui faixas próprias de Income Tax.',
    financeSources: [
      ['Income Tax 2026/27', 'https://www.gov.uk/income-tax-rates'],
      ['National Insurance 2026/27', 'https://www.gov.uk/national-insurance-rates-letters'],
    ],
  },
  PL: {
    code: 'PL',
    name: 'Polônia',
    flag: '🇵🇱',
    currency: 'PLN',
    currencyLabel: 'zł',
    locale: 'pl-PL',
    cityPlaceholder: 'Warszawa, Polônia',
    cities: citiesEndingWith('Polônia'),
    defaultArrivalBalance: 15000,
    setupCosts: { rent: 3000, deposit: 3000, license: 650, groceries: 900, home: 1200, phone: 80, internet: 80, transit: 150 },
    expenses: { rent: 3000, electricity: 350, water: 150, internet: 80, phone: 70, groceries: 1400, eatingOut: 500, health: 250, publicTransport: 150, household: 300, leisure: 500 },
    payRates: { normal: 1.15, hazmat: 1.25, doubles: 1.30, hazmat_doubles: 1.40, deadhead: 0.95 },
    level1Gross: 10000,
    routeOverrunRate: 60,
    payrollBenefits: 0,
    perDiemRate: 180,
    promotionCosts: [1200, 250],
    dangerousQualificationCost: 500,
    taxModel: 'pl-2026-simplified',
    taxes: [
      ['incomeTax', 'PIT (estimado)', 'Estimativa mensal anualizada pelas faixas de 12% e 32%, com redução anual simplificada.'],
      ['pensionInsurance', 'Aposentadoria (ZUS)', 'Parcela do empregado para o seguro de aposentadoria.'],
      ['disabilityInsurance', 'Invalidez (ZUS)', 'Parcela do empregado para invalidez e pensão por sobrevivência.'],
      ['sicknessInsurance', 'Doença (ZUS)', 'Parcela do empregado para o seguro-doença.'],
      ['healthInsurance', 'Seguro-saúde', 'Estimativa de 9% sobre a base após as contribuições sociais do empregado.'],
    ],
    taxAssumptions: 'Polônia · estimativa 2026 · contrato de trabalho padrão, sem benefícios ou deduções pessoais adicionais.',
    financeSources: [
      ['Faixas do PIT', 'https://www.podatki.gov.pl/en/residents/personal-income-tax-rates/'],
      ['Contribuições ZUS', 'https://lang.zus.pl/finances/contributions'],
    ],
  },
}

export const ETS2_COUNTRY_PROFILES = {
  ...Object.fromEntries(EFFECTIVE_COUNTRY_DEFINITIONS.map((definition) => [definition.code, makeEffectiveProfile(definition)])),
  ...DETAILED_COUNTRY_PROFILES,
}

export const ETS2_COUNTRY_OPTIONS = Object.values(ETS2_COUNTRY_PROFILES).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

export function getEts2CountryProfile(countryCode) {
  return ETS2_COUNTRY_PROFILES[String(countryCode || '').toUpperCase()] || null
}

export function inferEts2CountryCode(city) {
  const value = String(city || '').trim()
  return ETS2_COUNTRY_OPTIONS.find((country) => country.cities.includes(value))?.code || null
}
