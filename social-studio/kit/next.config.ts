import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isProd ? "" : " ws:"}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const https = (process.env.APP_URL ?? "").startsWith("https://");

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  poweredByHeader: false,
  // Solo en desarrollo: permitir abrir el servidor de desarrollo a través del túnel de Cloudflare (HTTPS para TikTok/Meta)
  allowedDevOrigins: ["*.trycloudflare.com"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // CSP: solo recursos propios; imágenes también de los CDN de las redes (avatares, miniaturas).
          // 'unsafe-inline' en scripts lo necesita Next sin nonces; 'unsafe-eval' solo en desarrollo.
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
      {
        // Los vídeos subidos nunca se ejecutan como documento aunque alguien los abra directamente
        source: "/api/media/:id/file",
        headers: [{ key: "Content-Security-Policy", value: "sandbox; frame-ancestors 'none'" }],
      },
    ];
  },
};

export default nextConfig;
