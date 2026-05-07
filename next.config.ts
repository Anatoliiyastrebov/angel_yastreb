import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Если выше по дереву есть другой package-lock.json, Next иначе берёт «корень монорепы» не тем и портит чанки / tracing — см. предупреждение про inferred workspace root. */
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
