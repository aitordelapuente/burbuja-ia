import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/maintenance/**/*.test.ts'],
    env: { MOCK_DATA: '1', PANEL_HOY: '2026-11-20' },
  },
});
