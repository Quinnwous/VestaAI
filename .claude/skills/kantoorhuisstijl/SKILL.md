---
name: kantoorhuisstijl
description: Bouwregels voor élk scherm, component, e-mail of PDF in de ingelogde omgeving van VestaAI, zodat het meteen de huisstijl van het kantoor draagt (nu i4 Housing) en er achteraf niets hoeft te worden bijgewerkt. Gebruik dit bij het maken of wijzigen van UI onder app/(app)/ of components/, bij nieuwe schermen, modals, knoppen, formulieren, lege staten, foutmeldingen, e-mailsjablonen en PDF-templates.
---

# Bouwen in de huisstijl van het kantoor

Alles achter de login is van het kantoor, niet van VestaAI. Bouw het meteen goed — dit
achteraf repareren heeft een keer een volledige sweep over 40+ bestanden gekost.

**Alleen deze plekken blijven VestaAI-groen:** `app/page.tsx` (landing),
`app/login/`, `app/contact/`, `app/admin/`, `components/LandingPageClient.tsx`,
`components/PublicNav.tsx` en `components/ui/tokens.ts` (de fallback-laag zelf).

## Kleur

Nooit een hardgecodeerde kleur voor iets merkgebonden. Altijd:

| Variabele | Waarvoor |
|---|---|
| `var(--merk)` | primaire kleur: knoppen, actieve staat, links |
| `var(--merk-hover)` | hover op de primaire kleur |
| `var(--merk-op)` | tekst bovenóp de merkkleur (nooit `#fff` hardcoderen — een licht kantoorlogo maakt witte tekst onleesbaar) |
| `var(--merk-zacht)` | lichte tintvlakken, geselecteerde staat |
| `var(--merk-rand)` | randen in de merkkleur |
| `var(--merk-diep)` | donkere variant, koppen op een tintvlak |
| `var(--merk-accent)` | accentkleur — **nooit** voor "succes"/"afgerond" (bij i4 Housing is dit rood en leest dat als fout; gebruik `var(--merk)` of neutraal grijs) |
| `rgba(var(--merk-rgb), .2)` | transparante variant |

Houd de bestaande fallback-conventie aan: `var(--merk,#1A6B45)`.

⚠️ **De Tailwind `blue`-schaal is projectbreed naar groen geremapt** (`tailwind.config.ts`).
Elke `bg-blue-600`/`text-blue-600`/`focus:ring-blue-500` rendert dus groen. Gebruik
`bg-[var(--merk,#1A6B45)]` of een inline style.

**Grijstinten kleurloos houden.** Geen `#E9EFEB`, `#F1F7F3`, `#9AA6A0`, `#5A6B61` — die
hebben een groene ondertoon en vloeken bij een blauw kantoor. De neutrale ramp staat in
`components/ui/tokens.ts` (`#E6E9EC`, `#F7F8F9`, `#98A0A6`, `#5C6470`, `#14181B`).

## Vorm en typografie

Een kantoor kiest `zacht` (rond) of `strak` (hoekig). Dat stuurt automatisch:

- `var(--merk-radius-sm|md|lg|card|card-lg|card-xl|pill)` — en élke Tailwind-`rounded-*`-class,
  want die zijn in `tailwind.config.ts` aan deze variabelen gekoppeld. Gebruik dus geen harde
  `borderRadius: 16` meer.
- `var(--merk-shadow-card|btn|btn-lg|dropdown|modal)`
- `var(--merk-font-body)` / `var(--merk-font-heading)` (of gewoon Tailwind's `font-sans`/`font-serif`)
- `var(--merk-titel-stijl)` (cursief accentwoord ja/nee), `var(--merk-titel-gewicht)`,
  `var(--merk-label-transform)` + `var(--merk-label-spacing)` (kapitale eyebrow ja/nee)

Gebruik waar mogelijk de primitives uit `components/ui/` — die doen dit al goed.

## Taal

- **Informeel:** "je/jouw", nooit "u/uw". (Publieke pagina's houden juist "u".)
- **Geen productnaam:** nergens "VestaAI" in zichtbare tekst achter de login. Schrijf neutraal
  ("we", "het platform") of gebruik `branding.naam`.
- **Domeintaal:** "woning", niet "object".
- Paginatitels bevatten alleen de paginanaam; de route-group-layout zet de kantoornaam erachter.

## Beeld en gegevens van het kantoor

`bouwBranding()` (`lib/branding.ts`) levert: `naam`, `logoUrl`, `faviconUrl`,
`achtergrondUrl` + `achtergrondSecundairUrl` (sfeerbeeld in de zijmarges), `telefoon`, `email`.
Alles optioneel — bouw zo dat een leeg veld het element laat verdwijnen, nooit een lege balk
of een gebroken afbeelding. Een `<img>` met een kantoor-URL krijgt altijd een `onError`-terugval.

## Nieuw merkveld toevoegen

1. `lib/schemas.ts` → `HuisstijlSchema` (optioneel veld)
2. `lib/branding.ts` → `Branding`-type + `bouwBranding()` (+ `brandingCssVars()` als het een CSS-variabele wordt)
3. `app/(app)/settings/tabs/HuisstijlTab.tsx` → invoer, zodat elk kantoor het zelf instelt
4. Nooit een waarde voor één specifiek kantoor in de code zetten — die hoort in de database

## Controleren

```bash
# mechanische sweep
grep -rlE "(bg|text|border|ring)-blue-[0-9]" "app/(app)/" components/ | grep -v tokens.ts
grep -rnE "#(1A6B45|2A8A5C|F1F7F3|E9EFEB)" "app/(app)/" components/ | grep -v "merk"

# visueel: logt in als i4 Housing en meldt élke groene plek + screenshots in /tmp/vesta-shots
npm run dev
node --env-file=.env.local scripts/controleer-huisstijl.mjs 3000
```

Een PostToolUse-hook (`.claude/hooks/huisstijl-check.sh`) waarschuwt automatisch bij een
overtreding in een gewijzigd bestand.
