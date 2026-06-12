import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: { NODE_ENV: 'test' },
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
    },
  },
});
