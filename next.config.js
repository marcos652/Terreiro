// Next.js Turbopack config: force root to this project to silence lockfile warning
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
