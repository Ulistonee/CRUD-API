import 'dotenv/config';
import { buildApp } from './src/app';

const app = buildApp();
// В cluster-режиме master задаёт WORKER_PORT; иначе — PORT из .env (см. .env.example)
const port = Number(process.env.WORKER_PORT ?? process.env.PORT ?? 4000);

app.listen({ port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});