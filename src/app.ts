import Fastify from 'fastify';
import { productsRoutes } from './routes/products';

export function buildApp() {
  const app = Fastify();

  app.register(productsRoutes, { prefix: '/api' });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ message: `Route ${_request.method} ${_request.url} not found.` });
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ message: 'Internal server error. Please try again later.' });
  });

  return app;
}