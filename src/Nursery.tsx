import { useEffect, useRef, useState } from "react";
import { read, readInfo, errorMessage } from "./chain";
import {
  EXPLORER,
  CONTRACT,
  STAGES,
  format,
  shortAddress,
  type Ling,
} from "./config";
import {
  ErrorNote,
  Mood,
  Progress,
  SqueekArt,
  Stat,
  useLing,
} from "./components";
import { Icon } from "./icons";
import { Modal } from "./Modal";

const PAGE_SIZE = 24;
type Entry = { id: number; ling: Ling | null; error: boolean };
export function Nursery({
  supply,
  height,
  version,
  unavailable = false,
}: {
  supply: number | null;
  height: number | null;
  version: number;
  unavailable?: boolean;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState(-1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const cached = useRef(new Map<number, Ling>());
  const previousVersion = useRef(version);
  useEffect(() => {
    if (supply === null) return;
    let active = true;
    setLoading(true);
    setError("");
    const cache = cached.current;
    if (previousVersion.current !== version) {
      cache.clear();
      previousVersion.current = version;
    }
    // Enumerate every loaded page, newest first. A filter never silently hides older pages.
    const count = Math.min(supply, pages * PAGE_SIZE);
    void Promise.all(
      Array.from({ length: count }, async (_, offset): Promise<Entry> => {
        const id = Number(
          (await read("tokenByIndex", [supply - 1 - offset]))[0],
        );
        try {
          const ling = cache.get(id) ?? (await readInfo(id));
          cache.set(id, ling);
          return { id, ling, error: false };
        } catch {
          return { id, ling: null, error: true };
        }
      }),
    )
      .then((result) => {
        if (active) setEntries(result);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supply, pages, version, retry]);
  const visible = entries.filter(
    (entry) => filter === -1 || entry.ling?.stage === filter,
  );
  const hasMore = supply !== null && pages * PAGE_SIZE < supply;
  return (
    <section
      className="section nursery"
      id="nursery"
      aria-labelledby="nursery-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="nursery-title">Meet the little ones.</h2>
          <p>One real wheel. A whole nursery of friends.</p>
        </div>
        <span className="section-count">
          {supply === null
            ? unavailable
              ? "Waiting for Sepolia"
              : "Reading nursery…"
            : `${format(supply)} ${supply === 1 ? "Squeekling" : "Squeeklings"} hatched`}
        </span>
      </div>
      <div
        className="filter-row"
        role="group"
        aria-label="Filter nursery by stage"
      >
        {[{ name: "All stages" }, ...STAGES].map((stage, index) => (
          <button
            key={stage.name}
            className={`filter-chip ${filter === index - 1 ? "selected" : ""}`}
            aria-pressed={filter === index - 1}
            onClick={() => setFilter(index - 1)}
          >
            {stage.name}
          </button>
        ))}
      </div>
      {error && (
        <ErrorNote onRetry={() => setRetry((value) => value + 1)}>
          {error}
        </ErrorNote>
      )}
      {supply === 0 && (
        <div className="empty-state">
          <Icon name="heart" />
          <h3>A nursery waiting for you.</h3>
          <p>Be the first to hatch a Squeekling.</p>
          <a className="button secondary" href="#home">
            Hatch a Squeekling <Icon name="arrow" />
          </a>
        </div>
      )}
      {loading && !entries.length && supply !== 0 && (
        <div className="gallery-loading" role="status">
          {unavailable ? (
            "The nursery will return when Sepolia is reachable. Use Try again above."
          ) : (
            <>
              <span className="loading-ring" />
              Reading the nursery from Sepolia…
            </>
          )}
        </div>
      )}
      <div className="nursery-grid" aria-busy={loading}>
        {visible.map(({ id, ling, error: failed }) => (
          <article className="nursery-card" key={id}>
            <button
              className="nursery-card-button"
              onClick={() => setSelected(id)}
              aria-label={`Visit Squeekling #${id}${ling ? `, ${ling.stageName}, ${format(ling.blocksWitnessed)} blocks` : ""}`}
            >
              <SqueekArt
                id={id}
                height={height}
                ling={ling}
                retryEnabled={false}
              />
              <div className="nursery-card-meta">
                <div>
                  <h3>Squeekling #{id}</h3>
                  <span>
                    {ling?.stageName ??
                      (failed ? "Details unavailable" : "Reading stage…")}
                  </span>
                </div>
                <Icon name="arrow" />
              </div>
              {ling && (
                <p className="nursery-blocks">
                  <Icon name="wheel" />
                  {format(ling.blocksWitnessed)} blocks witnessed
                </p>
              )}
            </button>
          </article>
        ))}
      </div>
      {!loading && entries.length > 0 && visible.length === 0 && (
        <div className="empty-state">
          <h3>No {STAGES[filter]?.name ?? ""} Squeeklings in this batch.</h3>
          <p>
            {hasMore
              ? "Load the next batch to keep looking."
              : "Try another stage to meet the others."}
          </p>
          <button className="text-button" onClick={() => setFilter(-1)}>
            Show all stages <Icon name="arrow" />
          </button>
        </div>
      )}
      {entries.some((entry) => entry.error) && (
        <ErrorNote onRetry={() => setRetry((value) => value + 1)}>
          Some Squeekling details could not be read. Retry to refresh them.
        </ErrorNote>
      )}
      <div className="gallery-footer">
        <p className="small muted" role="status">
          {entries.length > 0
            ? `${visible.length} shown · ${entries.length} of ${format(supply ?? 0)} loaded · newest first`
            : ""}
        </p>
        {hasMore && (
          <button
            className="button secondary"
            disabled={loading}
            onClick={() => setPages((value) => value + 1)}
          >
            {loading ? "Loading…" : "Load more Squeeklings"}
            <Icon name="arrow" />
          </button>
        )}
      </div>
      {selected !== null && (
        <Detail
          id={selected}
          height={height}
          version={version}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function Detail({
  id,
  height,
  version,
  onClose,
}: {
  id: number;
  height: number | null;
  version: number;
  onClose: () => void;
}) {
  const { ling, error, loading, retry } = useLing(id, version);
  return (
    <Modal
      title={`Squeekling #${id}`}
      onClose={onClose}
      className="detail-modal"
    >
      <SqueekArt id={id} height={height} ling={ling} priority />
      {loading && <p role="status">Reading Squeekling details…</p>}
      {error && <ErrorNote onRetry={retry}>{error}</ErrorNote>}
      {ling && (
        <>
          <div className="detail-stage">
            <h3>{ling.stageName}</h3>
            <Mood ling={ling} />
          </div>
          <Progress ling={ling} />
          <dl className="detail-stats">
            <Stat label="Hatch block" value={`#${format(ling.hatchHeight)}`} />
            <Stat label="Hatch round" value={format(ling.hatchRound)} />
            <Stat label="Feeds" value={format(ling.feeds)} />
            <Stat
              label="Streak / best"
              value={`${ling.streak} / ${ling.bestStreak}`}
            />
            <Stat
              label="Fur / pattern"
              value={`${ling.fur} / ${ling.pattern}`}
            />
            <Stat label="Cheeks" value={ling.cheeks} />
            <Stat label="Moonlit" value={ling.moonlit ? "Yes" : "No"} />
            <Stat
              label="Squeek holder"
              value={ling.holder ? "Gold earring" : "No"}
            />
          </dl>
          <p className="small muted">
            Hatched {new Date(ling.hatchTime * 1000).toLocaleString()}.
          </p>
          <a
            className="owner-link"
            href={`${EXPLORER}/address/${ling.owner}`}
            target="_blank"
            rel="noreferrer"
          >
            Owner {shortAddress(ling.owner)} <Icon name="external" />
          </a>
          <a
            className="button secondary wide"
            href={`${EXPLORER}/token/${CONTRACT}?a=${id}`}
            target="_blank"
            rel="noreferrer"
          >
            View token on Etherscan <Icon name="external" />
          </a>
        </>
      )}
    </Modal>
  );
}
