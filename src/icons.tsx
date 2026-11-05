type IconName =
  | "arrow"
  | "seed"
  | "wheel"
  | "chain"
  | "spark"
  | "heart"
  | "close"
  | "wallet"
  | "external"
  | "pause"
  | "play"
  | "check"
  | "clock"
  | "chevron";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  seed: (
    <>
      <path d="M19 4C9 2 2 11 6 17s15 2 13-13Z" />
      <path d="m6 18 9-10M10 14l-1-5M10 14l5 1" />
    </>
  ),
  wheel: (
    <>
      <circle cx="12" cy="11" r="8" />
      <circle cx="12" cy="11" r="2" />
      <path d="M12 3v6m0 4v6M4 11h6m4 0h6m-14-6 4 4m4 4 4 4m0-12-4 4m-4 4-4 4m6 2v3m-5 0h10" />
    </>
  ),
  chain: (
    <>
      <path
        d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1"
        transform="translate(1 0) scale(.92)"
      />
    </>
  ),
  spark: (
    <>
      <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z" />
    </>
  ),
  heart: (
    <>
      <path d="M20.5 4.5a5 5 0 0 0-7 0L12 6l-1.5-1.5a5 5 0 0 0-7 7L12 20l8.5-8.5a5 5 0 0 0 0-7Z" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  wallet: (
    <>
      <path d="M19 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7" />
      <path d="M20 12h-5v4h5" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14" />
      <path d="M11 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  chevron: <path d="m8 4 8 8-8 8" />,
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function HamsterMark() {
  return (
    <svg className="hamster-mark" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="13" cy="12" r="9" fill="#D5A36A" />
      <circle cx="35" cy="12" r="9" fill="#D5A36A" />
      <circle cx="13" cy="12" r="5" fill="#EAB6A5" />
      <circle cx="35" cy="12" r="5" fill="#EAB6A5" />
      <path
        d="M4 27C4 14 12 10 24 10s20 4 20 17c0 12-9 17-20 17S4 39 4 27Z"
        fill="#E9BB7E"
      />
      <ellipse cx="24" cy="32" rx="15" ry="11" fill="#FFF1DE" />
      <circle cx="16" cy="25" r="2.4" fill="#1F1D3D" />
      <circle cx="32" cy="25" r="2.4" fill="#1F1D3D" />
      <path d="m21 30 3 3 3-3" fill="#BE7869" />
      <path
        d="M24 33v3m-4-1c1 3 3 2 4 1 1 1 3 2 4-1"
        fill="none"
        stroke="#1F1D3D"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
