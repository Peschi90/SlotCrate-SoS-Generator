import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const en = locale === "en";

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <div className="rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md p-6 md:p-8 space-y-6">
        <h1 className="text-3xl font-semibold">{en ? "Privacy Policy" : "Datenschutzerklärung"}</h1>
        <p className="text-sm text-white/80">{en ? "Last updated: July 2026" : "Stand: Juli 2026"}</p>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "1. Data protection at a glance" : "1. Datenschutz auf einen Blick"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website is a purely informational private 3D printing project. It has no contact forms, no registration, no user account, no cookies, and no analytics or tracking services. No personal data is collected or evaluated for advertising or analytics purposes."
              : "Diese Website ist ein rein informatives, privates 3D-Druck-Projekt. Sie enthält keine Kontaktformulare, keine Registrierung, kein Nutzerkonto, keine Cookies und keine Analyse- oder Tracking-Dienste. Es werden keine personenbezogenen Daten zu Werbe- oder Analysezwecken erhoben oder ausgewertet."}
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
          <h2 className="text-xl font-semibold mb-2">{en ? "4. Fonts (Google Fonts)" : "4. Schriftarten (Google Fonts)"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website uses web fonts from Google (Google Fonts) for a consistent visual presentation. When a page is opened, your browser loads required fonts directly from Google servers. Your IP address is transmitted to Google; a transfer to the USA cannot be ruled out. Legal basis is legitimate interest according to Art. 6 para. 1 lit. f GDPR. More information: https://policies.google.com/privacy and https://developers.google.com/fonts/faq."
              : "Diese Website nutzt zur einheitlichen Darstellung von Schriftarten sogenannte Web Fonts von Google (Google Fonts), die von Servern der Google Ireland Limited geladen werden. Beim Aufruf einer Seite lädt Ihr Browser die benötigten Schriftarten direkt von Google. Dabei wird Ihre IP-Adresse an Google übermittelt; eine Übertragung in die USA kann nicht ausgeschlossen werden. Die Nutzung von Google Fonts erfolgt im Interesse einer einheitlichen und ansprechenden Darstellung unseres Online-Angebots. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Weitere Informationen: https://policies.google.com/privacy und https://developers.google.com/fonts/faq."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "5. Cookies and tracking" : "5. Cookies und Tracking"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website does not use cookies, local storage for tracking purposes, or analytics tools (e.g. Google Analytics). No user tracking or profiling takes place."
              : "Diese Website verwendet keine Cookies, kein Local Storage zu Tracking-Zwecken und keine Analyse-Tools (wie z. B. Google Analytics). Es findet kein Nutzer-Tracking und kein Profiling statt."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "6. External links" : "6. Externe Links"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "This website contains links to external sites (e.g. MakerWorld). When clicking these links, you leave this website. We have no influence on data processing by external site operators; their own privacy policies apply."
              : "Diese Website enthält Links zu externen Seiten (z. B. MakerWorld). Beim Anklicken solcher Links verlassen Sie diese Website. Auf die Datenverarbeitung durch die Betreiber der verlinkten Seiten haben wir keinen Einfluss; es gelten deren jeweilige Datenschutzbestimmungen."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "7. Your rights" : "7. Ihre Rechte"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Within the statutory framework, you have the right to access (Art. 15 GDPR), rectification (Art. 16 GDPR), erasure (Art. 17 GDPR), restriction of processing (Art. 18 GDPR), data portability (Art. 20 GDPR), and objection (Art. 21 GDPR). To exercise your rights, an informal message to the email address above is sufficient."
              : "Sie haben im Rahmen der gesetzlichen Bestimmungen jederzeit das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) sowie Widerspruch gegen die Verarbeitung (Art. 21 DSGVO). Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an die oben genannte E-Mail-Adresse."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "8. Right to lodge a complaint" : "8. Beschwerderecht bei der Aufsichtsbehörde"}</h2>
          <p className="text-white/75 leading-relaxed">
            {en
              ? "Without prejudice to any other administrative or judicial remedy, you have the right to lodge a complaint with a data protection supervisory authority, in particular in the Member State of your habitual residence, your workplace, or the place of the alleged infringement."
              : "Ihnen steht unbeschadet eines anderweitigen verwaltungsrechtlichen oder gerichtlichen Rechtsbehelfs ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">{en ? "9. Updates to this policy" : "9. Aktualität dieser Erklärung"}</h2>
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
