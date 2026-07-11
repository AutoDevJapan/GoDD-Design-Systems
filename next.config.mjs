/**
 * Next.js 設定。
 * - `output: 'export'` で完全な静的サイト (SSG) として書き出す。SEO / 低コストな公開ブラウズ資産向け。
 * - 外部 CDN やホストへ依存させない (法務 §8 / self-contained)。画像は最適化なしで素通し。
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
