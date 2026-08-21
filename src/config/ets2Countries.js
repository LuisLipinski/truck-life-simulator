import { ETS2_CITIES } from '../data/ets2Cities.js'

function citiesEndingWith(countryName) {
  return ETS2_CITIES.filter((city) => city.endsWith(`, ${countryName}`))
}

export const ETS2_COUNTRY_PROFILES = {
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

export const ETS2_COUNTRY_OPTIONS = Object.values(ETS2_COUNTRY_PROFILES)

export function getEts2CountryProfile(countryCode) {
  return ETS2_COUNTRY_PROFILES[String(countryCode || '').toUpperCase()] || null
}

export function inferEts2CountryCode(city) {
  const value = String(city || '').trim()
  return ETS2_COUNTRY_OPTIONS.find((country) => country.cities.includes(value))?.code || null
}
