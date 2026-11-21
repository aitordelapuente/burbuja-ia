// Configuración de los tests de contrato EN VIVO (J4). No forman parte de `pnpm test`.
// Uso: pnpm vitest run --config vitest.contract.config.mts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/contract/**/*.test.ts'],
    testTimeout: 60_000,
    // En serie: SEC limita a 10 peticiones por segundo y GDELT/otros son sensibles al ritmo.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
