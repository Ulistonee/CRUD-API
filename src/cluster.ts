import 'dotenv/config';
import cluster from 'node:cluster';
import http from 'node:http';
import net from 'node:net';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Product } from './store/product-store';
import { products } from './store/product-store';

type StoreOperation = 'getAll' | 'getById' | 'create' | 'update' | 'delete' | 'clear';

type StoreRequest = {
  type: 'store:request';
  requestId: string;
  operation: StoreOperation;
  payload?: Product | string;
};

type StoreResponse = {
  type: 'store:response';
  requestId: string;
  success: boolean;
  payload?: Product | Product[];
  error?: string;
};

function hasStringId(value: unknown): value is { id: string } {
  return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

const basePort = Number(process.env.PORT ?? 4000);
const workerCount = Math.max(1, availableParallelism() - 1);
const portRangeSize = workerCount + 1;

function buildWorkerPorts(startPort: number): number[] {
  return Array.from({ length: workerCount }, (_, index) => startPort + index + 1);
}

function canListenOnPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port);
  });
}

async function findAvailablePortRange(startPort: number): Promise<number> {
  let candidate = startPort;

  while (true) {
    const ports = Array.from({ length: portRangeSize }, (_, index) => candidate + index);
    const checks = await Promise.all(ports.map((port) => canListenOnPort(port)));
    if (checks.every(Boolean)) {
      return candidate;
    }
    candidate += portRangeSize;
  }
}

if (cluster.isPrimary) {
  let activeBasePort = basePort;
  let workerPorts: number[] = [];
  let rrIndex = 0;

  const resolveWorkerPort = (): number => {
    const port = workerPorts[rrIndex];
    rrIndex = (rrIndex + 1) % workerPorts.length;
    return port;
  };

  const sendStoreResponse = (workerId: number, response: StoreResponse) => {
    const workers = cluster.workers ?? {};
    const worker = workers[workerId];
    worker?.send(response);
  };

  const handleStoreRequest = (workerId: number, request: StoreRequest) => {
    try {
      switch (request.operation) {
        case 'getAll':
          sendStoreResponse(workerId, { type: 'store:response', requestId: request.requestId, success: true, payload: products });
          return;
        case 'getById': {
          if (!hasStringId(request.payload)) {
            throw new Error('Missing product id for getById.');
          }
          const id = request.payload.id;
          const product = products.find((item) => item.id === id);
          sendStoreResponse(workerId, { type: 'store:response', requestId: request.requestId, success: true, payload: product });
          return;
        }
        case 'create': {
          const payload = request.payload as Omit<Product, 'id'>;
          const created: Product = { id: randomUUID(), ...payload };
          products.push(created);
          sendStoreResponse(workerId, { type: 'store:response', requestId: request.requestId, success: true, payload: created });
          return;
        }
        case 'update': {
          const payload = request.payload as Product;
          const product = products.find((item) => item.id === payload.id);
          if (!product) {
            throw new Error(`Product with id ${payload.id} not found.`);
          }
          product.name = payload.name;
          product.description = payload.description;
          product.price = payload.price;
          product.category = payload.category;
          product.inStock = payload.inStock;
          sendStoreResponse(workerId, { type: 'store:response', requestId: request.requestId, success: true, payload: product });
          return;
        }
        case 'delete': {
          const id = (request.payload as { id: string }).id;
          const productIndex = products.findIndex((item) => item.id === id);
          if (productIndex === -1) {
            throw new Error(`Product with id ${id} not found.`);
          }
          const [deleted] = products.splice(productIndex, 1);
          sendStoreResponse(workerId, { type: 'store:response', requestId: request.requestId, success: true, payload: deleted });
          return;
        }
        case 'clear':
          products.splice(0, products.length);
          sendStoreResponse(workerId, { type: 'store:response', requestId: request.requestId, success: true });
          return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Store operation failed.';
      sendStoreResponse(workerId, {
        type: 'store:response',
        requestId: request.requestId,
        success: false,
        error: message,
      });
    }
  };

  cluster.setupPrimary({
    exec: join(process.cwd(), 'dist', 'index.js'),
  });

  cluster.on('exit', (worker) => {
    console.error(`Worker ${worker.process.pid} exited.`);
  });

  const balancer = http.createServer((req, res) => {
    
    const targetPort = resolveWorkerPort();
    const proxy = http.request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxy.on('error', () => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'Bad gateway.' }));
    });

    req.pipe(proxy);
  });

  const startPrimary = async () => {
    activeBasePort = await findAvailablePortRange(basePort);
    workerPorts = buildWorkerPorts(activeBasePort);
    rrIndex = 0;

    if (activeBasePort !== basePort) {
      console.warn(`Ports ${basePort}-${basePort + portRangeSize - 1} are busy. Using ${activeBasePort}-${activeBasePort + portRangeSize - 1}.`);
    }

    for (let index = 0; index < workerCount; index++) {
      const worker = cluster.fork({
        ...process.env,
        CLUSTER_MODE: 'true',
        CLUSTER_ROLE: 'worker',
        WORKER_PORT: String(workerPorts[index]),
      });

      worker.on('message', (message: StoreRequest) => {
        if (message?.type === 'store:request') {
          handleStoreRequest(worker.id, message);
        }
      });
    }

    balancer.listen(activeBasePort, () => {
      console.log(`Load balancer is listening on http://localhost:${activeBasePort}/api`);
      console.log(`Workers are listening on: ${workerPorts.map((port) => `http://localhost:${port}/api`).join(', ')}`);
    });
  };

  startPrimary().catch((error) => {
    console.error('Failed to start cluster:', error);
    process.exit(1);
  });
}
