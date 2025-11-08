// web/next.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM-safe dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  // Evita el warning de lockfiles/monorepo
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;