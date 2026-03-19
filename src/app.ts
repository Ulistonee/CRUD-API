import Fastify from 'fastify';
import { productsRoutes } from './routes/products';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(productsRoutes, { prefix: '/api' });

  return app;
}