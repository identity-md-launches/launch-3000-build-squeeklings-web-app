import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readInfo, readSvg, svgDataUrl, errorMessage } from "./chain";
import { format, type Ling } from "./config";
import { Icon } from "./icons";

export const ArtMotion = createContext(false);
export function useLing(id: number | null, version: number) {
  const [state, setState] = useState<{
    ling: Ling | null;
    error: string;
    loading: boolean;
  }>({ ling: null, error: "", loading: !!id });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (!id) {
      setState({ ling: null, error: "", loading: false });
      return;
    }
    setState((previous) => ({
      ...previous,
      loading: !previous.ling,
      error: "",
    }));
    void readInfo(id)
      .then((ling) => {
        if (active) setState({ ling, error: "", loading: false });
      })
      .catch((error) => {
        if (active)
          setState((previous) => ({
            ...previous,
            error: errorMessage(error),
            loading: false,
          }));
      });
    return () => {
      active = false;
    };
  }, [id, version, retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}

export function SqueekArt({
  id,
  height,
  ling,
  blocks,
  className = "",
  label,
  priority = false,
  retryEnabled = true,
}: {
  id: number;
  height: number | null;
  ling?: Ling | null;
  blocks?: number;
  className?: string;
  label?: string;
  priority?: boolean;
  retryEnabled?: boolean;
}) {
  const paused = useContext(ArtMotion);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const signature = ling
    ? `${ling.lastFedTime}:${ling.mood}:${ling.holder}:${ling.feeds}`
    : "";
  useEffect(() => {
    if (height === null) return;
    let active = true;
    setLoading(true);
    setError("");
    void readSvg(id, height, signature, blocks)
      .then((value) => {
        if (active) {
          setSvg(value);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setSvg("");
          setError(errorMessage(e));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, height, blocks, signature, retry]);
  const src = useMemo(
    () => (svg ? svgDataUrl(svg, paused) : ""),
    [svg, paused],
  );
  return (
    <div className={`squeek-art ${className}`} aria-busy={loading}>
      {src && (
        <img
          src={src}
          alt={
            label ??
            `Squeekling #${id}${ling ? `, ${ling.stageName}, ${ling.moodName}` : ""}`
          }
          width="480"
          height="480"
          decoding="async"
          loading={priority ? "eager" : "lazy"}
        />
      )}
      {!src && !error && (
        <div className="art-loading">
          <span className="loading-ring" />
          <span>Fetching on-chain art…</span>
        </div>
      )}
      {error && (
        <div className="art-error">
          <p>{error}</p>
          {retryEnabled && (
            <button
              className="text-button"
              type="button"
              onClick={() => setRetry((value) => value + 1)}
            >
              Retry art <Icon name="arrow" />
            </button>
          )}
        </div>
      )}
      {!!src && loading && <span className="art-updating">Updating art…</span>}
    </div>
  );
}

export function Mood({ ling }: { ling: Ling }) {
  return (
    <span className={`mood mood-${ling.mood}`}>
      <span className="status-dot" />
      {ling.moodName}
    </span>
  );
}
export function Progress({ ling }: { ling: Ling }) {
  const complete = ling.nextStageAt === 0;
  const ratio = complete
    ? 100
    : Math.min(100, (ling.blocksWitnessed / ling.nextStageAt) * 100);
  return (
    <div className="growth">
      <div className="growth-heading">
        <span>{format(ling.blocksWitnessed)} Squeek blocks</span>
        <span>
          {complete
            ? "Fully grown"
            : `${format(ling.nextStageAt)} to next stage`}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Growth toward next stage"
        aria-valuemin={0}
        aria-valuemax={complete ? ling.blocksWitnessed || 1 : ling.nextStageAt}
        aria-valuenow={ling.blocksWitnessed}
        aria-valuetext={
          complete
            ? "Wheel Legend, fully grown"
            : `${format(ling.blocksWitnessed)} of ${format(ling.nextStageAt)} Squeek blocks`
        }
      >
        <div style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}
export function ErrorNote({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="error-note" role="status">
      <p>{children}</p>
      {onRetry && (
        <button className="text-button" type="button" onClick={onRetry}>
          Try again <Icon name="arrow" />
        </button>
      )}
    </div>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
