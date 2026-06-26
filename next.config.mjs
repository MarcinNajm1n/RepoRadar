/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    "/*": [
      "./next.config.mjs",
      "./.agents/**/*",
      "./.codex/**/*",
      "./graphify-out/**/*",
      "./logs/**/*",
      "./reports/**/*",
      "./test-results/**/*"
    ]
  }
};

export default nextConfig;
