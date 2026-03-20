import { z } from 'zod';

export const productBodySchema = z.object({
  name: z.string().min(1, 'name cannot be empty'),
  description: z.string().min(1, 'description cannot be empty'),
  price: z.number({ error: 'price must be a number' }).positive('price must be > 0'),
  category: z.string().min(1, 'category cannot be empty'),
  inStock: z.boolean({ error: 'inStock must be a boolean' }),
});

export type ProductBody = z.infer<typeof productBodySchema>;
