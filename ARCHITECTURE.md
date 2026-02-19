## Arkitektur: Korpus-først, funksjonsprofilert app

Denne appen følger en korpus-først modell: vi "typeløfter" et konkret korpus inn i en håndterbar mengde funksjoner, og velger bare det som gir mening for akkurat dette korpuset. Her er primærfunksjonen konkordans.

I praksis betyr det:

- små korpus kan få rikere valg-UI (fliser, manuell inklusjon/eksklusjon, hover-metadata)
- store korpus bør få enklere seleksjon og mer aggressive begrensninger
- API-kontrakt og datamodell holdes stabile, mens UI-funksjonene skaleres etter korpustype

### 1) Domene

- **Korpusmetadata**: lokal CSV med minst `dhlabid`, `urn`, `title` (og gjerne `year`).
- **Konkordanssøk**: NB DH-lab via `POST https://api.nb.no/dhlab/conc`.
- **Visning**:
  - konkordanstreff med markering
  - dokumentseleksjon via fliser
  - NB-lenker med aktivt søkeord (`searchText`)
  - eksport av treff til Excel (`.xlsx`)

### 2) Endepunkter og payload

#### Konkordans-endepunkt

- URL: `https://api.nb.no/dhlab/conc`
- Metode: `POST`
- Header: `Content-Type: application/json`

Anbefalt payload:

```json
{
  "dhlabids": [100000000, 100000001],
  "html_formatting": true,
  "limit": 1000,
  "query": "Norge",
  "trigram_index": false,
  "window": 20
}
```

Notater:

- `dhlabids` skal sendes som **numeriske verdier**, ikke strenger
- `urns` kan brukes i stedet for `dhlabids` ved behov
- respons kan komme som tabellobjekt (`docid`, `urn`, `conc` som indekserte objekter), og bør normaliseres før rendering

#### Fliser (thumbnail)

- URL: `https://api.nb.no/catalog/v1/items?q=<URN>`
- Bruk `_links.thumbnail_medium` (fallback til `small`/`large`)

### 3) Hovedmoduler

- **`src/App.tsx`**
  - leser manifest og korpusfil
  - normaliserer korpus- og API-data
  - håndterer dokumentvalg, søk, sortering og eksport
  - bygger NB-lenker med `?searchText=<term>`
- **`src/App.css`**
  - stil for søk, treffliste, fliser og hover-overlay
- **`app.manifest.json`**
  - konfigurerer appnavn, korpusfil og API-url

### 4) Dataflyt

1. CSV leses lokalt i nettleser.
2. Bruker velger dokumentsubset (fliser/checkboxes).
3. Søkeuttrykk + valgte `dhlabids` sendes til `POST /dhlab/conc`.
4. API-svar normaliseres til en intern treffliste.
5. Treff joines mot lokal metadata (`dhlabid` -> tittel/urn).
6. Treff sorteres på tittel og vises i UI.
7. Eksport bruker samme sorterte treffliste til `.xlsx`.

### 5) UI-prinsipper

- **En skarp kjerne**: ett hovedarbeidspunkt (konkordans).
- **Korpus-tilpasset kontroll**:
  - små korpus: manuell seleksjon per dokument
  - store korpus: enklere filtermodell
- **Friksjonsfri ut-data**:
  - direkte Excel-nedlasting
  - NB-lenker med søkeord medsendt

### 6) Utskiftbare deler

- Bytt normalt:
  - `corpus.metadataFile` i manifest
  - `api.concordanceUrl` i manifest
  - appnavn/tittel
  - UI-grad av seleksjonskontroll (etter korpusstørrelse)
- Behold normalt:
  - `/dhlab/conc` kontrakt
  - normalisering av konkordansrespons
  - join mot lokal korpusmetadata
  - deploy-flyt til GitHub Pages

### 7) Driftsmodell

- Lokal utvikling: `npm run dev`
- Produksjonsbygg: `npm run build`
- Deploy: GitHub Actions -> GitHub Pages

### 8) Kvalitetsnotater

- `conc` inneholder HTML-markering og rendres i UI.
- Ved eksport til Excel konverteres konkordansen til ren tekst.
- Ved utvidelse til flere kilder bør man vurdere strengere sanitisering av HTML før rendering.
