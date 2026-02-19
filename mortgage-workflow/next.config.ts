import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // pdf-parse bundles pdfjs-dist which uses DOM APIs — load natively in Node, not bundled
  serverExternalPackages: ["pdf-parse"],
  webpack: (config) => {
    // Prevent canvas from being bundled server-side (needed by pdfjs-dist)
    config.resolve.alias.canvas = false
    return config
  },
  turbopack: {
    resolveAlias: {
      canvas: { browser: "./empty-module.js" },
    },
  },
}

export default nextConfig
