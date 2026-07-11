import Link from "next/link";
import { deriveFacets, loadIndex } from "@/lib/catalog";
import { SiteFooter } from "@/app/_components/site-footer";

const AXIS_LABELS: { key: "jsic" | "color" | "mood" | "tag"; label: string }[] =
  [
    { key: "jsic", label: "業種 (JSIC)" },
    { key: "color", label: "カラー" },
    { key: "mood", label: "ムード" },
    { key: "tag", label: "タグ" },
  ];

export default function HomePage() {
  const index = loadIndex();
  const facets = deriveFacets(index.entries);

  return (
    <main className="wrap">
      <header className="site-header">
        <h1>GoDD Design-Systems</h1>
        <p>
          業種 (JSIC) × カラー (PCCS) × ムードで整理した、AI
          がそのまま読める DESIGN.md のオープンカタログ。
        </p>
      </header>

      <section className="section" aria-labelledby="axes-heading">
        <h2 id="axes-heading">分類軸</h2>
        <p className="lead">
          値集合の SSOT は{" "}
          <a href="https://github.com/AutoDevJapan/GoDD-Design-Systems/blob/main/taxonomy.md">
            taxonomy.md
          </a>{" "}
          で定義。以下は現在材化済みの {index.entries.length}{" "}
          セルから導出したファセット。
        </p>
        <div className="facets">
          {AXIS_LABELS.map(({ key, label }) => (
            <div className="facet" key={key}>
              <h3>{label}</h3>
              <div className="chips">
                {facets[key].map((f) => (
                  <span className="chip" key={f.value}>
                    {f.value}
                    <span className="count">{f.count}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="cells-heading">
        <h2 id="cells-heading">カタログ ({index.entries.length})</h2>
        <p className="lead">
          index.json のエントリ一覧。各セルは業種 × カラー ×
          ムードの 1 つの DESIGN.md に対応する。
        </p>
        <div className="cards">
          {index.entries.map((entry) => (
            <Link
              className="card"
              key={entry.id}
              href={`/cells/${entry.id}/`}
            >
              <p className="title">{entry.title}</p>
              <div className="meta">
                <span className="chip">{entry.jsic}</span>
                <span className="chip">{entry.color}</span>
                <span className="chip">{entry.mood}</span>
              </div>
              <div className="tags">{entry.tags.join(" · ")}</div>
              <div className="id">{entry.id}</div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter generatedAt={index.generatedAt} />
    </main>
  );
}
