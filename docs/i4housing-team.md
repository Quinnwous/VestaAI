# i4 Housing — team-accounts (klaar om aan te maken)

Bron: https://www.i4housing.nl/over-i4-housing/ons-team/ (opgehaald 29 sep 2026).
Besluit Quinn (29 sep): elke makelaar een account; de lijst eerst vastleggen en
later in één keer aanmaken. **Nog niet aangemaakt.**

## Makelaars (aanmaken)

| Naam | Functie (site) | E-mail |
|---|---|---|
| Chita van Soest | NVM Makelaar Wonen (KRMT) | chita@i4housing.nl |
| Nicole van Dijk | NVM Makelaar Wonen | nicole@i4housing.nl |
| Ton van Soest | NVM Makelaar Wonen (RM) | ton@i4housing.nl |
| Marc van Dijk | NVM Makelaar Wonen | marc@i4housing.nl |
| Naomi Bentvelzen | Makelaar i.o. & office manager | naomi@i4housing.nl |
| Shannon Terlouw | Makelaar i.o. & marketing/communicatie | shannon@i4housing.nl |

Namen bevestigd door Quinn (29 sep).

## Niet (nog) aanmaken

| Naam | Functie | Waarom niet |
|---|---|---|
| Stephanie van der Kroft | Office manager | deelt `info@` — één adres kan maar één account hebben |
| Monique de Haas | Office manager | idem |
| Feline Keijzer | Office manager | idem |
| Barbara Poldervaart | Property manager | beheer, geen verkoop |

## Besluit (Quinn, 29 sep)

- **Geen welkomstmail.**
- **Startwachtwoord**, daarna resetten ze zelf via de kantoorlogin (`/login/<slug>` → wachtwoord vergeten; reset-mail in kantoorstijl).
- Aanmaken in één keer met het script (standaard dry-run, bestaande adressen worden overgeslagen):

  ```
  node --env-file=.env.local scripts/maak-team-accounts.mjs --kantoor=3e1099e4-4684-42b7-8b1c-16bc0c39c1d7 --write
  ```

  **Ieder een eigen startwachtwoord, gebaseerd op de voornaam** (Quinn, 29 sep),
  met een willekeurig deel zodat een collega het niet kan raden: `Voornaam-xxxx-xxxx`.
- **Lijst al gemaakt (29 sep):** `backups/team-startwachtwoorden-i4housing-team.tsv`
  — alleen op Quinns Mac, buiten git (`backups/` staat in `.gitignore`), rechten 600.
  Het aanmaakcommando hierboven gebruikt precies deze wachtwoorden. **Accounts pas
  later aanmaken** (besluit Quinn).
- Bestaand: `quinn.berkouwer@icloud.com` (testaccount van Quinn bij i4 Housing).
