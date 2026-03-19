import { FastifyReply } from 'fastify';
import { FastifyInstance } from 'fastify';
import { Product, productStore } from '../store/product-store';
import { isUuid } from '../utils/utils';

type GetProductParams = {
  productId: string;
};

type ProductBody = {
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
};

function resolveProduct(productId: string, reply: FastifyReply): Product | null {
  if (!isUuid(productId)) {
    reply.code(400).send({ message: 'Invalid productId. It must be a UUID.' });
    return null;
  }
  const product = productStore.getById(productId);
  if (!product) {
    reply.code(404).send({ message: `Product with id ${productId} not found.` });
    return null;
  }
  return product;
}

export async function productsRoutes(app: FastifyInstance) {
  app.get('/products', async (_request, reply) => {
    return reply.code(200).send(productStore.getAll());
  });

  app.get<{ Params: GetProductParams }>('/products/:productId', async (request, reply) => {
    const product = resolveProduct(request.params.productId, reply);
    if (!product) return;
    return reply.code(200).send(product);
  });

  app.post<{ Body: ProductBody }>('/products', async (request, reply) => {
    const { name, description, price, category, inStock } = request.body;
    const product = productStore.create(name, description, price, category, inStock);
    return reply.code(201).send(product);
  });

  app.put<{ Params: GetProductParams; Body: ProductBody }>('/products/:productId', async (request, reply) => {
    const existing = resolveProduct(request.params.productId, reply);
    if (!existing) return;
    const { name, description, price, category, inStock } = request.body;
    const product = productStore.update(existing.id, name, description, price, category, inStock);
    return reply.code(200).send(product);
  });

  app.delete<{ Params: GetProductParams }>('/products/:productId', async (request, reply) => {
    const existing = resolveProduct(request.params.productId, reply);
    if (!existing) return;
    productStore.delete(existing.id);
    return reply.code(204).send();
  });
}