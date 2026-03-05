// Next.js Turbopack config: force root to this project to silence lockfile warning
/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
