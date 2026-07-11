/** 全ページ共通のフッタ。ライセンスと出典 (法務 §8) を明記する。 */
export function SiteFooter({ generatedAt }: { generatedAt?: string }) {
  return (
    <footer className="site-footer">
      <p>
        © GoDD Design-Systems — License:{" "}
        <a href="https://github.com/AutoDevJapan/GoDD-Design-Systems/blob/main/LICENSE">
          MIT
        </a>
        。カラー軸は PCCS (日本色研配色体系) / JIS
        無彩色、業種軸は日本標準産業分類 (JSIC)
        に基づく分類語彙を用いる。特定ブランドの色名・書体は含まない。
      </p>
      {generatedAt ? (
        <p>index.json generatedAt: {generatedAt}</p>
      ) : null}
    </footer>
  );
}
