/**
 * Standard English alphabetical country list for international forms.
 */
export const countries = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo, Democratic Republic of the',
  'Congo, Republic of the',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Korea, North',
  'Korea, South',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
]

/**
 * Common search aliases mapped to their exact canonical name in the `countries` list.
 * NOTE: Used ONLY for search matching. Selected value always remains the canonical country string.
 */
export const COUNTRY_ALIASES = {
  'United States': [
    'usa',
    'us',
    'u.s.a',
    'u.s.',
    'united states of america',
    'america',
  ],
  'United Kingdom': [
    'uk',
    'u.k',
    'u.k.',
    'great britain',
    'britain',
    'england',
    'scotland',
    'wales',
    'northern ireland',
  ],
  'United Arab Emirates': [
    'uae',
    'u.a.e',
    'u.a.e.',
    'emirates',
    'dubai',
    'abu dhabi',
  ],
  'Korea, South': [
    'south korea',
    'korea south',
    'korea, south',
    'korea (south)',
    'republic of korea',
    'rok',
  ],
  'Korea, North': [
    'north korea',
    'korea north',
    'korea, north',
    'korea (north)',
    'dprk',
    'democratic peoples republic of korea',
  ],
  'Russia': [
    'russian federation',
    'russia',
  ],
  'Netherlands': [
    'holland',
    'the netherlands',
  ],
  'Czech Republic': [
    'czechia',
  ],
  'Vatican City': [
    'vatican',
    'holy see',
  ],
  'Vietnam': [
    'viet nam',
  ],
  'Syria': [
    'syrian arab republic',
  ],
  'Tanzania': [
    'united republic of tanzania',
  ],
  'Congo, Democratic Republic of the': [
    'drc',
    'dr congo',
    'democratic republic of the congo',
    'congo kinshasa',
  ],
  'Congo, Republic of the': [
    'republic of the congo',
    'congo brazzaville',
  ],
  'Cabo Verde': [
    'cape verde',
  ],
  'Saint Kitts and Nevis': [
    'st kitts',
    'st. kitts',
  ],
  'Saint Lucia': [
    'st lucia',
    'st. lucia',
  ],
  'Saint Vincent and the Grenadines': [
    'st vincent',
    'st. vincent',
  ],
}

/**
 * Normalizes text for search matching:
 * - strips diacritics/accents (.normalize('NFD'))
 * - lowercases
 * - replaces punctuation, apostrophes, hyphens with spaces
 * - collapses whitespace
 * - trims
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeCountrySearchText(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`".,\-–—/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Computes match score for a country name against normalized query tokens.
 * Lower score = higher relevance / priority.
 * Returns -1 if no match.
 */
function getCountryMatchScore(countryName, normQuery, queryTokens, compactQuery) {
  const normCountry = normalizeCountrySearchText(countryName)
  const compactCountry = normCountry.replace(/\s+/g, '')
  const countryTokens = normCountry.split(' ').filter(Boolean)

  // Tier 1: Exact match on normalized country name
  if (normCountry === normQuery || compactCountry === compactQuery) {
    return 100
  }

  // Tier 1.5: Exact match on search alias
  const aliases = COUNTRY_ALIASES[countryName] || []
  for (const alias of aliases) {
    const normAlias = normalizeCountrySearchText(alias)
    const compactAlias = normAlias.replace(/\s+/g, '')
    if (normAlias === normQuery || compactAlias === compactQuery) {
      return 110
    }
  }

  // Tier 2: Country name starts with query
  if (normCountry.startsWith(normQuery) || compactCountry.startsWith(compactQuery)) {
    return 200
  }

  // Tier 2.5: Alias starts with query
  for (const alias of aliases) {
    const normAlias = normalizeCountrySearchText(alias)
    const compactAlias = normAlias.replace(/\s+/g, '')
    if (normAlias.startsWith(normQuery) || compactAlias.startsWith(compactQuery)) {
      return 210
    }
  }

  // Tier 3: Multi-token prefix match (e.g. "united k" -> "United Kingdom")
  if (queryTokens.length > 1) {
    const isOrderedTokenMatch = (targetTokens) => {
      let qIdx = 0
      for (let tIdx = 0; tIdx < targetTokens.length && qIdx < queryTokens.length; tIdx++) {
        if (targetTokens[tIdx].startsWith(queryTokens[qIdx])) {
          qIdx++
        }
      }
      return qIdx === queryTokens.length
    }

    if (isOrderedTokenMatch(countryTokens)) {
      return 300
    }

    for (const alias of aliases) {
      const aliasTokens = normalizeCountrySearchText(alias).split(' ').filter(Boolean)
      if (isOrderedTokenMatch(aliasTokens)) {
        return 310
      }
    }
  }

  // Tier 4: Any word in country starts with query (e.g. "arab" -> "United Arab Emirates", "zealand" -> "New Zealand")
  for (let i = 0; i < countryTokens.length; i++) {
    if (countryTokens[i].startsWith(normQuery)) {
      return 400 + i
    }
  }

  // Tier 4.5: Any word in alias starts with query
  for (const alias of aliases) {
    const aliasTokens = normalizeCountrySearchText(alias).split(' ').filter(Boolean)
    for (let i = 0; i < aliasTokens.length; i++) {
      if (aliasTokens[i].startsWith(normQuery)) {
        return 410 + i
      }
    }
  }

  // Tier 5: All query tokens match a word prefix in country
  if (queryTokens.length > 1) {
    const allTokensMatchPrefix = queryTokens.every((qToken) =>
      countryTokens.some((cToken) => cToken.startsWith(qToken)),
    )
    if (allTokensMatchPrefix) {
      return 450
    }
  }

  // Tier 6: Substring match inside country name (e.g. "stan" -> "Pakistan")
  const subIdx = normCountry.indexOf(normQuery)
  if (subIdx !== -1) {
    return 500 + subIdx
  }

  // Tier 6.5: Substring match inside alias
  for (const alias of aliases) {
    const normAlias = normalizeCountrySearchText(alias)
    const aSubIdx = normAlias.indexOf(normQuery)
    if (aSubIdx !== -1) {
      return 510 + aSubIdx
    }
  }

  // Tier 7: Compact substring match
  if (compactCountry.includes(compactQuery)) {
    return 550
  }

  return -1
}

/**
 * Filters and intelligently ranks countries based on normalized search query.
 *
 * Behavior:
 * - Empty query: returns original country list in A-Z order.
 * - Non-empty query: returns ranked matches (Exact -> Prefix -> Token Match -> Word Match -> Substring).
 * - Same rank tier: maintains alphabetical order.
 *
 * @param {string[]} countryList - Array of country names (defaults to full countries list)
 * @param {string} query - User search query
 * @returns {string[]} Filtered and sorted country names
 */
export function filterCountries(countryList = countries, query = '') {
  if (!query || !query.trim()) {
    return countryList
  }

  const normQuery = normalizeCountrySearchText(query)
  if (!normQuery) {
    return countryList
  }

  const compactQuery = normQuery.replace(/\s+/g, '')
  const queryTokens = normQuery.split(' ').filter(Boolean)

  const matches = []

  for (const country of countryList) {
    const score = getCountryMatchScore(country, normQuery, queryTokens, compactQuery)
    if (score !== -1) {
      matches.push({ country, score })
    }
  }

  matches.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score
    }
    return a.country.localeCompare(b.country)
  })

  return matches.map((m) => m.country)
}
