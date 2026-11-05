import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import {
  clearArtCache,
  errorMessage,
  read,
  readHamster,
  readMeasurement,
} from "./chain";
import {
  ArtMotion,
  ErrorNote,
  Mood,
  Progress,
  SqueekArt,
  Stat,
  useLing,
} from "./components";
import {
  ABI,
  CONTRACT,
  EXPLORER,
  CHAIN_ID,
  STAGES,
  VERIFIED_SOURCE,
  countdown,
  format,
  shortAddress,
  stageAt,
  type Hamster,
  type Ling,
  type Measurement,
} from "./config";
import { HamsterMark, Icon } from "./icons";
import { Nursery } from "./Nursery";
import { useWallet, type WalletSession } from "./wallet";

type Transaction = {
  action: "hatch" | "feed";
  phase: "wallet" | "pending" | "success" | "error";
  hash?: string;
  message?: string;
};
export default function App() {
  const wallet = useWallet();
  const [hamster, setHamster] = useState<Hamster | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [supply, setSupply] = useState<number | null>(null);
  const [readError, setReadError] = useState("");
  const [supplyError, setSupplyError] = useState("");
  const [updated, setUpdated] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [myId, setMyId] = useState<number | null>(null);
  const [accountChecked, setAccountChecked] = useState("");
  const [accountError, setAccountError] = useState("");
  const [tx, setTx] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const currentAccount = useRef(wallet.session?.address);
  currentAccount.current = wallet.session?.address;
  const height = hamster?.height ?? null;
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = (event: MediaQueryListEvent) => setPaused(event.matches);
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    let active = true;
    let polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      await Promise.allSettled([
        readHamster()
          .then((value) => {
            if (active) {
              setHamster(value);
              setReadError("");
              setUpdated(Date.now());
            }
          })
          .catch((e) => {
            if (active) setReadError(errorMessage(e));
          }),
        readMeasurement()
          .then((value) => {
            if (active) setMeasurement(value);
          })
          .catch(() => {
            if (active) setMeasurement(null);
          }),
        read("totalSupply")
          .then((result) => {
            if (active) {
              setSupply(Number(result[0]));
              setSupplyError("");
            }
          })
          .catch((e) => {
            if (active) setSupplyError(errorMessage(e));
          }),
      ]);
      polling = false;
    }
    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 30_000);
    const visible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refreshKey]);

  useEffect(() => {
    const address = wallet.session?.address;
    let active = true;
    setMyId(null);
    setAccountChecked("");
    setAccountError("");
    if (!address) return;
    void read("hatchedBy", [address])
      .then((result) => {
        if (active) {
          const id = Number(result[0]);
          setMyId(id || null);
          setAccountChecked(address);
        }
      })
      .catch((e) => {
        if (active) setAccountError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [wallet.session?.address, refreshKey]);

  const knownMine =
    wallet.session && accountChecked === wallet.session.address ? myId : null;
  const own = useLing(knownMine, updated);
  const demo = useLing(supply !== null && supply > 0 ? 1 : null, updated);
  const heroLing = own.ling ?? demo.ling;
  const previewId = knownMine ?? 1;

  async function transact(action: "hatch" | "feed", ling?: Ling) {
    if (busy) return;
    setBusy(true);
    let selected: WalletSession | null = wallet.session;
    let sentHash: string | undefined;
    try {
      selected ??= await wallet.choose();
      if (!selected) return;
      if (action === "hatch") {
        const id = Number((await read("hatchedBy", [selected.address]))[0]);
        if (id > 0) {
          if (currentAccount.current === selected.address) {
            setMyId(id);
            setAccountChecked(selected.address);
          }
          location.hash = "#my-squeekling";
          return;
        }
      }
      setTx({
        action,
        phase: "wallet",
        message:
          selected.chainId === CHAIN_ID
            ? "Confirm in your wallet. Only Sepolia test gas."
            : "Switch to Ethereum Sepolia in your wallet, then confirm.",
      });
      await wallet.switchChain(selected);
      const accounts = (await selected.provider.request({
        method: "eth_accounts",
      })) as string[];
      if (accounts[0]?.toLowerCase() !== selected.address.toLowerCase())
        throw new Error("Wallet account changed; reconnect your wallet.");
      const provider = new BrowserProvider(selected.provider);
      const signer = await provider.getSigner(selected.address);
      const contract = new Contract(CONTRACT, ABI, signer);
      const transaction =
        action === "hatch"
          ? await contract.hatch()
          : await contract.feed(ling!.id);
      sentHash = transaction.hash;
      setTx({ action, phase: "pending", hash: sentHash });
      let receipt;
      try {
        receipt = await transaction.wait(1);
      } catch (replacementError) {
        const replacement = replacementError as {
          code?: string;
          cancelled?: boolean;
          receipt?: { status: number; hash: string };
        };
        if (
          replacement.code === "TRANSACTION_REPLACED" &&
          !replacement.cancelled &&
          replacement.receipt?.status === 1
        ) {
          receipt = replacement.receipt;
          sentHash = replacement.receipt.hash;
        } else throw replacementError;
      }
      if (!receipt || receipt.status !== 1)
        throw new Error("Transaction did not succeed");
      clearArtCache();
      setTx({ action, phase: "success", hash: sentHash });
      refresh();
      if (action === "hatch") location.hash = "#my-squeekling";
    } catch (error) {
      const message = errorMessage(error);
      setTx({ action, phase: "error", hash: sentHash, message });
      if (/still full|already hatched|current owner/i.test(message)) refresh();
    } finally {
      setBusy(false);
    }
  }

  function mainAction() {
    if (busy) return;
    if (knownMine) location.hash = "#my-squeekling";
    else void transact("hatch");
  }
  return (
    <ArtMotion value={paused}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="site-shell">
        <header className="site-header" id="home">
          <a className="brand" href="#home" aria-label="Squeeklings home">
            <HamsterMark />
            <span>
              Squeeklings<span className="brand-dot">.</span>
            </span>
          </a>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#nursery">Nursery</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <button
            type="button"
            className="button wallet-button"
            onClick={wallet.open}
          >
            <Icon name="wallet" />
            <span>
              {wallet.session
                ? wallet.session.chainId === CHAIN_ID
                  ? shortAddress(wallet.session.address)
                  : "Switch to Sepolia"
                : "Connect wallet"}
            </span>
          </button>
        </header>
        <div className="live-strip" aria-label="Live hamster status">
          {measurement && (
            <span
              className={`live-pill ${measurement.active ? "running" : ""}`}
            >
              <span className="status-dot" />
              {measurement.active
                ? "Squeektoshi is running"
                : "Squeektoshi is napping"}
              {measurement.active && measurement.rpm !== null && (
                <span className="rpm">{measurement.rpm.toFixed(1)} RPM</span>
              )}
            </span>
          )}
          <span className="chain-values">
            {hamster ? (
              <>
                <span>
                  Squeek block <strong>#{format(hamster.height)}</strong>
                </span>
                <span>
                  Round <strong>{format(hamster.round)}</strong>
                </span>
                {!hamster.live && (
                  <span className="stale-label">Last known on-chain</span>
                )}
                {readError && (
                  <span className="stale-label">Refresh delayed</span>
                )}
              </>
            ) : (
              <span>
                {readError
                  ? "On-chain values unavailable"
                  : "Reading on-chain block & round…"}
              </span>
            )}
          </span>
        </div>
        <main id="main">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <h1 id="hero-title">
                Small paws.
                <br />
                Real <span className="gold-underline">growth.</span>
              </h1>
              <p className="hero-description">
                A tiny on-chain hamster that grows every time Squeektoshi runs.
              </p>
              <div className="hero-actions">
                <button
                  className="button primary hatch-button"
                  type="button"
                  onClick={mainAction}
                  aria-disabled={busy}
                >
                  <Icon name={knownMine ? "heart" : "spark"} />
                  {busy
                    ? tx?.phase === "pending"
                      ? "Transaction pending…"
                      : "Opening your wallet…"
                    : knownMine
                      ? "Visit my Squeekling"
                      : "Hatch my Squeekling"}
                  <Icon name="arrow" />
                </button>
                <span className="hatch-hint">
                  Free to hatch. Yours to grow.
                  <br />
                  <span>One per wallet · Sepolia test gas only</span>
                </span>
              </div>
              <a href="#how-it-works" className="hero-help">
                Meet the hamster behind it <Icon name="arrow" />
              </a>
            </div>
            <div className="hero-specimen">
              <span className="hero-spark spark-one" aria-hidden="true">
                <Icon name="spark" />
              </span>
              <span className="hero-spark spark-two" aria-hidden="true">
                <Icon name="spark" />
              </span>
              <div className="specimen-art">
                {heroLing ? (
                  <SqueekArt
                    id={heroLing.id}
                    height={height}
                    ling={heroLing}
                    priority
                  />
                ) : (
                  <div className="specimen-wait">
                    {supply === 0 ? (
                      <>
                        <HamsterMark />
                        <p>Your little story starts here.</p>
                      </>
                    ) : (
                      <>
                        <span className="loading-ring" />
                        <p>
                          {demo.error || readError
                            ? "The nursery is a moment away."
                            : "Meeting your on-chain friends…"}
                        </p>
                        {(demo.error || readError) && (
                          <button className="text-button" onClick={refresh}>
                            Try again <Icon name="arrow" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="specimen-caption">
                <span>
                  {heroLing
                    ? `Squeekling #${heroLing.id}`
                    : "100% on-chain SVG"}
                </span>
                <span>
                  {heroLing
                    ? `${heroLing.stageName} · ${format(heroLing.blocksWitnessed)} blocks`
                    : "A little life on Sepolia"}
                </span>
              </div>
            </div>
          </section>
          <div className="provenance-strip">
            <span>
              <Icon name="wheel" />
              Powered by a real hamster
            </span>
            <span>
              <Icon name="chain" />
              Art lives on-chain
            </span>
            <button
              className="motion-control"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              <Icon name={paused ? "play" : "pause"} />
              {paused ? "Play art" : "Pause art"}
            </button>
          </div>
          {readError && (
            <ErrorNote onRetry={refresh}>
              {readError}
              {hamster &&
                " The last successful block and round remain visible."}
            </ErrorNote>
          )}
          <div
            className="transaction-region"
            aria-live="polite"
            aria-atomic="true"
          >
            {tx && (
              <div className={`transaction transaction-${tx.phase}`}>
                <div>
                  {tx.phase === "pending" || tx.phase === "wallet" ? (
                    <span className="loading-ring" />
                  ) : (
                    <Icon name={tx.phase === "success" ? "check" : "clock"} />
                  )}
                  <p>
                    {tx.phase === "wallet"
                      ? tx.message
                      : tx.phase === "pending"
                        ? `${tx.action === "hatch" ? "Your Squeekling is hatching" : "A little snack is on its way"}. Waiting for Sepolia confirmation…`
                        : tx.phase === "success"
                          ? tx.action === "hatch"
                            ? "Welcome to the nursery. Your Squeekling has hatched."
                            : "Snack delivered. Your Squeekling says thanks."
                          : tx.message}
                  </p>
                </div>
                {tx.hash && (
                  <a
                    href={`${EXPLORER}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction <Icon name="external" />
                  </a>
                )}
                {!busy && (
                  <button
                    className="icon-button"
                    aria-label="Dismiss transaction status"
                    onClick={() => setTx(null)}
                  >
                    <Icon name="close" />
                  </button>
                )}
              </div>
            )}
          </div>
          <section
            className="section my-section"
            id="my-squeekling"
            aria-labelledby="my-title"
          >
            <div className="section-heading">
              <div>
                <h2 id="my-title">Your tiny companion.</h2>
                <p>A little care goes a long way.</p>
              </div>
              <span className="section-aside">My Squeekling</span>
            </div>
            {accountError && (
              <ErrorNote onRetry={refresh}>{accountError}</ErrorNote>
            )}
            {own.error && (
              <ErrorNote onRetry={own.retry}>{own.error}</ErrorNote>
            )}
            {own.ling && knownMine ? (
              <Companion
                ling={own.ling}
                height={height}
                busy={busy}
                pending={tx?.phase === "pending"}
                onFeed={() => void transact("feed", own.ling!)}
                address={wallet.session?.address ?? ""}
              />
            ) : (
              <div className="companion-empty">
                <div className="empty-illustration">
                  <Icon name="heart" />
                </div>
                <div>
                  <h3>
                    {wallet.session
                      ? accountChecked
                        ? "A tiny friend is waiting."
                        : "Looking for your Squeekling…"
                      : "Make room for a little friend."}
                  </h3>
                  <p>
                    {wallet.session
                      ? accountChecked
                        ? "Hatch once. Grow together with Squeektoshi."
                        : "Reading this wallet’s hatch record on Sepolia."
                      : "Connect your wallet to hatch, feed, and watch your Squeekling grow."}
                  </p>
                </div>
                <button
                  className="button secondary"
                  disabled={
                    busy ||
                    (!!wallet.session && !accountChecked && !accountError)
                  }
                  onClick={() =>
                    wallet.session ? mainAction() : wallet.open()
                  }
                >
                  {wallet.session ? "Hatch my Squeekling" : "Connect wallet"}
                  <Icon name="arrow" />
                </button>
              </div>
            )}
          </section>
          <TimeMachine
            key={previewId}
            id={previewId}
            height={height}
            ling={knownMine ? own.ling : demo.ling}
            available={supply !== null && supply > 0}
          />
          {supplyError && !readError && (
            <ErrorNote onRetry={refresh}>{supplyError}</ErrorNote>
          )}
          <Nursery
            supply={supply}
            height={height}
            version={updated}
            unavailable={supply === null && !!(supplyError || readError)}
          />
          <HowItWorks />
        </main>
        <footer className="site-footer">
          <div className="footer-top">
            <a className="brand" href="#home">
              <HamsterMark />
              <span>
                Squeeklings<span className="brand-dot">.</span>
              </span>
            </a>
            <p>Little lives. Every block matters.</p>
            <a href="https://squeekchain.com" target="_blank" rel="noreferrer">
              Meet Squeekchain <Icon name="external" />
            </a>
          </div>
          <div className="footer-links">
            <a
              href={`${EXPLORER}/address/${CONTRACT}`}
              target="_blank"
              rel="noreferrer"
            >
              Contract <Icon name="external" />
            </a>
            <a href={VERIFIED_SOURCE} target="_blank" rel="noreferrer">
              Verified source <Icon name="external" />
            </a>
            <a
              href={`${EXPLORER}/token/${CONTRACT}`}
              target="_blank"
              rel="noreferrer"
            >
              Explorer <Icon name="external" />
            </a>
            <a href="https://squeek.win" target="_blank" rel="noreferrer">
              squeek.win <Icon name="external" />
            </a>
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noreferrer"
            >
              Get free Sepolia ETH <Icon name="external" />
            </a>
          </div>
          <p className="contract-address">Ethereum Sepolia · {CONTRACT}</p>
          <div className="footer-bottom">
            <p>
              Made by{" "}
              <a href="https://x.com/0xwuy" target="_blank" rel="noreferrer">
                @0xwuy
              </a>{" "}
              for Squeekchain Genesis
            </p>
            <span>Testnet only. No real ETH needed.</span>
          </div>
        </footer>
      </div>
    </ArtMotion>
  );
}

function Companion({
  ling,
  height,
  busy,
  pending,
  onFeed,
  address,
}: {
  ling: Ling;
  height: number | null;
  busy: boolean;
  pending: boolean;
  onFeed: () => void;
  address: string;
}) {
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(interval);
  }, []);
  const remaining = Math.max(0, ling.nextFeedAt - now);
  const owner = address.toLowerCase() === ling.owner.toLowerCase();
  const text = `My Squeekling #${ling.id} is a ${ling.stageName} after ${ling.blocksWitnessed} Squeek blocks. It grows with @squeekchain's real hamster`;
  const siteUrl = new URL(location.href);
  siteUrl.hash = "";
  const share = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl.href)}`;
  return (
    <div className="companion-panel">
      <SqueekArt id={ling.id} height={height} ling={ling} />
      <div className="companion-details">
        <div className="companion-name">
          <div>
            <h3>Squeekling #{ling.id}</h3>
            <span className="stage-name">{ling.stageName}</span>
          </div>
          <Mood ling={ling} />
        </div>
        <Progress ling={ling} />
        <dl className="companion-stats">
          <Stat label="Hatch block" value={`#${format(ling.hatchHeight)}`} />
          <Stat label="Feeds" value={format(ling.feeds)} />
          <Stat label="Streak" value={format(ling.streak)} />
          <Stat label="Best streak" value={format(ling.bestStreak)} />
        </dl>
        <div className="feed-actions">
          <button
            className="button primary"
            disabled={busy || remaining > 0 || !owner}
            onClick={onFeed}
          >
            <Icon name="seed" />
            {busy
              ? pending
                ? "Feeding on Sepolia…"
                : "Waiting for your wallet…"
              : remaining > 0
                ? `Feed in ${countdown(remaining)}`
                : "Feed a sunflower seed"}
          </button>
          <a
            className="button secondary"
            href={share}
            target="_blank"
            rel="noreferrer"
          >
            Share on X <Icon name="external" />
          </a>
        </div>
        <p className="small muted feed-hint">
          {!owner
            ? "You hatched this friend, but another wallet now owns it. Only the current owner can feed it."
            : remaining > 0
              ? "A full belly. Come back when the countdown ends."
              : "Ready for a snack. Feed every 12 hours; stay within 48 hours to keep your streak."}
        </p>
      </div>
    </div>
  );
}

function TimeMachine({
  id,
  height,
  ling,
  available,
}: {
  id: number;
  height: number | null;
  ling: Ling | null;
  available: boolean;
}) {
  const [blocks, setBlocks] = useState(500);
  const [debounced, setDebounced] = useState(500);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(blocks), 320);
    return () => clearTimeout(timeout);
  }, [blocks]);
  const currentStage = stageAt(blocks);
  return (
    <section
      className="section time-machine"
      id="time-machine"
      aria-labelledby="time-title"
    >
      <div className="time-copy">
        <h2 id="time-title">A peek at the future.</h2>
        <p>Same little friend. A few more turns of the wheel.</p>
        <div className="time-readout">
          <strong>{currentStage.name}</strong>
          <span>{format(blocks)} Squeek blocks</span>
        </div>
        <label className="slider-label" htmlFor="growth-slider">
          Slide to see Squeekling #{id} grow
        </label>
        <div className="slider-control">
          <input
            id="growth-slider"
            className="growth-slider"
            type="range"
            min="0"
            max="2000"
            step="1"
            value={blocks}
            disabled={!available}
            onChange={(event) => setBlocks(Number(event.target.value))}
            aria-valuetext={`${blocks} blocks, ${currentStage.name}`}
            style={
              { "--range-percent": `${blocks / 20}%` } as React.CSSProperties
            }
          />
          <div className="slider-ticks" aria-hidden="true">
            {STAGES.slice(1).map((stage) => (
              <span
                key={stage.at}
                style={{ insetInlineStart: `${stage.at / 20}%` }}
              />
            ))}
          </div>
        </div>
        <div className="slider-ends">
          <span>0 blocks</span>
          <span>2,000 blocks</span>
        </div>
        <div className="stage-stops" aria-label="Growth milestones">
          {STAGES.slice(1).map((stage) => (
            <button
              key={stage.at}
              className={blocks >= stage.at ? "reached" : ""}
              aria-pressed={blocks === stage.at}
              onClick={() => setBlocks(stage.at)}
              disabled={!available}
            >
              <span className="stop-dot" />
              <strong>{stage.name}</strong>
              <span>{format(stage.at)} blocks</span>
            </button>
          ))}
        </div>
        <p className="small time-note">
          {available
            ? "A preview of growth, keeping today’s traits and accessories."
            : "The time machine opens when the first Squeekling hatches."}
        </p>
      </div>
      <div className="time-art">
        {available ? (
          <SqueekArt
            id={id}
            height={height}
            ling={ling}
            blocks={debounced}
            label={`Squeekling #${id} preview at ${debounced} blocks, ${stageAt(debounced).name}`}
          />
        ) : (
          <div className="time-empty">
            <Icon name="clock" />
            <span>
              {height === null
                ? "Reading Sepolia…"
                : "Waiting for the first hatch"}
            </span>
          </div>
        )}
        <span className="time-caption">Time machine · #{id}</span>
      </div>
    </section>
  );
}

function HowItWorks() {
  const rules = [
    {
      icon: "spark" as const,
      title: "Hatch a little life.",
      text: "Free to hatch, one per wallet. All you need is a little Sepolia test ETH for gas.",
    },
    {
      icon: "wheel" as const,
      title: "The wheel does the growing.",
      text: "Growth is Squeek blocks mined since hatching, read live from SqueekCore on-chain.",
    },
    {
      icon: "seed" as const,
      title: "A snack goes a long way.",
      text: "Feed every 12h. Feed again within 48h to keep your streak. 1 feed: seed. 3: scarf (a bow for Pinkies). 7: crown.",
    },
    {
      icon: "heart" as const,
      title: "Tiny friend. Big feelings.",
      text: "Excited: new blocks since your last feed. Hungry: 48h without food. Content: fed and calm. Eggs are Incubating.",
    },
    {
      icon: "spark" as const,
      title: "A little golden extra.",
      text: "Holding a Squeek NFT gives your Squeekling a gold earring. Same friend, extra sparkle.",
    },
    {
      icon: "chain" as const,
      title: "Every cheek is on-chain.",
      text: "Art and metadata are 100% on-chain SVG. Your Squeekling lives on Ethereum Sepolia.",
    },
  ];
  return (
    <section
      className="section how-section"
      id="how-it-works"
      aria-labelledby="how-title"
    >
      <div className="section-heading">
        <div>
          <h2 id="how-title">Little hamster. Simple rules.</h2>
          <p>
            Squeektoshi runs in the real world. Your Squeekling grows on-chain.
          </p>
        </div>
        <Icon name="seed" />
      </div>
      <div className="rules-grid">
        {rules.map((rule) => (
          <article className="rule-card" key={rule.title}>
            <span className="rule-icon">
              <Icon name={rule.icon} />
            </span>
            <h3>{rule.title}</h3>
            <p>{rule.text}</p>
          </article>
        ))}
      </div>
      <div className="stage-ladder" aria-label="Squeekling growth stages">
        {STAGES.map((stage, index) => (
          <div className="ladder-stage" key={stage.name}>
            <span className="stage-number">{index + 1}</span>
            <strong>{stage.name}</strong>
            <span>{format(stage.at)} blocks</span>
            <span className="small">{stage.description}</span>
          </div>
        ))}
      </div>
      <p className="ladder-note">
        Growth follows Squeek blocks, not time. Every turn of Squeektoshi’s
        wheel counts.
      </p>
    </section>
  );
}
