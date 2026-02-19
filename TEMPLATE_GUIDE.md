## Malguide for enkel konkordansapp

Bruk denne appen som base for en helt enkel korpusapp med kun konkordans.

### Fast oppsett i denne versjonen

- Korpusfil: `Øyvind_Vågnes - Korpus.csv`
- Visning: kun konkordans
- Ingen grupper, aggregert fane eller analyseeksport

### Hurtigoppskrift

1. Sørg for at `Øyvind_Vågnes - Korpus.csv` ligger i rot.
2. Sett `metadataFile` i `app.manifest.json` til samme filnavn.
3. Hold `src/App.tsx` enkel:
   - appnavn/tittel
   - (ev.) default årsspenn
   - søk + resultatliste
4. Kjør lokalt:
   - `npm install`
   - `npm run dev`
5. Push til GitHub og deploy via Actions.

### Minimumskrav til CSV

CSV må minst ha disse feltene:

- `dhlabid`
- `urn`
- `year`
- `title`

Andre felter kan være med, men brukes ikke av kjernen.

### Hva som vanligvis tunes

- Default årsintervall (hvis filter brukes)
- FTS5 søkehints i UI
- Små språkjusteringer i labels

### Hva som normalt ikke røres

- `/dhlab/conc` kallestruktur
- Join mellom `docid` og `dhlabid`
- Deploy-workflow
