import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/impressum"
  }
};

export default async function ImprintPage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <div className="rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md p-6 md:p-8 space-y-6">
        <h1 className="text-3xl font-semibold">{en ? "Imprint" : "Impressum"}</h1>

        <p className="text-sm text-white/80">
          {en
            ? "Information according to Section 5 DDG (Digital Services Act, Germany)."
            : "Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)."}
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "Service provider" : "Diensteanbieter"}</h2>
          <p className="text-white/85 leading-relaxed">
            Marcel Peschka
            <br />
            Hohensteinstraße 8
            <br />
            31840 Hessisch Oldendorf
            <br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "Contact" : "Kontakt"}</h2>
          <p className="text-white/85">
            E-Mail: <a className="slotcrate-inline-link" href="mailto:m@i3ull3t.de">m@i3ull3t.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            {en ? "Responsible for content (Section 18 para. 2 MStV)" : "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV"}
          </h2>
          <p className="text-white/85 leading-relaxed">
            Marcel Peschka
            <br />
            Hohensteinstraße 8
            <br />
            31840 Hessisch Oldendorf
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "Liability for content" : "Haftung für Inhalte"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "As a service provider, we are responsible for our own content on these pages according to general laws (Section 7 para. 1 DDG). Under Sections 8 to 10 DDG, however, we are not obligated to monitor transmitted or stored third-party information or investigate circumstances indicating illegal activity. Obligations to remove or block use of information under general laws remain unaffected. Liability in this regard is only possible from the time of knowledge of a specific infringement. If we become aware of legal violations, we will remove such content immediately."
              : "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "Liability for links" : "Haftung für Links"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Our website may contain links to external third-party websites whose content we cannot control. Therefore, we cannot assume any liability for this external content. The respective provider or operator is always responsible for linked pages. Linked pages were checked for possible legal violations at the time of linking; no unlawful content was identifiable at that time. Permanent monitoring of linked content is not reasonable without concrete evidence of infringement. If we become aware of any legal violations, we will remove such links immediately."
              : "Unser Angebot enthält gegebenenfalls Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "Copyright" : "Urheberrecht"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Content and works created by the site operators are subject to German copyright law. Reproduction, editing, distribution, and any kind of use outside copyright limits require written consent from the respective author or creator. Downloads and copies of this site are permitted for private, non-commercial use only."
              : "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "Dispute resolution" : "Streitschlichtung"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr/. We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board."
              : "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."}
          </p>
        </section>
      </div>
    </section>
  );
}
