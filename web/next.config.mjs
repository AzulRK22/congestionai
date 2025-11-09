import path from "node:path";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
};

export default nextConfig;
