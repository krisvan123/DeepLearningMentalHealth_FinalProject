/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Next 14's SWC minifier parses emitted ONNX .mjs assets as scripts.
  // Terser preserves their ESM/import.meta semantics.
  swcMinify: false,
  experimental: { webpackBuildWorker: false, cpus: 2 },
  webpack(config, { isServer }) {
    if (isServer) config.externals.push("onnxruntime-node", "sharp");
    else config.resolve.alias["onnxruntime-node"] = false;
    return config;
  },
};

module.exports = nextConfig;
