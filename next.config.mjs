/**
 * Next.js 設定。
 * - `output: 'export'` で完全な静的サイト (SSG) として書き出す。SEO / 低コストな公開ブラウズ資産向け。
 * - 外部 CDN やホストへ依存させない (法務 §8 / self-contained)。画像は最適化なしで素通し。
 * - GitHub Pages (`GODD_PAGES_BUILD=1`) では project サイト用に basePath / assetPrefix を付与。
 *   SSOT: documents/adr/0004-github-pages-browse-hosting.md
 * @type {import('next').NextConfig}
 */
const isPagesBuild = process.env.GODD_PAGES_BUILD === "1";
const pagesBasePath = "/GoDD-Design-Systems";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // CI は `pnpm exec tsc --noEmit` で型検査する。Next 内蔵の型チェックは
  // TypeScript 7 + pnpm 環境で誤って「未インストール」と判定し落ちるため無効化する。
  typescript: { ignoreBuildErrors: true },
  ...(isPagesBuild
    ? { basePath: pagesBasePath, assetPrefix: pagesBasePath }
    : {}),
};

export default nextConfig;
