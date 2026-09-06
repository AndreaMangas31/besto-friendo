import type { NextConfig } from "next";

// Solo servidor (Vercel Secret / .env.local). Sin NEXT_PUBLIC_: el túnel no va al JS.
const backend = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/bf-api/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
