import { randomUUID } from 'crypto';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
};

export const products: Product[] = [];

type StoreOperation = 'getAll' | 'getById' | 'create' | 'update' | 'delete' | 'clear';

type StoreRequest = {
  type: 'store:request';
  requestId: string;
  operation: StoreOperation;
  payload?: unknown;
};

type StoreResponse = {
  type: 'store:response';
  requestId: string;
  success: boolean;
  payload?: unknown;
  error?: string;
};

function isClusterWorkerStore(): boolean {
  return process.env.CLUSTER_MODE === 'true' && process.env.CLUSTER_ROLE === 'worker' && typeof process.send === 'function';
}

function requestStore<T>(operation: StoreOperation, payload?: unknown): Promise<T> {
  if (!isClusterWorkerStore()) {
    throw new Error('IPC store is unavailable in non-worker mode.');
  }

  const requestId = randomUUID();
  return new Promise<T>((resolve, reject) => {
    const onMessage = (raw: unknown) => {
      const message = raw as StoreResponse;
      if (message?.type !== 'store:response' || message.requestId !== requestId) {
        return;
      }

      process.off('message', onMessage);
      if (message.success) {
        resolve(message.payload as T);
      } else {
        reject(new Error(message.error ?? 'Store operation failed.'));
      }
    };

    process.on('message', onMessage);
    const message: StoreRequest = { type: 'store:request', requestId, operation, payload };
    process.send?.(message);
  });
}

export const productStore = {
  async getAll(): Promise<Product[]> {
    if (isClusterWorkerStore()) {
      return requestStore<Product[]>('getAll');
    }
    return products;
  },
  async getById(id: string): Promise<Product | undefined> {
    if (isClusterWorkerStore()) {
      return requestStore<Product | undefined>('getById', { id });
    }
    return products.find((product) => product.id === id);
  },
  async create(name: string, description: string, price: number, category: string, inStock: boolean): Promise<Product> {
    if (isClusterWorkerStore()) {
      return requestStore<Product>('create', { name, description, price, category, inStock });
    }
    const product: Product = {
      id: randomUUID(),
      name,
      description,
      price,
      category,
      inStock,
    };
    products.push(product);
    return product;
  },
  async update(id: string, name: string, description: string, price: number, category: string, inStock: boolean): Promise<Product> {
    if (isClusterWorkerStore()) {
      return requestStore<Product>('update', { id, name, description, price, category, inStock });
    }
    const product = products.find((item) => item.id === id);
    if (!product) {
      throw new Error(`Product with id ${id} not found.`);
    }
    product.name = name;
    product.description = description;
    product.price = price;
    product.category = category;
    product.inStock = inStock;
    return product;
  },
  async delete(id: string): Promise<Product> {
    if (isClusterWorkerStore()) {
      return requestStore<Product>('delete', { id });
    }
    const product = products.find((item) => item.id === id);
    if (!product) {
      throw new Error(`Product with id ${id} not found.`);
    }
    products.splice(products.indexOf(product), 1);
    return product;
  },
  async clear(): Promise<void> {
    if (isClusterWorkerStore()) {
      await requestStore<void>('clear');
      return;
    }
    products.splice(0, products.length);
  },
};