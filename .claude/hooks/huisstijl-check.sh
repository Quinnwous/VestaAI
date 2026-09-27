#!/usr/bin/env bash
# Bewaakt de white-label-regels van de ingelogde omgeving: elk bestand dat na de login
# rendert, moet zijn kleuren, vormtaal en lettertype uit de --merk*-variabelen halen.
# Draait als PostToolUse-hook na Write/Edit (zie .claude/settings.json).

bestand=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)
[ -z "$bestand" ] && exit 0
[ -f "$bestand" ] || exit 0

# Alleen de ingelogde omgeving. Publieke pagina's, admin en het basis-designsysteem
# houden bewust VestaAI's eigen groene stijl.
case "$bestand" in
  *"/app/(app)/"*|*/components/*) ;;
  *) exit 0 ;;
esac
case "$bestand" in
  *LandingPageClient.tsx|*PublicNav.tsx|*/components/ui/tokens.ts) exit 0 ;;
esac

meld() { printf '%s\n' "$1" >> "$tmp"; }
tmp=$(mktemp)

blauw=$(grep -nE '(bg|text|border|ring|from|to|via|fill|stroke)-blue-[0-9]' "$bestand" | head -3)
[ -n "$blauw" ] && meld "Tailwind-blue rendert GROEN (de blue-schaal is projectbreed geremapt). Gebruik var(--merk) / bg-[var(--merk)]:
$blauw"

# Roadmap 1.9c: een hex/rgb/rgba/hsl-fallback in var(--merk...) verstopt een
# kapotte kantoor-lookup per component i.p.v. hem zichtbaar te laten (zie de
# centrale fallback op :root in app/globals.css). components/ui/tokens.ts is
# al uitgesloten hierboven (bewust VestaAI-groen, geen kantoorbinding).
# Alleen kleur-fallbacks matchen (#hex, rgb(/rgba(/hsl( als functie) — een
# radius- of font-fallback (var(--merk-radius-md, 12px), var(--merk-diep,
# var(--merk))) is geen kleur en hoort hier niet te matchen (les 27 sep 2026:
# de eerdere brede regex ([0-9]) zag "12px" aan voor een rgb-triplet). Een kale
# triplet (var(--merk-rgb, 26,107,69)) telt wél als kleur.
fallback=$(grep -nE 'var\(--merk[a-zA-Z-]*[[:space:]]*,[[:space:]]*(#[0-9a-fA-F]|rgba?\(|hsl\(|[0-9]{1,3}[[:space:]]*,[[:space:]]*[0-9]{1,3}[[:space:]]*,)' "$bestand" | head -3)
[ -n "$fallback" ] && meld "var(--merk…)-fallback met een ingebakken kleur (hex/rgb/rgba/hsl) verstopt een kapotte kantoor-lookup. Laat de fallback weg — de default staat centraal op :root in app/globals.css:
$fallback"

groen=$(grep -nE '#(1A6B45|2A8A5C|114230|145536|0E3B27|C7E6D5|D5E8DD|EAF5EE|F1F7F3|E9EFEB|E4EAE6|F4F7F5|F8FAF8|EEF2F0|9AA6A0|5A6B61|0E1A13|2A362D|445249|3F4F46)' "$bestand" | grep -v 'var(--merk' | head -3)
[ -n "$groen" ] && meld "Hardgecodeerde VestaAI-kleur of groen-getint grijs. Merkkleur -> var(--merk*), grijs -> neutraal grijs:
$groen"

radius=$(grep -nE 'borderRadius: [0-9]{2,}' "$bestand" | grep -v 'var(--merk' | head -3)
[ -n "$radius" ] && meld "Harde borderRadius negeert de vormtaal van het kantoor (strak = scherpe hoeken). Gebruik var(--merk-radius-*):
$radius"

formeel=$(grep -nE '>[^<]*\b([Uu]w|[Uu] kunt|[Uu] heeft)\b' "$bestand" | head -2)
[ -n "$formeel" ] && meld "De ingelogde omgeving schrijft informeel (je/jouw), niet 'u/uw':
$formeel"

naam=$(grep -nE '>[^<]*VestaAI|'\''[^'\'']*VestaAI' "$bestand" | grep -v '^\s*[0-9]*:\s*//' | head -2)
[ -n "$naam" ] && meld "Achter de login staat nergens de productnaam — gebruik branding.naam of een neutrale formulering:
$naam"

if [ -s "$tmp" ]; then
  jq -Rs --arg f "$(basename "$bestand")" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("Huisstijl-check op " + $f + " (zie .claude/skills/kantoorhuisstijl):\n" + .)
    }
  }' < "$tmp"
fi
rm -f "$tmp"
exit 0
