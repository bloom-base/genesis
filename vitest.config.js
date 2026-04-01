import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Only run tests inside our tests/ directory — exclude bun/npm cache.
    include: ['tests/**/*.test.js'],
  }
});
