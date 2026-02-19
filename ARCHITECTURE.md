## Arkitektur: Enkel konkordansapp

Denne appen er en minimal korpusleser med konkordans. Korpuset er fast: `Øyvind_Vågnes - Korpus.csv`. All funksjonalitet utover søk i konkordans er bevisst fjernet.

### 1) Domene

- **Korpusmetadata**: lokal CSV med minst `dhlabid`, `urn`, `year`, `title`.
- **Søk**: DH-lab `POST /dhlab/conc` (FTS5 query), begrenset til `dhlabid`-ene fra CSV.
- **Visning**:
  - Konkordansvisning (teksttreff med markering)
  - Enkel metadata-kontekst per treff (f.eks. tittel/år)

### 2) Hovedmoduler

- **`src/App.tsx`**
  - Leser `Øyvind_Vågnes - Korpus.csv` via `papaparse`
  - Holder kun nødvendig state (korpus, søkefelt, resultatliste, ev. årsfilter)
  - Kaller `/dhlab/conc`
  - Mapper svarformatet `docid/urn/conc` til intern `ConcordanceRow`
  - Lager NB-lenke fra URN
- **`src/App.css`**
  - Enkel layout for søkefelt, filter og resultatliste
- **`app.manifest.json`**
  - Beskriver appnavn og peker til fast korpusfil

### 3) Dataflyt

1. CSV leses lokalt i nettleser fra `Øyvind_Vågnes - Korpus.csv`.
2. Bruker skriver søkeuttrykk.
3. Søkeuttrykk sendes til `/dhlab/conc` med `dhlabids`.
4. Svar transformeres:
   - `docid` -> `bookId`
   - `conc` -> tekstfragment
   - `urn` -> lenkegrunnlag
5. Treff joins mot lokal metadata (`dhlabid`) for år og tittel.

### 4) UI-prinsipper

- **En visning**: kun `Konkordans`.
- **Rask flyt**:
  - Skriv søk
  - Se treff
  - Klikk til Nettbiblioteket ved behov
- **Ingen analysetabeller**:
  - ingen aggregert fane
  - ingen gruppeeditor
  - ingen import/eksport av grupper

### 5) Utskiftbare deler

- Bytt kun:
  - CSV-filnavn i manifest (om ny korpus skal brukes senere)
  - appnavn/tittel
  - default årsspenn (hvis brukt)
- Behold:
  - `/dhlab/conc`-integrasjon
  - mapping/joins mellom API-treff og CSV-metadata
  - enkel deploy-flyt

### 6) Driftsmodell

- Lokal utvikling: `npm run dev`
- Produksjonsbygg: `npm run build`
- Deploy: GitHub Actions -> GitHub Pages

### 7) Kvalitetsnotater

- HTML fra `conc` rendres med `dangerouslySetInnerHTML` for å vise `<b>`-markering.
- Dette er akseptabelt her fordi innholdet kommer fra kjent API og brukes som konkordansvisning.
- Ved utvidelse til flere datakilder bør HTML sanitiseres før rendering.
