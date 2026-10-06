import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json en la carpeta personal: fija la raíz en este proyecto.
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
};

export default nextConfig;
