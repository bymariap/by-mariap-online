import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Pin the test runner timezone so date-based tests are deterministic
// regardless of the host machine's local timezone.
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
