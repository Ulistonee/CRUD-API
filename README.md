# CRUD API — Product Catalog

REST API for a simple **Product Catalog** built with [Fastify](https://fastify.dev/). Data is stored **in memory** (single process) or, in **cluster mode**, in the primary process with IPC so all workers share the same state.

---

## Requirements

- **Node.js** `24.10.0` or newer (see `.nvmrc` if present)
- **npm** (comes with Node)

---

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd CRUD-API
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment variables**

   Copy the example file and adjust if needed:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description | Default |
   |----------|-------------|---------|
   | `PORT`   | HTTP port for the app (single instance and load balancer base port in multi mode) | `4000` |

   Do **not** commit `.env` (it is listed in `.gitignore`). Commit only `.env.example`.

---

## Running the application

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Development: runs `index.ts` with auto-reload (`ts-node-dev`). |
| `npm run build` | Compiles TypeScript to `dist/`. |
| `npm run start:prod` | Production: builds, then runs `node dist/index.js`. |
| `npm run start:multi` | Horizontal scaling: builds, then runs cluster + load balancer (`node dist/src/cluster.js`). |
| `npm test` | Runs API tests (`tsx --test`). |

### Development

```bash
npm run start:dev
```

The server listens on `http://localhost:<PORT>` (from `.env`, default `4000`). API routes are under **`/api`**.

### Production (single instance)

```bash
npm run start:prod
```

### Cluster mode (load balancer + workers)

```bash
npm run start:multi
```

- A **load balancer** listens on `PORT` (e.g. `4000`) at `/api`.
- **Workers** run Fastify on `PORT + 1`, `PORT + 2`, … (`availableParallelism() - 1` workers).
- Requests to the load balancer are distributed in **round-robin** order.
- If the port range `PORT … PORT + workerCount` is busy, the process picks the **next free block** of ports and logs a warning.

Stop a previous run before starting another, or rely on automatic port shifting (see logs).

---

## API overview

Base path: **`/api`**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | List all products |
| `GET` | `/api/products/:productId` | Get one product by UUID |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/:productId` | Update a product |
| `DELETE` | `/api/products/:productId` | Delete a product |

### Product body (JSON)

| Field | Type | Rules |
|-------|------|--------|
| `name` | string | Required, non-empty |
| `description` | string | Required, non-empty |
| `price` | number | Required, must be **> 0** |
| `category` | string | Required, non-empty |
| `inStock` | boolean | Required |

`id` is generated on the server (UUID).

### Common HTTP status codes

- `200` — OK (GET list, GET one, PUT)
- `201` — Created (POST)
- `204` — No content (DELETE success)
- `400` — Bad request (validation, invalid UUID)
- `404` — Not found (unknown route or missing product)
- `500` — Internal server error

---

## Usage examples

Replace `4000` with your `PORT` if different. In cluster mode, use the load balancer port shown in the console (or `4000` if unchanged).

### List products

```bash
curl -s http://localhost:4000/api/products
```

### Create a product

```bash
curl -s -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","description":"A laptop","price":999.99,"category":"electronics","inStock":true}'
```

### Get one product

```bash
curl -s http://localhost:4000/api/products/<PRODUCT_UUID>
```

### Update a product

```bash
curl -s -X PUT http://localhost:4000/api/products/<PRODUCT_UUID> \
  -H "Content-Type: application/json" \
  -d '{"name":"Gaming Laptop","description":"A laptop","price":1499.99,"category":"electronics","inStock":false}'
```

### Delete a product

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:4000/api/products/<PRODUCT_UUID>
```

### Cluster mode — hit workers directly (optional)

After `npm run start:multi`, check the log for worker URLs, e.g.:

- Load balancer: `http://localhost:4000/api`
- Workers: `http://localhost:4001/api`, `http://localhost:4002/api`, …

You can send requests to the balancer or to individual worker ports; shared state is consistent across workers.

---

## Testing

```bash
npm test
```

Runs the test suite under `tests/` (Node.js test runner via `tsx`).

---

## Project layout (short)

| Path | Role |
|------|------|
| `index.ts` | Entry point for single-instance server |
| `src/app.ts` | Fastify app factory |
| `src/routes/products.ts` | Product routes |
| `src/store/product-store.ts` | In-memory store; IPC to primary in cluster workers |
| `src/cluster.ts` | Cluster primary: workers, load balancer, shared store |
| `tests/` | API tests |

---

## License

See `LICENSE` in the repository root.
