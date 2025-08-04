import Papa from 'papaparse'
import { HelplineRowInterface } from '../types/helpline_row.types'
import { CountryDataInterface } from '../types/country.types'

const COUNTRY_KEY = 'COUNTRY_CSV'
const HELPLINE_KEY = 'HELPLINE_CSV'
const CACHE_TTL = (1 * 60) // 1 minutes

function parseCSV<T = any>(text: string): T[] {
  const { data, errors } = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
  })
  if (errors.length) console.warn('[CSV parser] parsed with errors', errors)
  return data
}

async function fetchWithEdgeCache(
  key: string,
  url: string,
  ctx: ExecutionContext
): Promise<string> {
  const cache = caches.default
  const req = new Request(url + `?cacheKey=${key}`)
  const match = await cache.match(req)

  if (match) return await match.text()

  const res = await fetch(url, { cf: { cacheTtl: CACHE_TTL, cacheEverything: true } })
  if (!res.ok) throw new Error(`Failed to fetch CSV ${url}: ${res.status}`)

  const body = await res.arrayBuffer()
  const text = new TextDecoder().decode(body)
  const headers = new Headers(res.headers)
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`)

  const cacheRes = new Response(body, { status: res.status, statusText: res.statusText, headers })
  ctx.waitUntil(cache.put(req, cacheRes))

  return text
}

export async function fetchCrisisData(
  env: { COUNTRY_CSV_URL: string; HELPLINE_CSV_URL: string },
  ctx: ExecutionContext
): Promise<Record<string, HelplineRowInterface[]>> {
  const [countriesCsvText, helplinesCsvText] = await Promise.all([
    fetchWithEdgeCache(COUNTRY_KEY, env.COUNTRY_CSV_URL, ctx),
    fetchWithEdgeCache(HELPLINE_KEY, env.HELPLINE_CSV_URL, ctx),
  ])

  const countriesRaw = parseCSV<CountryDataInterface>(countriesCsvText)
  const helplinesRaw = parseCSV<HelplineRowInterface>(helplinesCsvText)

  const countriesData: Record<string, CountryDataInterface> = {}
  for (const row of countriesRaw) {
    const key = row.country || row.I18nKey
    if (row.code && key) {
      countriesData[key] = {
        country: row.country,
        code: row.code,
        aliases: row.aliases,
        topicMenu: !!row.topicMenu,
        I18nKey: row.I18nKey,
      }
    }
  }

  const result: Record<string, HelplineRowInterface[]> = {}
  for (const row of helplinesRaw) {
    const country = (row as any).country?.trim()
    if (!country) continue

    const helpline: HelplineRowInterface = {
      country,
      countryI18nKey: country,
      countryCode: row.countryCode?.trim() ?? '',
      name: row.name?.trim() ?? '',
      description: row.description?.trim() ?? '',
      url: row.url?.trim() ?? '',
      displayUrl: row.displayURL?.trim() ?? '',
      phone: row.phone?.trim() ?? '',
      displayNumber: row.displayNumber?.replace(/-/g, '').trim() ?? '',
      formattedCallNumber: row.formattedCallNumber?.trim() ?? '',
      formattedTextingNumber: row.formattedTextingNumber?.trim() ?? '',
      availability: row.twentyFourSeven?.trim() ?? '',
      modality: row.modality?.trim() ?? '',
      identity: row.identity?.trim() ?? '',
      topic: row.topic?.trim(),
      topicMenu: row.topicMenu ?? false,
    }

    result[country] = result[country] ?? []
    result[country].push(helpline)

    const aliases = countriesData[country]?.aliases || []
    for (const alias of aliases) {
      result[alias] = result[alias] ?? []
      result[alias].push(helpline)
    }
  }

  return result
}

