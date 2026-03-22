import { describe, it, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import { productStore } from '../src/store/product-store';

const VALID_PRODUCT = {
  name: 'Laptop',
  description: 'A powerful laptop',
  price: 999.99,
  category: 'electronics',
  inStock: true,
};

describe('Products API', () => {
  const app = buildApp();

  before(async () => {
    await app.ready();
  });

  afterEach(async () => {
    await productStore.clear();
  });

  describe('Full CRUD flow', () => {
    it('1. GET /api/products returns empty array initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/products' });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.json(), []);
    });

    it('2. POST /api/products creates a new product', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: VALID_PRODUCT,
      });
      assert.equal(res.statusCode, 201);
      const body = res.json();
      assert.ok(body.id);
      assert.equal(body.name, VALID_PRODUCT.name);
      assert.equal(body.price, VALID_PRODUCT.price);
    });

    it('3. GET /api/products/:id returns the created product', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: VALID_PRODUCT,
      });
      const { id } = created.json();

      const res = await app.inject({ method: 'GET', url: `/api/products/${id}` });
      assert.equal(res.statusCode, 200);
      assert.equal(res.json().id, id);
    });

    it('4. PUT /api/products/:id updates the product and keeps same id', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: VALID_PRODUCT,
      });
      const { id } = created.json();

      const updated = { ...VALID_PRODUCT, name: 'Gaming Laptop', price: 1499.99 };
      const res = await app.inject({
        method: 'PUT',
        url: `/api/products/${id}`,
        payload: updated,
      });
      assert.equal(res.statusCode, 200);
      const body = res.json();
      assert.equal(body.id, id);
      assert.equal(body.name, 'Gaming Laptop');
      assert.equal(body.price, 1499.99);
    });

    it('5. DELETE /api/products/:id deletes the product (204)', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: VALID_PRODUCT,
      });
      const { id } = created.json();

      const res = await app.inject({ method: 'DELETE', url: `/api/products/${id}` });
      assert.equal(res.statusCode, 204);
    });

    it('6. GET /api/products/:id returns 404 after deletion', async () => {
      const created = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: VALID_PRODUCT,
      });
      const { id } = created.json();

      await app.inject({ method: 'DELETE', url: `/api/products/${id}` });

      const res = await app.inject({ method: 'GET', url: `/api/products/${id}` });
      assert.equal(res.statusCode, 404);
    });
  });

  describe('Validation errors', () => {
    it('POST with missing name returns 400', async () => {
      const { name: _name, ...withoutName } = VALID_PRODUCT;
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: withoutName,
      });
      assert.equal(res.statusCode, 400);
    });

    it('POST with price = 0 returns 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: { ...VALID_PRODUCT, price: 0 },
      });
      assert.equal(res.statusCode, 400);
    });

    it('POST with negative price returns 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products',
        payload: { ...VALID_PRODUCT, price: -10 },
      });
      assert.equal(res.statusCode, 400);
    });
  });

  describe('productId validation', () => {
    it('GET with invalid uuid returns 400', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/products/not-a-uuid' });
      assert.equal(res.statusCode, 400);
    });

    it('PUT with non-existing uuid returns 404', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/00000000-0000-0000-0000-000000000000',
        payload: VALID_PRODUCT,
      });
      assert.equal(res.statusCode, 404);
    });

    it('DELETE with invalid uuid returns 400', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/products/not-a-uuid' });
      assert.equal(res.statusCode, 400);
    });
  });

  describe('Non-existing routes', () => {
    it('GET unknown route returns 404', async () => {
      const res = await app.inject({ method: 'GET', url: '/some-non/existing/resource' });
      assert.equal(res.statusCode, 404);
    });
  });
});
