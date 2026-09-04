import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import("next").NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    experimental: {
        typedRoutes: false,
        serverComponentsExternalPackages: ["@node-rs/argon2", "@prisma/client"]
    }
};

export default withNextIntl(nextConfig);