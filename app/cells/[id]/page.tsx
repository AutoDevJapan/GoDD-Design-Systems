import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadIndex, type Entry } from "@/lib/catalog";
import { SiteFooter } from "@/app/_components/site-footer";

/** 静的エクスポート: index.json の全 id をビルド時に列挙する。 */
export function generateStaticParams(): { id: string }[] {
  return loadIndex().entries.map((e) => ({ id: e.id }));
}

// index.json に無い id は 404 (未知パラメータを生成しない)。
export const dynamicParams = false;

function findEntry(id: string): Entry | undefined {
  return loadIndex().entries.find((e) => e.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = findEntry(id);
  return { title: entry ? entry.title : "セルが見つかりません" };
}

export default async function CellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = findEntry(id);
  if (!entry) notFound();

  const index = loadIndex();

  return (
    <main className="wrap detail">
      <Link className="back" href="/">
        ← カタログへ戻る
      </Link>
      <header className="site-header">
        <h1>{entry.title}</h1>
        <p>
          <span className="chip">{entry.jsic}</span>{" "}
          <span className="chip">{entry.color}</span>{" "}
          <span className="chip">{entry.mood}</span>
        </p>
      </header>

      <dl>
        <dt>id</dt>
        <dd>{entry.id}</dd>
        <dt>DESIGN.md</dt>
        <dd>{entry.path}</dd>
        <dt>業種 (JSIC)</dt>
        <dd>{entry.jsic}</dd>
        <dt>カラー</dt>
        <dd>{entry.color}</dd>
        <dt>ムード</dt>
        <dd>{entry.mood}</dd>
        <dt>タグ</dt>
        <dd>{entry.tags.join(", ")}</dd>
        <dt>hash</dt>
        <dd>{entry.hash}</dd>
        <dt>createdAt</dt>
        <dd>{entry.createdAt}</dd>
      </dl>

      <SiteFooter generatedAt={index.generatedAt} />
    </main>
  );
}
