# `voorbeeld.docx`

Synthetische Word-fixture voor `lib/docx.test.ts` (`extractDocxText()`). Bevat
geen klantdata — puur verzonnen inhoud, dus veilig om in git te zetten (in
tegenstelling tot de eerdere fixture `docs/Concurrentieanalyse-HousApp.docx`,
die wél klantdata was en daarom nooit in git stond, waardoor de test zichzelf
altijd oversloeg).

Inhoud: een kop, twee alinea's, een tabel van 2×2 en bijzondere tekens
(é, ë, €, de apostrof in 's-Gravenhage) — precies wat de test controleert.

## Hoe gemaakt (zonder nieuwe dependency)

Een `.docx` is een gewone zip (OPC-package) met een paar XML-onderdelen. Deze
fixture is met de `zip`-CLI samengesteld uit drie handgeschreven bestanden:

- `[Content_Types].xml` — declareert welke onderdelen welk content-type hebben.
- `_rels/.rels` — de package-relatie die naar `word/document.xml` wijst.
- `word/document.xml` — de kop (`w:pStyle Heading1`), de twee alinea's en de
  tabel, als WordprocessingML (`w:document`/`w:body`/`w:p`/`w:tbl`).

Er is bewust geen `word/styles.xml` toegevoegd (niet nodig voor platte-tekst-
extractie); mammoth geeft daardoor een niet-fatale waarschuwing
("Paragraph style with ID Heading1 was referenced but not defined") die
`extractDocxText()` niet doorgeeft — die retourneert alleen de tekst.

Opnieuw opbouwen (bijv. om de inhoud te wijzigen):

```bash
cd /tmp && mkdir -p docx-build/_rels docx-build/word && cd docx-build
# schrijf de drie XML-bestanden hierboven, dan:
zip -X ../voorbeeld.docx "[Content_Types].xml"
zip -X ../voorbeeld.docx _rels/.rels
zip -X ../voorbeeld.docx word/document.xml
mv ../voorbeeld.docx <repo>/lib/__fixtures__/voorbeeld.docx
```

De volgorde waarin de bestanden worden toegevoegd maakt voor het lezen niet
uit (OPC-lezers zoeken op padnaam), maar `[Content_Types].xml` eerst is de
gangbare conventie.
