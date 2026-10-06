import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto para que Turbopack no busque lock files más arriba.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
