import { fillTemplate, type UiMessages } from "@/lib/i18n";

/** 全ページ共通のフッタ。ライセンスと出典 (法務 §8) を明記する。 */
export function SiteFooter({
  generatedAt,
  messages,
}: {
  generatedAt?: string;
  messages: UiMessages;
}) {
  return (
    <footer className="site-footer">
      <p>{messages.footerOperatorLabel}: AutoDevJapan</p>
      <p>
        {messages.footerContactLabel}: {" "}
        <a href="mailto:contact@autodevjapan.com">contact@autodevjapan.com</a>
      </p>
      <p>
        {messages.footerBeforeLicense}
        <a href="https://github.com/AutoDevJapan/GoDD-Design-Systems/blob/main/LICENSE">
          MIT
        </a>
        {messages.footerAfterLicense}
      </p>
      {generatedAt ? (
        <p>
          {fillTemplate(messages.footerGeneratedAtTemplate, { iso: generatedAt })}
        </p>
      ) : null}
    </footer>
  );
}
