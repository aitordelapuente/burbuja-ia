import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Los CSV y fixtures se leen con fs en tiempo de ejecución: hay que incluirlos en el despliegue.
  outputFileTracingIncludes: {
    '/**': ['./data/**/*', './tests/fixtures/**/*'],
  },
  poweredByHeader: false,
};

export default nextConfig;
