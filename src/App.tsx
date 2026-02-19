import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

type CorpusRow = {
  dhlabid: string;
  urn: string;
  year: number | null;
  title: string;
};

type Manifest = {
  appName?: string;
  api?: {
    concordanceUrl?: string;
  };
  corpus?: {
    metadataFile?: string;
  };
};

type ConcordanceApiRow = {
  docid?: string | number;
  dhlabid?: string | number;
  urn?: string;
  conc?: string;
};

type ConcordanceHit = {
  bookId: string;
  urn: string;
  concHtml: string;
  year: number | null;
  title: string;
  nbUrl: string;
};

const DEFAULT_METADATA_FILE = "Øyvind_Vågnes - Korpus.csv";
const CONCORDANCE_API_URL = "https://api.nb.no/dhlab/conc";

function normalizeUrn(urn: string): string {
  return urn.trim();
}

function toNettbibliotekUrl(urn: string): string {
  return `https://www.nb.no/items/${encodeURIComponent(normalizeUrn(urn))}`;
}

function parseYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export default function App() {
  const [appName, setAppName] = useState("Vågnes Konkordans");
  const [corpus, setCorpus] = useState<CorpusRow[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ConcordanceHit[]>([]);
  const [loadingCorpus, setLoadingCorpus] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [yearTo, setYearTo] = useState<number | null>(null);
  const [concordanceApiUrl, setConcordanceApiUrl] = useState(CONCORDANCE_API_URL);

  useEffect(() => {
    let cancelled = false;

    async function loadCorpus() {
      setLoadingCorpus(true);
      setError(null);

      try {
        const manifestResp = await fetch("./app.manifest.json");
        if (!manifestResp.ok) {
          throw new Error("Klarte ikke lese app.manifest.json");
        }
        const manifest = (await manifestResp.json()) as Manifest;
        if (manifest.appName) {
          setAppName(manifest.appName);
          document.title = manifest.appName;
        }
        if (manifest.api?.concordanceUrl?.trim()) {
          setConcordanceApiUrl(manifest.api.concordanceUrl.trim());
        }

        const metadataFile =
          manifest.corpus?.metadataFile?.trim() || DEFAULT_METADATA_FILE;
        const csvResp = await fetch(`./${encodeURIComponent(metadataFile)}`);
        if (!csvResp.ok) {
          throw new Error(`Klarte ikke lese korpusfil: ${metadataFile}`);
        }
        const csvText = await csvResp.text();

        const parsed = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: true
        });

        if (parsed.errors.length > 0) {
          throw new Error(parsed.errors[0].message);
        }

        const rows: CorpusRow[] = parsed.data
          .map((row) => ({
            dhlabid: String(row.dhlabid ?? "").trim(),
            urn: String(row.urn ?? "").trim(),
            year: parseYear(row.year),
            title: String(row.title ?? "").trim()
          }))
          .filter((row) => row.dhlabid.length > 0);

        if (!cancelled) {
          setCorpus(rows);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ukjent feil ved innlasting.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCorpus(false);
        }
      }
    }

    void loadCorpus();
    return () => {
      cancelled = true;
    };
  }, []);

  const corpusById = useMemo(() => {
    const map = new Map<string, CorpusRow>();
    for (const row of corpus) {
      map.set(row.dhlabid, row);
    }
    return map;
  }, [corpus]);

  const availableYears = useMemo(
    () =>
      corpus
        .map((r) => r.year)
        .filter((y): y is number => y !== null)
        .sort((a, b) => a - b),
    [corpus]
  );

  const minYear = availableYears[0] ?? null;
  const maxYear = availableYears[availableYears.length - 1] ?? null;

  useEffect(() => {
    if (minYear !== null && maxYear !== null) {
      setYearFrom(minYear);
      setYearTo(maxYear);
    }
  }, [minYear, maxYear]);

  const filteredCorpus = useMemo(() => {
    return corpus.filter((row) => {
      if (row.year === null) {
        return true;
      }
      if (yearFrom !== null && row.year < yearFrom) {
        return false;
      }
      if (yearTo !== null && row.year > yearTo) {
        return false;
      }
      return true;
    });
  }, [corpus, yearFrom, yearTo]);

  async function runSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Skriv inn et søkeuttrykk.");
      return;
    }
    if (filteredCorpus.length === 0) {
      setError("Ingen dokumenter i valgt årsintervall.");
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const dhlabids = filteredCorpus.map((row) => row.dhlabid);
      const resp = await fetch(concordanceApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: trimmed,
          dhlabids
        })
      });

      if (!resp.ok) {
        throw new Error(`Søket feilet (${resp.status}).`);
      }

      const apiData = (await resp.json()) as ConcordanceApiRow[];
      const mapped: ConcordanceHit[] = (apiData ?? []).map((row) => {
        const bookIdRaw = row.docid ?? row.dhlabid ?? "";
        const bookId = String(bookIdRaw);
        const meta = corpusById.get(bookId);
        const urn = row.urn ?? meta?.urn ?? "";
        const title = meta?.title || "Ukjent tittel";
        const year = meta?.year ?? null;
        return {
          bookId,
          urn,
          concHtml: row.conc ?? "",
          year,
          title,
          nbUrl: urn ? toNettbibliotekUrl(urn) : ""
        };
      });

      setHits(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil ved søk.");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>{appName}</h1>
        <p>Typeløftet korpus: fokusert til konkordans.</p>
      </header>

      <section className="card">
        <div className="row">
          <label htmlFor="query">Søk (FTS5)</label>
          <input
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Eksempel: "Amerika" OR "England"'
          />
          <button onClick={() => void runSearch()} disabled={searching || loadingCorpus}>
            {searching ? "Søker..." : "Søk"}
          </button>
        </div>

        <div className="row row--years">
          <label>År fra</label>
          <input
            type="number"
            value={yearFrom ?? ""}
            onChange={(e) => setYearFrom(parseYear(e.target.value))}
            disabled={loadingCorpus}
          />
          <label>År til</label>
          <input
            type="number"
            value={yearTo ?? ""}
            onChange={(e) => setYearTo(parseYear(e.target.value))}
            disabled={loadingCorpus}
          />
          <span className="muted">
            Dokumenter i utvalg: {filteredCorpus.length} / {corpus.length}
          </span>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {loadingCorpus && <p className="muted">Laster korpus...</p>}

      <section className="results">
        <h2>Treff ({hits.length})</h2>
        {hits.length === 0 ? (
          <p className="muted">Ingen treff ennå.</p>
        ) : (
          <ul>
            {hits.map((hit, idx) => (
              <li key={`${hit.bookId}-${idx}`} className="hit">
                <div className="hit__meta">
                  <strong>{hit.title}</strong>
                  <span>{hit.year ?? "ukjent år"}</span>
                  {hit.nbUrl ? (
                    <a href={hit.nbUrl} target="_blank" rel="noreferrer">
                      Nettbiblioteket
                    </a>
                  ) : (
                    <span className="muted">Ingen URN</span>
                  )}
                </div>
                <div
                  className="hit__conc"
                  dangerouslySetInnerHTML={{ __html: hit.concHtml }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
