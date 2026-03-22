import { FastifyReply } from 'fastify';
import { FastifyInstance } from 'fastify';
import { Product, productStore } from '../store/product-store';
import { productBodySchema, ProductBody } from '../schemas/product';
import { isUuid } from '../utils/utils';

type GetProductParams = {
  productId: string;
};

async function resolveProduct(productId: string, reply: FastifyReply): Promise<Product | null> {
  if (!isUuid(productId)) {
    reply.code(400).send({ message: 'Invalid productId. It must be a UUID.' });
    return null;
  }
  const product = await productStore.getById(productId);
  if (!product) {
    reply.code(404).send({ message: `Product with id ${productId} not found.` });
    return null;
  }
  return product;
}

export async function productsRoutes(app: FastifyInstance) {
  app.get('/products', async (_request, reply) => {
    const items = await productStore.getAll();
    return reply.code(200).send(items);
  });

  app.get<{ Params: GetProductParams }>('/products/:productId', async (request, reply) => {
    const product = await resolveProduct(request.params.productId, reply);
    if (!product) return;
    return reply.code(200).send(product);
  });

  app.post<{ Body: ProductBody }>('/products', async (request, reply) => {
    const parsed = productBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0].message });
    }
    const { name, description, price, category, inStock } = parsed.data;
    const product = await productStore.create(name, description, price, category, inStock);
    return reply.code(201).send(product);
  });

  app.put<{ Params: GetProductParams; Body: ProductBody }>('/products/:productId', async (request, reply) => {
    const existing = await resolveProduct(request.params.productId, reply);
    if (!existing) return;
    const parsed = productBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0].message });
    }
    const { name, description, price, category, inStock } = parsed.data;
    const product = await productStore.update(existing.id, name, description, price, category, inStock);
    return reply.code(200).send(product);
  });

  app.delete<{ Params: GetProductParams }>('/products/:productId', async (request, reply) => {
    const existing = await resolveProduct(request.params.productId, reply);
    if (!existing) return;
    await productStore.delete(existing.id);
    return reply.code(204).send();
  });
}