import { fetchCrisisData } from '../services/crisis.service'

const COUNTRY_KEY = 'COUNTRY_CSV'
const HELPLINE_KEY = 'HELPLINE_CSV'

export const getAll = async (c: any) => {
  const data = await fetchCrisisData(c.env, c.executionCtx)
  return c.json(data)
}

export const byCountry = async (c: any) => {
  const name = c.req.query('country')
  if (!name) return c.json({ error: 'Country required' }, 400)

  const data = await fetchCrisisData(c.env, c.executionCtx)
  return c.json(data[name] || [])
}

export const refreshData = async (c: any) => {
  const cache = caches.default
  await cache.delete(new Request(c.env.COUNTRY_CSV_URL + `?cacheKey=${COUNTRY_KEY}`))
  await cache.delete(new Request(c.env.HELPLINE_CSV_URL + `?cacheKey=${HELPLINE_KEY}`))

  const data = await fetchCrisisData(c.env, c.executionCtx)
  return c.json({ message: 'Refreshed', totalCountries: Object.keys(data).length })
}
