import type { Interface, Result } from "ethers";
import {
  ABI,
  CONTRACT,
  ETHERS_CDN,
  RPC_URLS,
  STATUS_API,
  type Hamster,
  type Ling,
  type Measurement,
} from "./config";

let ethersModule: Promise<typeof import("ethers")> | undefined;
export function getEthers() {
  if (!ethersModule) {
    ethersModule = import(/* @vite-ignore */ ETHERS_CDN).catch((error) => {
      ethersModule = undefined;
      throw error;
    });
  }
  return ethersModule;
}

let abiInterface: Interface | undefined;
async function getInterface() {
  return (abiInterface ??= new (await getEthers()).Interface(ABI));
}

// Every read, including heavy SVG calls and their retries, shares these four slots.
class ReadQueue {
  private active = 0;
  private waiting: Array<() => void> = [];
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= 4)
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.active++;
    try {
      return await operation();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
const queue = new ReadQueue();
let preferredRpc = 0;
let requestId = 0;

export class ChainError extends Error {
  constructor(
    message: string,
    public data?: unknown,
  ) {
    super(message);
  }
}

export async function read(
  method: string,
  args: readonly unknown[] = [],
): Promise<Result> {
  const iface = await getInterface();
  const data = iface.encodeFunctionData(method, args);
  return queue.run(async () => {
    const start = preferredRpc;
    let failure: unknown;
    for (let attempt = 0; attempt < RPC_URLS.length; attempt++) {
      const index = (start + attempt) % RPC_URLS.length;
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 18_000);
      try {
        const response = await fetch(RPC_URLS[index], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: ++requestId,
            method: "eth_call",
            params: [
              {
                to: CONTRACT,
                data,
                ...(method === "svgOf" || method === "previewSvg"
                  ? { gas: "0x1c9c380" }
                  : {}),
              },
              "latest",
            ],
          }),
        });
        if (!response.ok) throw new Error(`RPC returned ${response.status}`);
        const body = await response.json();
        if (body.error) {
          const message = String(body.error.message ?? "Contract read failed");
          if (message.includes("revert"))
            throw new ChainError(message, body.error.data);
          throw new Error(message);
        }
        const result = iface.decodeFunctionResult(method, body.result);
        preferredRpc = index;
        return result;
      } catch (error) {
        failure = error;
        preferredRpc = (index + 1) % RPC_URLS.length;
      } finally {
        clearTimeout(timer);
      }
    }
    if (failure instanceof ChainError) throw failure;
    throw new ChainError(
      "Sepolia is taking a break. Check your connection and try again.",
      failure,
    );
  });
}

export async function readHamster(): Promise<Hamster> {
  const r = await read("hamster");
  return {
    live: r[0],
    round: Number(r[1]),
    height: Number(r[2]),
    work: r[3],
    progress: r[4],
  };
}
export async function readInfo(id: number): Promise<Ling> {
  const r = (await read("info", [id]))[0];
  return {
    id: Number(r.id),
    owner: r.owner,
    stage: Number(r.stage),
    stageName: r.stageName,
    mood: Number(r.mood),
    moodName: r.moodName,
    blocksWitnessed: Number(r.blocksWitnessed),
    nextStageAt: Number(r.nextStageAt),
    hatchHeight: Number(r.hatchHeight),
    hatchRound: Number(r.hatchRound),
    hatchTime: Number(r.hatchTime),
    lastFedTime: Number(r.lastFedTime),
    nextFeedAt: Number(r.nextFeedAt),
    feeds: Number(r.feeds),
    streak: Number(r.streak),
    bestStreak: Number(r.bestStreak),
    fur: r.fur,
    pattern: r.pattern,
    cheeks: r.cheeks,
    moonlit: r.moonlit,
    holder: r.holder,
  };
}

export async function readMeasurement(): Promise<Measurement> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(STATUS_API, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Status unavailable");
    const { measurement } = await response.json();
    if (!measurement || typeof measurement.coreStatus !== "string")
      throw new Error("Status unavailable");
    const rpm = measurement.rpmMilli;
    if (typeof rpm !== "number" || !Number.isFinite(rpm) || rpm < 0)
      throw new Error("Status unavailable");
    return { active: measurement.coreStatus === "ACTIVE", rpm: rpm / 1000 };
  } finally {
    clearTimeout(timeout);
  }
}

const svgCache = new Map<string, Promise<string>>();
export function clearArtCache() {
  svgCache.clear();
}
export function readSvg(
  id: number,
  height: number,
  signature = "",
  blocks?: number,
): Promise<string> {
  const key = `${id}:${height}:${signature}:${blocks ?? "live"}`;
  const cached = svgCache.get(key);
  if (cached) {
    svgCache.delete(key);
    svgCache.set(key, cached);
    return cached;
  }
  const pending = read(
    blocks === undefined ? "svgOf" : "previewSvg",
    blocks === undefined ? [id] : [id, blocks],
  )
    .then((result) => {
      const svg = String(result[0]);
      if (!svg.includes("<svg")) throw new Error("Art unavailable. Try again.");
      return svg;
    })
    .catch((error) => {
      svgCache.delete(key);
      throw error;
    });
  svgCache.set(key, pending);
  if (svgCache.size > 160) svgCache.delete(svgCache.keys().next().value!);
  return pending;
}

// UTF-8-safe base64. No contract-supplied markup is inserted into the DOM.
export function svgDataUrl(svg: string, paused: boolean) {
  let display = svg;
  if (paused) {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    doc
      .querySelectorAll("animate, animateTransform, animateMotion, set")
      .forEach((el) => el.remove());
    const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = "*{animation:none!important;transition:none!important}";
    doc.documentElement.append(style);
    display = new XMLSerializer().serializeToString(doc);
  }
  const bytes = new TextEncoder().encode(display);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export function errorMessage(error: unknown): string {
  // Wallets wrap RPC errors differently. Visit the known error fields without a
  // JSON replacer, which can silently discard nested messages and revert data.
  const seen = new Set<object>();
  const collect = (value: unknown, depth = 0): string => {
    if (typeof value === "string") {
      if (value.startsWith("0x08c379a0") && abiInterface) {
        try {
          return String(abiInterface.parseError(value)?.args[0] ?? value);
        } catch {
          /* Keep the original string when this is not revert data. */
        }
      }
      return value;
    }
    if (!value || typeof value !== "object" || depth > 6 || seen.has(value))
      return "";
    seen.add(value);
    const fields = value as Record<string, unknown>;
    return (
      [
        "message",
        "shortMessage",
        "reason",
        "error",
        "data",
        "cause",
        "info",
        "originalError",
      ]
        .map((key) => collect(fields[key], depth + 1))
        .join(" ") + ` code:${fields.code ?? ""}`
    );
  };
  const source = collect(error);
  const e = error as {
    code?: number | string;
    shortMessage?: string;
    message?: string;
    reason?: string;
  };
  if (/one per wallet/i.test(source))
    return "This wallet has already hatched. Visit your Squeekling below.";
  if (/still full/i.test(source))
    return "Still full. The countdown shows when you can feed again.";
  if (/not your squeekling/i.test(source))
    return "Only the current owner can feed this Squeekling. Check your connected wallet.";
  if (/hamster offline/i.test(source))
    return "The hamster is offline. Try hatching again when the on-chain connection returns.";
  if (
    e?.code === 4001 ||
    e?.code === "ACTION_REJECTED" ||
    /user rejected|user denied|code:4001\b/i.test(source)
  )
    return "Request declined in your wallet. You can try again when you’re ready.";
  if (/insufficient funds/i.test(source))
    return "You need a little Sepolia ETH for test gas. Use the free faucet linked below.";
  if (/wallet account changed/i.test(source))
    return "Your wallet account changed. Reconnect your wallet and try again.";
  if (
    /NETWORK_ERROR|wrong network|wrong chain|network changed|unsupported chain|chain mismatch/i.test(
      source,
    )
  )
    return "Switch your wallet to Ethereum Sepolia and try again.";
  if (/Sepolia is taking a break/.test(source))
    return "Sepolia is taking a break. Check your connection and try again.";
  if (/fetch|import|module|load/i.test(source))
    return "Unable to reach Sepolia. Check your connection and try again.";
  return "Unable to complete this request. Try again or check the transaction on Sepolia Etherscan.";
}
