/** @type {import('next').NextConfig} */
const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000"
      },
      {
        protocol: "https",
        hostname: "dcreator-platform.vercel.app"
      },
      {
        protocol: "https",
        hostname: "dcreator.vn"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "lmmekgicykqgfildpnwi.supabase.co"
      }
    ].concat(
      supabaseHostname &&
        supabaseHostname !== "lmmekgicykqgfildpnwi.supabase.co"
        ? [{ protocol: "https", hostname: supabaseHostname }]
        : []
    )
  }
};

export default nextConfig;
