import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

// Alle Assets, Skripte und Schriften kommen von 'self' (next/font liefert
// Inter und Rajdhani aus dem Build). Blob-URLs sind für STL/ZIP-Download nötig,
// Web Worker werden von Three.js teils aus Blobs geladen. Im Dev-Modus benötigt
// React Refresh 'unsafe-eval' und WebSocket-HMR.
const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    `connect-src 'self'${isProd ? "" : " ws: http://localhost:*"}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "media-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), gyroscope=(), magnetometer=(), interest-cohort=()"
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
];

/** @type {import("next").NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    experimental: {
        typedRoutes: false,
        serverComponentsExternalPackages: ["@node-rs/argon2", "@prisma/client"]
    },
    async headers() {
        return [{
            source: "/:path*",
            headers: securityHeaders
        }];
    }
};

export default withNextIntl(nextConfig);