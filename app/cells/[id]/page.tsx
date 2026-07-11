import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadDesignDoc, loadIndex, type Entry } from "@/lib/catalog";
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
  const design = loadDesignDoc(entry.path);

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

      {design ? (
        <section className="design" aria-labelledby="design-heading">
          <h2 id="design-heading" className="design-title">
            DESIGN.md 本文
          </h2>
          {design.sections.map((s) => (
            <article className="design-section" key={s.id} id={s.id}>
              <h3>
                {s.ja} <span className="section-id">/ {s.id}</span>
              </h3>
              {/* 本文はビルド時に信頼済みの自リポジトリ Markdown を HTML 化したもの。 */}
              <div
                className="design-body"
                dangerouslySetInnerHTML={{ __html: s.html }}
              />
            </article>
          ))}
        </section>
      ) : (
        <p className="design-empty">
          このセルはまだ DESIGN.md 本文が材化されていません（上記パスを参照）。
        </p>
      )}

      <SiteFooter generatedAt={index.generatedAt} />
    </main>
  );
}
