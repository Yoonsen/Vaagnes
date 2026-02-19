## Malguide: korpusoppskrift for konkordans

Bruk denne guiden når du lager en ny korpusapp etter samme modell: korpus-først, med en tydelig funksjonsprofil (her: konkordans).

### 1) Tenkemåte før kode

- Ikke bygg "one size fits all".
- Velg funksjoner ut fra korpusstørrelse og bruksmønster:
  - **små korpus**: manuell dokumentseleksjon, fliser, mer interaktiv UI
  - **store korpus**: enklere filtrering, mindre visuell overhead, tydelige grenser
- Hold API-kontrakt og dataflyt stabil på tvers av instanser.

### 2) Hurtigoppskrift

1. Legg korpus-CSV i rot.
2. Oppdater `app.manifest.json`:
   - `corpus.metadataFile`
   - `api.concordanceUrl`
   - `appName`
3. Verifiser CSV-felter (`dhlabid`, `urn`, `title` minst).
4. Kjør lokalt:
   - `npm install`
   - `npm run dev`
5. Push og deploy via GitHub Actions.

### 3) Endepunkt og payload (konkordans)

- Endepunkt: `POST https://api.nb.no/dhlab/conc`
- Header: `Content-Type: application/json`

Eksempelpayload:

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

Viktig:

- `dhlabids` som tall
- `urns` kan brukes ved behov
- normaliser respons før UI (tabellobjekt -> radliste)

### 4) Minimumskrav til CSV

CSV bør minst ha:

- `dhlabid`
- `urn`
- `title`

Valgfritt:

- `year` og andre metadatafelt

### 5) UI-oppskrift (anbefalt baseline)

- Søkefelt + Enter-submit
- Treffliste sortert på tittel
- Dokumentseleksjon (velg/uvelg) når korpuset er lite nok
- NB-lenker med `searchText`
- Nedlasting av treff som Excel (`.xlsx`)

### 6) Hva man vanligvis tuner

- labeltekster og hjelpetekst
- default søkeparametre (`window`, `limit`, `html_formatting`)
- graden av dokumentvalg i UI
- eksportkolonner

### 7) Hva som normalt ikke røres

- grunnkontrakt mot `/dhlab/conc`
- join mellom API-treff og lokal metadata via `dhlabid`
- deploy-workflow til GitHub Pages
