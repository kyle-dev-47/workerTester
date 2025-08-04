import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import crisisRoutes from './routes/crisis_helplines.routes';
import { cors } from 'hono/cors';

type Bindings = {
  BEARER_TOKEN: string;
  COUNTRY_CSV_URL: string;
  HELPLINE_CSV_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.use('/*', async (c, next) => {
  const token = c.env.BEARER_TOKEN;
  return bearerAuth({ token })(c, next);
});

app.use('*', async (c, next) => {
  c.set("COUNTRY_CSV_URL", c.env.COUNTRY_CSV_URL);
  c.set("HELPLINE_CSV_URL", c.env.HELPLINE_CSV_URL);
  await next();
});

app.route('/crisis_helplines', crisisRoutes);

export default app;
