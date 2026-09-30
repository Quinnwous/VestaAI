# E2e (item 12.2)

Playwright-suite tegen een lokale dev-server. Draait per ongeluk tegen de
**productiedatabase** (`.env.local` wijst daarnaar, zie CLAUDE.md) — daarom is
alles hieronder óf puur lezend, óf ruimt zichzelf expliciet op in het
demo-kantoor (`instellingen_json.demo === true`, nooit een ander kantoor).

## Draaien

```bash
# eenmalig: node_modules/.env.local symlinken in een worktree
ln -s <hoofdrepo>/node_modules node_modules
ln -s <hoofdrepo>/.env.local .env.local

# dev-server op een eigen poort (voorkomt botsing met een lopende hoofdsessie)
PORT=3103 npm run dev

# in een tweede terminal
PLAYWRIGHT_BASE_URL=http://localhost:3103 npx playwright test
```

Zonder `PLAYWRIGHT_BASE_URL` start `playwright.config.ts` zelf `next dev` op
poort 3000 (`webServer`, `reuseExistingServer: true`).

## Env-vars

Uit `.env.local` (productie-Supabase, alléén lezen/eigen testdata schrijven):

| Var | Waarvoor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | Supabase-project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | REST-calls met een sessie-JWT (RLS-test) |
| `SUPABASE_SERVICE_ROLE_KEY` | sessies zonder wachtwoord genereren (admin/i4housing), kantoor-lookups, opruimen |
| `DEMO_PASSWORD` | echte formulier-login voor `demo@vestaai.nl` |

Los, alleen voor de kostbare test:

| Var | Waarvoor |
|---|---|
| `E2E_GENERATE=1` | zet de contentgeneratie-test aan (`content.spec.ts`) — kost Claude-API-credits (NL+EN, ~€0,08-0,16/run, ~3 min). **Niet standaard aanzetten.** |

Ontbreekt `DEMO_PASSWORD` of de service-role key, dan slaan de bijbehorende
tests zichzelf over (`test.skip`) in plaats van te falen — zie
`e2e/demo.setup.ts` / `e2e/admin.setup.ts` / `e2e/lib/auth.ts`.

## Bestanden

- `auth.setup.ts` — bestaand, generieke sessie voor `E2E_TEST_EMAIL` (gebruikt
  door `primitives.spec.ts`).
- `demo.setup.ts` — nieuw: echte formulier-login als `demo@vestaai.nl` met
  `DEMO_PASSWORD`. Storage state: `.auth/demo.json`.
- `admin.setup.ts` — nieuw: sessiecookie voor de platform-admin
  (`quinn.berkouwer@gmail.com`, zie `lib/admin.ts` — **niet**
  `quinn.berkouwer@icloud.com`, zie de kanttekening hieronder). Storage state:
  `.auth/admin.json`.
- `lib/session.ts` — Supabase-sessiehelpers (wachtwoord-login, sessie-zonder-
  wachtwoord via magic-link+verifyOtp, kantoor-lookup, de opruim-vangrail
  `assertKantoorIsDemo`).
- `lib/fixtures.ts` — minimale geldige `PropertyInput`-payloads + de
  dossier-met-waardering-lookup (gedeeld met `primitives.spec.ts`'s eigen
  variant).
- `lib/auth.ts` — padconstanten + "is er een auth-state" checks, los van de
  `*.setup.ts`-bestanden (zie het commentaar daarin: een spec-bestand mag
  nooit uit een `*.setup.ts`-bestand importeren, anders registreert Playwright
  die `setup(...)`-test opnieuw in de suite van dat spec-bestand).
- `login.spec.ts` — spec 1: kantoorbranding op `/login/demo` + `/login/i4housing`,
  onbekende slug valt terug op `/login`, inloggen landt op `/dashboard`.
- `dossier.spec.ts` — spec 2: dossier aanmaken + laden < 5 s in het
  demo-kantoor, ruimt zichzelf op.
- `waardering.spec.ts` — spec 3: `n = …` + pdf-knop zichtbaar, pdf-route geeft
  een echte 200 + `application/pdf`.
- `kaart.spec.ts` — spec 4: `/marktanalyse/kaart` zonder CSP-fout of
  `pageerror`.
- `content.spec.ts` — spec 5: contentgeneratie, alleen met `E2E_GENERATE=1`.
  Ruimt zijn eigen testdossier op.
- `admin.spec.ts` — spec 6: `/admin/transacties`-importhistorie, alleen lezen.
- `rls.spec.ts` — spec 7: RLS-isolatie tussen kantoren via REST (anon-key +
  sessie-JWT), op `transacties` én `objecten`, beide richtingen.
- `smoke.spec.ts` — publieke pagina's, beschermde routes zonder sessie,
  ingelogd dashboard en `/woningen`, en de generatie-flow via de UI (alleen
  met `E2E_GENERATE=1`).
- `primitives.spec.ts` — de Radix-primitives (focus-trap, Escape,
  scroll-lock, focus-herstel) in een echte browser.

## Wat wordt opgeruimd

- `dossier.spec.ts` en `content.spec.ts` verwijderen elk precies het ene
  dossier dat ze zelf aanmaken, en pas nadat `assertKantoorIsDemo()`
  (`lib/session.ts`) heeft bevestigd dat het kantoor-id daadwerkelijk
  `instellingen_json.demo === true` heeft.
- Alle overige specs zijn puur lezend: geen schrijfacties, dus niets om op te
  ruimen.

## Goed om te weten

- **Platform-admin:** `admin.spec.ts` logt in als `quinn.berkouwer@gmail.com`
  (vaste waarde in `lib/admin.ts`). `quinn.berkouwer@icloud.com` is een gewone
  makelaar bij i4 Housing, tenzij het via `PLATFORM_ADMIN_EMAILS` wordt
  toegevoegd.
- **Generatietests kosten geld.** Twee specs doen een echte generatie, beide
  alleen met `E2E_GENERATE=1`: `content.spec.ts` via de API en
  `smoke.spec.ts` via de UI (dossier aanmaken → fasestepper naar In verkoop →
  `POST /api/generate`, bijgewerkt op 27 sep). Beide wachten maximaal 220 s op
  het resultaat, onder de functielimiet van 300 s. De echte duur is nog nooit
  gemeten (roadmap D2).
