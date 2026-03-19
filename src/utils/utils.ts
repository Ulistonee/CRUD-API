import { randomUUID } from 'crypto';
import { Product } from '../store/product-store';

export function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

const categories = ['Electronics', 'Clothing', 'Books', 'Toys', 'Food', 'Sports'];
export const products: Product[] = [];

function randomPrice(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

for (let i = 1; i <= 100; i++) {
  const product: Product = {
    id: randomUUID(),
    name: `Product ${i}`,
    description: `Description for Product ${i}`,
    price: randomPrice(5, 500),
    category: categories[Math.floor(Math.random() * categories.length)],
    inStock: randomBoolean(),
  };
  products.push(product);
}