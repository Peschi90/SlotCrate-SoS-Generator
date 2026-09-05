import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/datenschutz"
  }
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <div className="rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md p-6 md:p-8 space-y-6">
        <h1 className="text-3xl font-semibold">{en ? "Privacy Policy" : "Datenschutzerklärung"}</h1>
        <p className="text-sm text-white/80">{en ? "Last updated: September 2026" : "Stand: September 2026"}</p>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "1. Data protection at a glance" : "1. Datenschutz auf einen Blick"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website is a private, non-commercial 3D printing project. It does not use advertising, marketing, third-party tracking or profiling. Only strictly necessary cookies are used (language selection, admin login). To understand how the STL generator is used and to detect technical problems, aggregated usage events are recorded with hashed identifiers. Details are given in sections 5 and 6."
              : "Diese Website ist ein privates, nicht kommerzielles 3D-Druck-Projekt. Es gibt keine Werbung, kein Marketing, kein Drittanbieter-Tracking und keine Profilbildung. Es werden ausschließlich technisch notwendige Cookies eingesetzt (Sprachwahl, Admin-Anmeldung). Um die Nutzung des STL-Generators nachvollziehen und technische Fehler erkennen zu können, werden aggregierte Nutzungsereignisse mit gehashten Kennungen aufgezeichnet. Details siehe Abschnitte 5 und 6."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "2. Controller" : "2. Verantwortlicher"}</h2>
          <p className="text-white/85 leading-relaxed">
            Marcel Peschka
            <br />
            Hohensteinstraße 8
            <br />
            31840 Hessisch Oldendorf
            <br />
            Deutschland
            <br />
            E-Mail: <a className="slotcrate-inline-link" href="mailto:m@i3ull3t.de">m@i3ull3t.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "3. Hosting and server log files" : "3. Hosting und Server-Logfiles"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website is hosted by an external provider. The hoster automatically collects and stores information in server log files that your browser transmits automatically, including shortened IP address, date/time of access, requested page/file and transferred data volume, referrer URL, browser type, and operating system. These data are not assigned to specific persons and are not merged with other data sources. Processing is based on legitimate interest (Art. 6 para. 1 lit. f GDPR) to ensure secure and stable website operation. Log files are deleted automatically after a short period."
              : "Diese Website wird bei einem externen Dienstleister (Hoster) betrieben. Der Hoster erhebt und speichert automatisch Informationen in sogenannten Server-Logfiles, die Ihr Browser automatisch übermittelt. Dies sind insbesondere: anonymisierte bzw. gekürzte IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Datei/Seite und übertragene Datenmenge, Referrer-URL, verwendeter Browsertyp und Betriebssystem. Diese Daten sind nicht bestimmten Personen zuordenbar und werden nicht mit anderen Datenquellen zusammengeführt. Die Verarbeitung erfolgt zur Gewährleistung eines sicheren und stabilen Betriebs der Website auf Grundlage unseres berechtigten Interesses gemäß Art. 6 Abs. 1 lit. f DSGVO. Die Logfiles werden nach kurzer Zeit automatisch gelöscht."}
          </p>
          <p className="text-white/75 leading-relaxed mt-3">
            {en
              ? "Hoster: STRATO GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin, Germany. A data processing agreement according to Art. 28 GDPR has been concluded with the hoster."
              : "Hoster: STRATO GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin, Deutschland. Mit dem Hoster wurde ein Vertrag über Auftragsverarbeitung (AV-Vertrag) gemäß Art. 28 DSGVO geschlossen."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "4. Fonts" : "4. Schriftarten"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "The fonts Inter and Rajdhani are self-hosted. They are downloaded once during the build process, embedded into the deployed website, and delivered from the same origin as the rest of the site. Your browser does not make any requests to Google Fonts, fonts.googleapis.com or fonts.gstatic.com when loading a page. No IP address is transmitted to Google."
              : "Die Schriftarten Inter und Rajdhani werden selbst gehostet. Sie werden einmalig während des Builds heruntergeladen, in die veröffentlichte Website eingebettet und vom selben Server ausgeliefert wie der übrige Inhalt. Ihr Browser stellt beim Aufruf keine Anfragen an Google Fonts, fonts.googleapis.com oder fonts.gstatic.com. Es wird keine IP-Adresse an Google übertragen."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "5. Cookies" : "5. Cookies"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website uses only strictly necessary cookies. No advertising, marketing, or third-party tracking cookies are set."
              : "Diese Website setzt ausschließlich technisch notwendige Cookies. Es werden keine Werbe-, Marketing- oder Drittanbieter-Tracking-Cookies gesetzt."}
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-white/75">
            <li>
              {en
                ? <><span className="font-semibold">NEXT_LOCALE</span> — stores the selected UI language (de/en). Lifetime: 1 year. Purely functional, no tracking.</>
                : <><span className="font-semibold">NEXT_LOCALE</span> – speichert die gewählte Oberflächensprache (de/en). Laufzeit: 1 Jahr. Rein funktional, kein Tracking.</>}
            </li>
            <li>
              {en
                ? <><span className="font-semibold">slotcrate_session</span> — set only after a successful admin login. HttpOnly, SameSite=Lax, Secure in production. Lifetime: up to 30 days or until logout. Regular visitors of the generator or planner do not receive this cookie.</>
                : <><span className="font-semibold">slotcrate_session</span> – wird ausschließlich nach erfolgreichem Admin-Login gesetzt. HttpOnly, SameSite=Lax, in Produktion Secure. Laufzeit: bis zu 30 Tage oder bis zum Logout. Normale Besucher des Generators oder Planers erhalten dieses Cookie nicht.</>}
            </li>
          </ul>
          <p className="text-white/75 leading-relaxed mt-3">
            {en
              ? "Legal basis: Art. 6 para. 1 lit. f GDPR (legitimate interest in a working website and secure admin authentication) and § 25 para. 2 TTDSG (strictly necessary access). No consent banner is used because no cookies requiring consent are set."
              : "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer funktionsfähigen Website und sicherer Admin-Anmeldung) sowie § 25 Abs. 2 TTDSG (unbedingt erforderlicher Zugriff). Ein Cookie-Banner wird nicht eingesetzt, da keine zustimmungspflichtigen Cookies gesetzt werden."}
          </p>
          <p className="text-white/75 leading-relaxed mt-3">
            {en
              ? "The browser also stores the current layout of the planner in Local Storage on your device so that it remains available on reload. This data is stored exclusively in your browser, is not transmitted to us, and can be deleted at any time via the browser settings."
              : "Zusätzlich speichert der Browser den aktuellen Planer-Zustand lokal auf Ihrem Gerät im Local Storage, damit dieser beim Neuladen erhalten bleibt. Diese Daten verbleiben ausschließlich in Ihrem Browser, werden nicht an uns übertragen und können jederzeit über die Browser-Einstellungen gelöscht werden."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "6. Usage analytics" : "6. Nutzungsanalyse"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "In order to understand which box sizes and case variants are actually used and to detect technical problems with the STL generator, we record aggregated usage events. Processing is based on our legitimate interest (Art. 6 para. 1 lit. f GDPR) in the further development and stability of a free, non-commercial tool. No profiles are created, no data is shared with third parties, and no cross-site tracking takes place."
              : "Um nachzuvollziehen, welche Kastengrößen und Kofferbaugrößen tatsächlich genutzt werden und um technische Fehler des STL-Generators zu erkennen, zeichnen wir aggregierte Nutzungsereignisse auf. Rechtsgrundlage ist unser berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO) an der Weiterentwicklung und Stabilität eines kostenlosen, nicht kommerziellen Werkzeugs. Es werden keine Profile gebildet, keine Daten an Dritte weitergegeben und kein seitenübergreifendes Tracking durchgeführt."}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">{en ? "Recorded events" : "Aufgezeichnete Ereignisse"}</h3>
          <ul className="list-disc pl-6 space-y-1 text-white/75">
            <li>{en ? "Opening the single-box generator or the layout planner." : "Öffnen des Einzelkasten-Generators oder des Layout-Planers."}</li>
            <li>{en ? "Changing the selected case variant." : "Wechsel der ausgewählten Kofferbaugröße."}</li>
            <li>{en ? "Clicking the download button." : "Klick auf den Download-Button."}</li>
            <li>{en ? "Successful STL or ZIP download, including the resulting box size (grid cells, drawer height) or number of boxes in the layout." : "Erfolgreicher STL- oder ZIP-Download inklusive der erzeugten Kastengröße (Rasterfelder, Schubladenhöhe) bzw. Anzahl Kästen im Layout."}</li>
            <li>{en ? "Failed download, with a stable technical error code (no personal payload)." : "Fehlgeschlagener Download mit einem stabilen technischen Fehlercode (kein personenbezogener Inhalt)."}</li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">{en ? "Stored fields per event" : "Pro Ereignis gespeicherte Felder"}</h3>
          <ul className="list-disc pl-6 space-y-1 text-white/75">
            <li>{en ? "Timestamp of the event." : "Zeitstempel des Ereignisses."}</li>
            <li>{en ? "Event type and generator (single box / layout planner)." : "Ereignistyp und Generator (Einzelkasten / Layout-Planer)."}</li>
            <li>{en ? "Selected case variant identifier." : "Kennung der gewählten Kofferbaugröße."}</li>
            <li>{en ? "Technical details of the event (e.g. box dimensions in cells, drawer height in mm, number of boxes, error code). No free-form or personal input is recorded." : "Technische Details des Ereignisses (z. B. Kastenmaße in Rasterfeldern, Schubladenhöhe in mm, Anzahl Kästen, Fehlercode). Es werden keine Freitexte oder personenbezogenen Eingaben erfasst."}</li>
            <li>
              {en
                ? "A visitor identifier that is derived by irreversibly hashing your IP address together with your user agent (HMAC-SHA-256 with a server-side secret). The raw IP address is never written to the analytics database — only the hash is stored."
                : "Ein Besucher-Merkmal, das aus Ihrer IP-Adresse und Ihrem User-Agent nicht umkehrbar gehasht wird (HMAC-SHA-256 mit einem serverseitigen Geheimnis). Die IP-Adresse selbst wird nicht in die Analyse-Datenbank geschrieben – nur der Hash."}
            </li>
            <li>{en ? "User agent string of the browser, truncated to 255 characters." : "User-Agent-Zeichenkette des Browsers, auf 255 Zeichen gekürzt."}</li>
          </ul>

          <h3 className="text-lg font-semibold mt-4 mb-2">{en ? "How a unique visitor is determined" : "Wie ein eindeutiger Besucher bestimmt wird"}</h3>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "A unique visitor is not identified by a cookie. Instead, we compute an HMAC-SHA-256 hash from your IP address combined with your user agent, keyed with a server-side secret. Since the hash cannot be reversed, we cannot reconstruct your IP address from stored analytics rows. Different networks (mobile vs. Wi-Fi) or a different browser lead to a different hash and therefore count as a different visitor. This method avoids setting any tracking cookies but is inherently coarse and only used for aggregated counts."
              : "Ein eindeutiger Besucher wird nicht über ein Cookie identifiziert. Stattdessen bilden wir einen HMAC-SHA-256-Hash aus Ihrer IP-Adresse zusammen mit Ihrem User-Agent, verschlüsselt mit einem serverseitigen Geheimnis. Da der Hash nicht umkehrbar ist, lässt sich Ihre IP-Adresse aus den gespeicherten Analyse-Einträgen nicht wiederherstellen. Ein anderer Zugang (Mobilfunk statt WLAN) oder ein anderer Browser führt zu einem anderen Hash und wird daher als anderer Besucher gezählt. Das Verfahren verzichtet auf jegliche Tracking-Cookies, ist dafür aber bewusst grob und dient nur aggregierten Zählungen."}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">{en ? "IP address handling" : "Umgang mit IP-Adressen"}</h3>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Your IP address is used only in memory during the request in order to compute the described hash values (visitor hash and IP hash). After that the raw IP address is discarded and is not written into the analytics table. The hoster's server log files may briefly store the connection IP address for stability and security purposes; see section 3."
              : "Ihre IP-Adresse wird nur im Arbeitsspeicher während der Anfrage verwendet, um die beschriebenen Hash-Werte (Besucher-Hash und IP-Hash) zu berechnen. Danach wird die IP-Adresse verworfen und nicht in die Analyse-Tabelle geschrieben. In den Server-Logfiles des Hosters kann die Verbindungs-IP zu Betriebs- und Sicherheitszwecken kurzfristig gespeichert werden, siehe Abschnitt 3."}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">{en ? "Storage duration" : "Speicherdauer"}</h3>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Analytics events are kept for at most 12 months and are then deleted or aggregated. The administration interface itself only evaluates the last 365 days at maximum. Since only hashed identifiers, technical event details and truncated user agents are stored, this data does not identify you personally."
              : "Analyse-Ereignisse werden höchstens 12 Monate aufbewahrt und danach gelöscht oder aggregiert. Auch die Administrationsoberfläche wertet maximal die letzten 365 Tage aus. Da nur gehashte Kennungen, technische Ereignisdetails und gekürzte User-Agent-Angaben gespeichert werden, identifiziert dieser Datenbestand Sie nicht persönlich."}
          </p>

          <h3 className="text-lg font-semibold mt-4 mb-2">{en ? "Objection" : "Widerspruch"}</h3>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "You can object to this processing at any time via an informal email (see section 2). You can also block the analytics endpoint /api/analytics/event in your browser (for example via an ad/tracking blocker); the generator and planner will continue to work."
              : "Sie können der Verarbeitung jederzeit formlos per E-Mail widersprechen (siehe Abschnitt 2). Sie können auch den Analyse-Endpunkt /api/analytics/event in Ihrem Browser blockieren (z. B. per Werbe-/Tracking-Blocker); Generator und Planer funktionieren weiterhin."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "8. External links" : "8. Externe Links"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website contains links to external sites (e.g. MakerWorld). When clicking these links, you leave this website. We have no influence on data processing by external site operators; their own privacy policies apply."
              : "Diese Website enthält Links zu externen Seiten (z. B. MakerWorld). Beim Anklicken solcher Links verlassen Sie diese Website. Auf die Datenverarbeitung durch die Betreiber der verlinkten Seiten haben wir keinen Einfluss; es gelten deren jeweilige Datenschutzbestimmungen."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "9. Your rights" : "9. Ihre Rechte"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Within the statutory framework, you have the right to access (Art. 15 GDPR), rectification (Art. 16 GDPR), erasure (Art. 17 GDPR), restriction of processing (Art. 18 GDPR), data portability (Art. 20 GDPR), and objection (Art. 21 GDPR). To exercise your rights, an informal message to the email address above is sufficient."
              : "Sie haben im Rahmen der gesetzlichen Bestimmungen jederzeit das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung (Art. 21 DSGVO). Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an die oben genannte E-Mail-Adresse."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "10. Right to lodge a complaint" : "10. Beschwerderecht bei der Aufsichtsbehörde"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Without prejudice to any other administrative or judicial remedy, you have the right to lodge a complaint with a data protection supervisory authority, in particular in the Member State of your habitual residence, your workplace, or the place of the alleged infringement."
              : "Ihnen steht unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "11. Updates to this policy" : "11. Aktualität dieser Erklärung"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "It may become necessary to adapt this privacy policy due to further development of this website or changes in legal or regulatory requirements."
              : "Durch die Weiterentwicklung dieser Website oder aufgrund geänderter gesetzlicher bzw. behördlicher Vorgaben kann es notwendig werden, diese Datenschutzerklärung anzupassen."}
          </p>
        </section>
      </div>
    </section>
  );
}
