import { Hono } from 'hono'
import { getAll, byCountry, refreshData } from '../controllers/crisis.controller'

export const crisisRoutes = new Hono<{
  Bindings: { COUNTRY_CSV_URL: string; HELPLINE_CSV_URL: string }
}>()

crisisRoutes.get('/', byCountry)
crisisRoutes.get('/all', getAll)
crisisRoutes.post('/refresh', refreshData)

export default crisisRoutes
