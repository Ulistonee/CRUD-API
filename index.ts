import 'dotenv/config';
import { buildApp } from './src/app';

const app = buildApp();
const port = Number(process.env.PORT ?? 4000);

app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});