import { log } from 'console';
import { randomUUID } from 'crypto';
import { products } from '../utils/utils';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
};


export const productStore = {
  getAll(): Product[] {
    return products;
  },
  getById(id: string): Product | undefined {
    return products.find((product) => product.id === id);
  },
  create(name: string, description: string, price: number, category: string, inStock: boolean): Product {
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
  update(id: string, name: string, description: string, price: number, category: string, inStock: boolean): Product {
    const product = products.find((product) => product.id === id);
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
  delete(id: string): Product {
    const product = products.find((product) => product.id === id);
    if (!product) {
      throw new Error(`Product with id ${id} not found.`);
    }
    products.splice(products.indexOf(product), 1);
    return product;
  },
};