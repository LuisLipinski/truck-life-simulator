import { ATS_CITIES } from '../data/atsCities.js'
import { ETS2_CITIES } from '../data/ets2Cities.js'

export const CITY_MARKET_VERSION = 1

export const CITY_MARKET_SOURCES = {
  ats: [
    ['HUD — aluguéis por área metropolitana', 'https://www.huduser.gov/portal/datasets/fmr.html'],
    ['BLS OEWS — salários por estado e área metropolitana', 'https://www.bls.gov/oes/'],
  ],
  ets2: [
    ['Eurostat — custos de moradia nas cidades', 'https://ec.europa.eu/eurostat/web/interactive-publications/housing-2025'],
    ['Eurostat — mercado de trabalho regional', 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Labour_market_statistics_at_regional_level'],
  ],
}

const MARKET_TIERS = {
  ats: {
    premium: { key: 'premium', label: 'Metrópole de custo muito alto', costFactor: 1.22, salaryFactor: 1.08 },
    major: { key: 'major', label: 'Metrópole principal', costFactor: 1.10, salaryFactor: 1.05 },
    regional: { key: 'regional', label: 'Centro regional', costFactor: 1, salaryFactor: 1.01 },
    smaller: { key: 'smaller', label: 'Cidade menor', costFactor: 0.88, salaryFactor: 0.96 },
  },
  ets2: {
    premium: { key: 'premium', label: 'Capital ou metrópole de custo alto', costFactor: 1.18, salaryFactor: 1.08 },
    major: { key: 'major', label: 'Capital ou metrópole principal', costFactor: 1.10, salaryFactor: 1.05 },
    regional: { key: 'regional', label: 'Centro regional', costFactor: 1, salaryFactor: 1.01 },
    smaller: { key: 'smaller', label: 'Cidade menor', costFactor: 0.90, salaryFactor: 0.97 },
  },
}

const ATS_PREMIUM_CITIES = new Set([
  'Los Angeles, CA', 'Oakland, CA', 'San Diego, CA', 'San Francisco, CA', 'San Rafael, CA', 'Santa Cruz, CA', 'Truckee, CA',
  'Denver, CO', 'Chicago, IL', 'Las Vegas, NV', 'Portland, OR', 'Austin, TX', 'Seattle, WA', 'Jackson, WY',
])

const ATS_MAJOR_CITIES = new Set([
  'Phoenix, AZ', 'Tucson, AZ', 'Fayetteville, AR', 'Little Rock, AR', 'Fresno, CA', 'Sacramento, CA',
  'Colorado Springs, CO', 'Fort Collins, CO', 'Boise, ID', "Coeur d'Alene, ID", 'Peoria, IL', 'Rockford, IL',
  'Cedar Rapids, IA', 'Des Moines, IA', 'Kansas City, KS', 'Wichita, KS', 'Baton Rouge, LA', 'New Orleans, LA',
  'Kansas City, MO', 'Springfield, MO', 'St. Louis, MO', 'Billings, MT', 'Bozeman, MT', 'Lincoln, NE', 'Omaha, NE',
  'Reno, NV', 'Albuquerque, NM', 'Santa Fe, NM', 'Oklahoma City, OK', 'Tulsa, OK', 'Bend, OR', 'Eugene, OR',
  'Dallas, TX', 'Fort Worth, TX', 'Houston, TX', 'San Antonio, TX', 'Provo, UT', 'Salt Lake City, UT',
  'Spokane, WA', 'Tacoma, WA', 'Vancouver, WA', 'Cheyenne, WY',
])

const ATS_REGIONAL_CITIES = new Set([
  'Flagstaff, AZ', 'Kingman, AZ', 'Yuma, AZ', 'Fort Smith, AR', 'Springdale, AR', 'Bakersfield, CA', 'Carlsbad, CA',
  'Eureka, CA', 'Oxnard, CA', 'Redding, CA', 'Santa Maria, CA', 'Durango, CO', 'Grand Junction, CO', 'Pueblo, CO',
  'Idaho Falls, ID', 'Lewiston, ID', 'Nampa, ID', 'Twin Falls, ID', 'Champaign, IL', 'Springfield, IL',
  'Davenport, IA', 'Iowa City, IA', 'Sioux City, IA', 'Topeka, KS', 'Lafayette, LA', 'Lake Charles, LA',
  'Shreveport, LA', 'Columbia, MO', 'Jefferson City, MO', 'Missoula, MT', 'Grand Island, NE', 'Carson City, NV',
  'Las Cruces, NM', 'Roswell, NM', 'Salem, OR', 'Amarillo, TX', 'Corpus Christi, TX', 'El Paso, TX', 'Laredo, TX',
  'Lubbock, TX', 'McAllen, TX', 'Odessa, TX', 'Waco, TX', 'Ogden, UT', 'St. George, UT', 'Bellingham, WA',
  'Everett, WA', 'Olympia, WA', 'Yakima, WA', 'Casper, WY', 'Gillette, WY', 'Laramie, WY',
])

const ETS2_PREMIUM_CITIES = new Set([
  'Londres, Reino Unido', 'Paris, França', 'München, Alemanha', 'Amsterdam, Países Baixos', 'Luxemburgo, Luxemburgo',
  'Zürich, Suíça', 'Genève, Suíça', 'Milano, Itália', 'Barcelona, Espanha', 'København, Dinamarca', 'Oslo, Noruega',
  'Stockholm, Suécia', 'Helsinki, Finlândia',
])

const ETS2_MAJOR_CITIES = new Set([
  'Birmingham, Reino Unido', 'Edimburgo, Reino Unido', 'Glasgow, Reino Unido', 'Liverpool, Reino Unido', 'Manchester, Reino Unido',
  'Bordeaux, França', 'Lille, França', 'Lyon, França', 'Marseille, França', 'Nice, França', 'Toulouse, França',
  'Berlin, Alemanha', 'Düsseldorf, Alemanha', 'Frankfurt am Main, Alemanha', 'Hamburg, Alemanha', 'Köln, Alemanha', 'Stuttgart, Alemanha',
  'Rotterdam, Países Baixos', 'Bruxelas, Bélgica', 'Bern, Suíça', 'Salzburg, Áustria', 'Viena, Áustria',
  'Bologna, Itália', 'Firenze, Itália', 'Napoli, Itália', 'Roma, Itália', 'Torino, Itália', 'Venezia, Itália',
  'Lisboa, Portugal', 'Porto, Portugal', 'Bilbao, Espanha', 'Madrid, Espanha', 'Málaga, Espanha', 'Sevilla, Espanha', 'Valencia, Espanha',
  'Gdańsk, Polônia', 'Kraków, Polônia', 'Poznań, Polônia', 'Warszawa, Polônia', 'Wrocław, Polônia',
  'Praha, Tchéquia', 'Bratislava, Eslováquia', 'Budapest, Hungria', 'Aarhus, Dinamarca', 'Bergen, Noruega',
  'Stavanger, Noruega', 'Göteborg, Suécia', 'Malmö, Suécia', 'Tampere, Finlândia', 'Turku, Finlândia',
  'Tallinn, Estônia', 'Rīga, Letônia', 'Vilnius, Lituânia', 'București, Romênia', 'Cluj-Napoca, Romênia',
  'Sofia, Bulgária', 'İstanbul, Turquia', 'Ljubljana, Eslovênia', 'Zagreb, Croácia', 'Sarajevo, Bósnia e Herzegovina',
  'Beograd, Sérvia', 'Podgorica, Montenegro', 'Pristina, Kosovo', 'Skopje, Macedônia do Norte', 'Tirana, Albânia',
  'Athína, Grécia', 'Thessaloníki, Grécia',
])

const ETS2_REGIONAL_CITIES = new Set([
  'Aberdeen, Reino Unido', 'Cambridge, Reino Unido', 'Cardiff, Reino Unido', 'Newcastle upon Tyne, Reino Unido', 'Sheffield, Reino Unido', 'Southampton, Reino Unido',
  'Dijon, França', 'Montpellier, França', 'Nantes, França', 'Rennes, França', 'Strasbourg, França',
  'Bremen, Alemanha', 'Dortmund, Alemanha', 'Dresden, Alemanha', 'Hannover, Alemanha', 'Leipzig, Alemanha', 'Nürnberg, Alemanha',
  'Groningen, Países Baixos', 'Liège, Bélgica', 'Graz, Áustria', 'Innsbruck, Áustria', 'Linz, Áustria',
  'Bari, Itália', 'Cagliari, Itália', 'Catania, Itália', 'Genova, Itália', 'Palermo, Itália', 'Trieste, Itália', 'Verona, Itália',
  'Coimbra, Portugal', 'Faro, Portugal', 'A Coruña, Espanha', 'Córdoba, Espanha', 'Murcia, Espanha', 'Zaragoza, Espanha',
  'Katowice, Polônia', 'Łódź, Polônia', 'Szczecin, Polônia', 'Brno, Tchéquia', 'Ostrava, Tchéquia',
  'Košice, Eslováquia', 'Debrecen, Hungria', 'Pécs, Hungria', 'Szeged, Hungria', 'Aalborg, Dinamarca', 'Odense, Dinamarca',
  'Kristiansand, Noruega', 'Trondheim, Noruega', 'Jönköping, Suécia', 'Linköping, Suécia', 'Uppsala, Suécia',
  'Oulu, Finlândia', 'Tartu, Estônia', 'Daugavpils, Letônia', 'Liepāja, Letônia', 'Kaunas, Lituânia', 'Klaipėda, Lituânia',
  'Brașov, Romênia', 'Constanța, Romênia', 'Iași, Romênia', 'Timișoara, Romênia', 'Burgas, Bulgária', 'Plovdiv, Bulgária', 'Varna, Bulgária',
  'Maribor, Eslovênia', 'Rijeka, Croácia', 'Split, Croácia', 'Banja Luka, Bósnia e Herzegovina', 'Mostar, Bósnia e Herzegovina',
  'Novi Sad, Sérvia', 'Niš, Sérvia', 'Durrës, Albânia', 'Pátra, Grécia', 'Irákleio, Grécia',
])

const CITY_OVERRIDES = {
  ats: {
    'San Francisco, CA': { label: 'Metrópole de custo excepcional', costFactor: 1.30, salaryFactor: 1.10 },
    'San Rafael, CA': { label: 'Área metropolitana de custo muito alto', costFactor: 1.24, salaryFactor: 1.08 },
    'Oakland, CA': { label: 'Metrópole de custo muito alto', costFactor: 1.22, salaryFactor: 1.08 },
    'Santa Cruz, CA': { label: 'Cidade litorânea de custo muito alto', costFactor: 1.22, salaryFactor: 1.05 },
    'Truckee, CA': { label: 'Mercado turístico de custo alto', costFactor: 1.18, salaryFactor: 1 },
    'Los Angeles, CA': { label: 'Metrópole de custo alto', costFactor: 1.16, salaryFactor: 1.08 },
    'Seattle, WA': { label: 'Metrópole de custo alto', costFactor: 1.18, salaryFactor: 1.08 },
    'Jackson, WY': { label: 'Mercado turístico de custo excepcional', costFactor: 1.26, salaryFactor: 1.02 },
  },
  ets2: {
    'Londres, Reino Unido': { label: 'Capital de custo excepcional', costFactor: 1.28, salaryFactor: 1.10 },
    'Paris, França': { label: 'Capital de custo muito alto', costFactor: 1.22, salaryFactor: 1.09 },
    'Zürich, Suíça': { label: 'Metrópole de custo excepcional', costFactor: 1.24, salaryFactor: 1.09 },
    'Genève, Suíça': { label: 'Metrópole de custo excepcional', costFactor: 1.22, salaryFactor: 1.08 },
    'Oslo, Noruega': { label: 'Capital de custo muito alto', costFactor: 1.20, salaryFactor: 1.09 },
    'München, Alemanha': { label: 'Metrópole de custo muito alto', costFactor: 1.18, salaryFactor: 1.08 },
    'København, Dinamarca': { label: 'Capital de custo muito alto', costFactor: 1.17, salaryFactor: 1.08 },
    'Luxemburgo, Luxemburgo': { label: 'Capital de custo muito alto', costFactor: 1.16, salaryFactor: 1.07 },
    'Stockholm, Suécia': { label: 'Capital de custo alto', costFactor: 1.15, salaryFactor: 1.07 },
    'Milano, Itália': { label: 'Metrópole de custo alto', costFactor: 1.15, salaryFactor: 1.07 },
    'Barcelona, Espanha': { label: 'Metrópole de custo alto', costFactor: 1.14, salaryFactor: 1.06 },
    'Lisboa, Portugal': { label: 'Capital de custo alto', costFactor: 1.12, salaryFactor: 1.05 },
    'Helsinki, Finlândia': { label: 'Capital de custo alto', costFactor: 1.12, salaryFactor: 1.06 },
    'İstanbul, Turquia': { label: 'Metrópole de custo alto', costFactor: 1.12, salaryFactor: 1.06 },
  },
}

function positiveFactor(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function tierForCity(gameId, city) {
  const overrides = CITY_OVERRIDES[gameId] || {}
  if (overrides[city]) return { key: 'custom', ...overrides[city] }

  const premiumCities = gameId === 'ets2' ? ETS2_PREMIUM_CITIES : ATS_PREMIUM_CITIES
  const majorCities = gameId === 'ets2' ? ETS2_MAJOR_CITIES : ATS_MAJOR_CITIES
  const regionalCities = gameId === 'ets2' ? ETS2_REGIONAL_CITIES : ATS_REGIONAL_CITIES
  if (premiumCities.has(city)) return MARKET_TIERS[gameId].premium
  if (majorCities.has(city)) return MARKET_TIERS[gameId].major
  if (regionalCities.has(city)) return MARKET_TIERS[gameId].regional
  return MARKET_TIERS[gameId].smaller
}

export function getCityMarketProfile(gameId = 'ats', city = '', snapshot = {}) {
  const normalizedGameId = gameId === 'ets2' ? 'ets2' : 'ats'
  const normalizedCity = String(city || '').trim()
  const knownCities = normalizedGameId === 'ets2' ? ETS2_CITIES : ATS_CITIES
  const isKnown = knownCities.includes(normalizedCity)
  const inferred = isKnown
    ? tierForCity(normalizedGameId, normalizedCity)
    : { key: 'reference', label: normalizedCity ? 'Referência da sede para cidade de mod' : 'Referência da sede', costFactor: 1, salaryFactor: 1 }
  const hasSavedFactors = Number(snapshot.costFactor) > 0 && Number(snapshot.salaryFactor) > 0

  return {
    version: CITY_MARKET_VERSION,
    city: normalizedCity,
    key: hasSavedFactors ? 'snapshot' : inferred.key,
    label: hasSavedFactors && String(snapshot.label || '').trim() ? String(snapshot.label).trim() : inferred.label,
    costFactor: positiveFactor(snapshot.costFactor, inferred.costFactor),
    salaryFactor: positiveFactor(snapshot.salaryFactor, inferred.salaryFactor),
    isKnown,
    isSnapshot: hasSavedFactors,
    sources: CITY_MARKET_SOURCES[normalizedGameId],
  }
}
