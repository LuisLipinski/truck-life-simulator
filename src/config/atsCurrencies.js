export const ATS_EXCHANGE_RATE_DATE = '2026-08-20'

const ECB_SOURCE = ['Banco Central Europeu', 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html']

// O ATS original oferece dólar e euro como moedas de exibição. A cotação é
// congelada na criação da carreira para preservar o histórico financeiro.
export const ATS_CURRENCIES = {
  USD: { code: 'USD', name: 'Dólar americano', symbol: 'US$', locale: 'en-US', perUsd: 1, source: ECB_SOURCE },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE', perUsd: 1 / 1.1681, source: ECB_SOURCE },
}

export const ATS_CURRENCY_OPTIONS = Object.values(ATS_CURRENCIES)

export function getAtsCurrency(currencyCode) {
  return ATS_CURRENCIES[String(currencyCode || '').toUpperCase()] || null
}

export function getAtsExchangeRate(fromCurrency, toCurrency) {
  const source = getAtsCurrency(fromCurrency)
  const target = getAtsCurrency(toCurrency)
  if (!source || !target) return 1
  return target.perUsd / source.perUsd
}

export function convertAtsCurrency(value, fromCurrency, toCurrency, directRate) {
  const number = Number(value || 0)
  if (String(fromCurrency).toUpperCase() === String(toCurrency).toUpperCase()) return number
  const rate = Number(directRate) > 0 ? Number(directRate) : getAtsExchangeRate(fromCurrency, toCurrency)
  return number * rate
}
