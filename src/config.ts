export const CONTRACT = "0xc42ce2d42684e7d7d5c29bf7fcc6fdf419c2771f";
export const CHAIN_ID = 11155111;
export const CHAIN_HEX = "0xaa36a7";
export const EXPLORER = "https://sepolia.etherscan.io";
export const VERIFIED_SOURCE = `https://eth-sepolia.blockscout.com/address/${CONTRACT}?tab=contract`;
export const STATUS_API = "https://api.squeekchain.com/v1/status";
export const ETHERS_CDN =
  "https://cdn.jsdelivr.net/npm/ethers@6.13.5/dist/ethers.min.js";
export const RPC_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
  "https://sepolia.gateway.tenderly.co",
] as const;

export const ABI = [
  "function hatch() returns (uint256)",
  "function feed(uint256 id)",
  "function hatchedBy(address) view returns (uint256)",
  "function hamster() view returns (bool live, uint256 round, uint256 height, uint256 work, uint256 progress)",
  "function info(uint256 id) view returns (tuple(uint256 id, address owner, uint8 stage, string stageName, uint8 mood, string moodName, uint256 blocksWitnessed, uint256 nextStageAt, uint256 hatchHeight, uint256 hatchRound, uint256 hatchTime, uint256 lastFedTime, uint256 nextFeedAt, uint256 feeds, uint256 streak, uint256 bestStreak, string fur, string pattern, string cheeks, bool moonlit, bool holder))",
  "function svgOf(uint256 id) view returns (string)",
  "function previewSvg(uint256 id, uint256 blocks) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function tokenURI(uint256 id) view returns (string)",
  "event Hatched(uint256 indexed id, address indexed owner, uint256 hatchHeight, uint256 hatchRound)",
  "event Fed(uint256 indexed id, address indexed by, uint256 streak, uint256 feeds, uint256 height)",
] as const;

export const STAGES = [
  { name: "Egg", at: 0, description: "A little beginning" },
  { name: "Pinkie", at: 20, description: "Hello, tiny paws" },
  { name: "Pup", at: 150, description: "Growing into the cheeks" },
  { name: "Runner", at: 500, description: "Born for the wheel" },
  { name: "Wheel Legend", at: 1500, description: "Small hamster, big legacy" },
] as const;

export type Ling = {
  id: number;
  owner: string;
  stage: number;
  stageName: string;
  mood: number;
  moodName: string;
  blocksWitnessed: number;
  nextStageAt: number;
  hatchHeight: number;
  hatchRound: number;
  hatchTime: number;
  lastFedTime: number;
  nextFeedAt: number;
  feeds: number;
  streak: number;
  bestStreak: number;
  fur: string;
  pattern: string;
  cheeks: string;
  moonlit: boolean;
  holder: boolean;
};
export type Hamster = {
  live: boolean;
  round: number;
  height: number;
  work: bigint;
  progress: bigint;
};
export type Measurement = { active: boolean; rpm: number | null };
export const format = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
export const stageAt = (blocks: number) =>
  [...STAGES].reverse().find((stage) => blocks >= stage.at)!;
export const countdown = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
};
