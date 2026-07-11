import { loadIndex } from "@/lib/catalog";
import { SiteFooter } from "@/app/_components/site-footer";
import {
  CatalogExplorer,
  type CatalogCell,
} from "@/app/_components/catalog-explorer";

export default function HomePage() {
  const index = loadIndex();

  // ビルド時に軽量インデックス（ブラウズに必要な最小情報）を埋め込み、
  // クライアント側で絞り込み / 検索する。静的エクスポート (output: export)
  // と両立し、全セルが初期 HTML に含まれるため SEO も損なわない。
  const cells: CatalogCell[] = index.entries.map((e) => ({
    id: e.id,
    title: e.title,
    jsic: e.jsic,
    color: e.color,
    mood: e.mood,
    tags: e.tags,
  }));

  return (
    <main className="wrap">
      <header className="site-header">
        <h1>GoDD Design-Systems</h1>
        <p>
          業種 (JSIC) × カラー (PCCS) × ムードで整理した、AI
          がそのまま読める DESIGN.md のオープンカタログ。
        </p>
      </header>

      <CatalogExplorer cells={cells} />

      <SiteFooter generatedAt={index.generatedAt} />
    </main>
  );
}
