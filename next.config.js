const useReportFixture = process.env.E2E_REPORT_FIXTURE === "1";
const useLocalFixtureProxy = useReportFixture &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === "http://localhost:3211" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "local-e2e-key";

if (process.env.VERCEL === "1" && (useReportFixture || process.env.FINANCE_DEMO === "1" || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "local-e2e-key")) {
  throw new Error("Test and demo settings must be removed before deploying to Vercel.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.63"],
  ...(useReportFixture ? { distDir: ".next/report-fixture" } : {}),
  ...(useLocalFixtureProxy ? {
    env: { NEXT_PUBLIC_SUPABASE_BROWSER_PROXY: "/__local_fixture" },
    async rewrites() {
      return [{
        source: "/__local_fixture/:service(auth|rest)/v1/:path*",
        destination: "http://localhost:3211/:service/v1/:path*",
      }];
    },
  } : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
