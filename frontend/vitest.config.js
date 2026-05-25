import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{js,jsx}', 'src/**/*.e2e.test.{js,jsx}'],
    globals: false,
  },
});
