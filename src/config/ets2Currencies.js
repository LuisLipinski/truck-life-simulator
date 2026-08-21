export const ETS2_EXCHANGE_RATE_DATE = '2026-08-20'

const ECB_SOURCE = ['Banco Central Europeu', 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html']
const ALBANIA_SOURCE = ['Banco da Albânia', 'https://www.bankofalbania.org/Markets/Official_exchange_rate/']
const BOSNIA_SOURCE = ['Banco Central da Bósnia e Herzegovina', 'https://www.cbbh.ba/press/ShowNews/1385']
const MACEDONIA_SOURCE = ['Banco Nacional da Macedônia do Norte', 'https://www.nbrm.mk/kursna_lista-en.nspx']
const SERBIA_SOURCE = ['Banco Nacional da Sérvia', 'https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate']
const RUSSIA_SOURCE = ['Banco da Rússia', 'https://www.cbr.ru/eng/currency_base/daily/']

export const ETS2_EXCHANGE_RATE_SOURCES = [ECB_SOURCE, ALBANIA_SOURCE, BOSNIA_SOURCE, MACEDONIA_SOURCE, SERBIA_SOURCE, RUSSIA_SOURCE]

// Unidades de cada moeda por EUR. A cotação é congelada na criação da
// carreira para que saldos e holerites antigos nunca mudem retroativamente.
export const ETS2_CURRENCIES = {
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', perEuro: 1, source: ECB_SOURCE },
  CHF: { code: 'CHF', name: 'Franco suíço', symbol: 'CHF', locale: 'de-CH', perEuro: 0.9333, source: ECB_SOURCE },
  CZK: { code: 'CZK', name: 'Coroa tcheca', symbol: 'Kč', locale: 'cs-CZ', perEuro: 24.153, source: ECB_SOURCE },
  GBP: { code: 'GBP', name: 'Libra esterlina', symbol: '£', locale: 'en-GB', perEuro: 0.85725, source: ECB_SOURCE },
  PLN: { code: 'PLN', name: 'Złoty polonês', symbol: 'zł', locale: 'pl-PL', perEuro: 4.3188, source: ECB_SOURCE },
  HUF: { code: 'HUF', name: 'Forint húngaro', symbol: 'Ft', locale: 'hu-HU', perEuro: 365.10, source: ECB_SOURCE },
  DKK: { code: 'DKK', name: 'Coroa dinamarquesa', symbol: 'kr', locale: 'da-DK', perEuro: 7.4758, source: ECB_SOURCE },
  SEK: { code: 'SEK', name: 'Coroa sueca', symbol: 'kr', locale: 'sv-SE', perEuro: 11.0875, source: ECB_SOURCE },
  NOK: { code: 'NOK', name: 'Coroa norueguesa', symbol: 'kr', locale: 'nb-NO', perEuro: 10.9025, source: ECB_SOURCE },
  RUB: { code: 'RUB', name: 'Rublo russo', symbol: '₽', locale: 'ru-RU', perEuro: 98.5457, source: RUSSIA_SOURCE },
  RON: { code: 'RON', name: 'Leu romeno', symbol: 'lei', locale: 'ro-RO', perEuro: 5.2515, source: ECB_SOURCE },
  TRY: { code: 'TRY', name: 'Lira turca', symbol: '₺', locale: 'tr-TR', perEuro: 56.0145, source: ECB_SOURCE },
  ALL: { code: 'ALL', name: 'Lek albanês', symbol: 'L', locale: 'sq-AL', perEuro: 92.60, source: ALBANIA_SOURCE },
  BAM: { code: 'BAM', name: 'Marco conversível bósnio', symbol: 'KM', locale: 'bs-BA', perEuro: 1.95583, source: BOSNIA_SOURCE },
  MKD: { code: 'MKD', name: 'Dinar macedônio', symbol: 'ден', locale: 'mk-MK', perEuro: 61.5, source: MACEDONIA_SOURCE },
  RSD: { code: 'RSD', name: 'Dinar sérvio', symbol: 'дин', locale: 'sr-RS', perEuro: 117.3586, source: SERBIA_SOURCE },
}

export const ETS2_CURRENCY_OPTIONS = Object.values(ETS2_CURRENCIES)

export function getEts2Currency(currencyCode) {
  return ETS2_CURRENCIES[String(currencyCode || '').toUpperCase()] || null
}

export function getEts2ExchangeRate(fromCurrency, toCurrency) {
  const source = getEts2Currency(fromCurrency)
  const target = getEts2Currency(toCurrency)
  if (!source || !target) return 1
  return target.perEuro / source.perEuro
}

export function convertEts2Currency(value, fromCurrency, toCurrency, directRate) {
  const number = Number(value || 0)
  if (String(fromCurrency).toUpperCase() === String(toCurrency).toUpperCase()) return number
  const rate = Number(directRate) > 0 ? Number(directRate) : getEts2ExchangeRate(fromCurrency, toCurrency)
  return number * rate
}

export function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}
