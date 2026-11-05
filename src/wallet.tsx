import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Eip1193Provider } from "ethers";
import {
  CHAIN_HEX,
  CHAIN_ID,
  EXPLORER,
  RPC_URLS,
  shortAddress,
} from "./config";
import { errorMessage, getEthers } from "./chain";
import { Modal } from "./Modal";
import { Icon } from "./icons";

export type WalletProvider = Eip1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  disconnect?: () => Promise<void>;
};
type WalletOption = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: WalletProvider;
};
export type WalletSession = {
  provider: WalletProvider;
  address: string;
  chainId: number;
  name: string;
};
declare global {
  interface Window {
    ethereum?: WalletProvider;
  }
}
type WalletState = {
  session: WalletSession | null;
  open: () => void;
  choose: () => Promise<WalletSession | null>;
  switchChain: (session: WalletSession) => Promise<void>;
};
const Context = createContext<WalletState | null>(null);
export const useWallet = () => useContext(Context)!;

const OPEN_IN = [
  {
    id: "metamask",
    name: "MetaMask",
    href: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    href: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    id: "rabby",
    name: "Rabby",
    href: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    id: "phantom",
    name: "Phantom",
    href: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}`,
  },
];
function rememberWallet(id: string | null) {
  try {
    if (id) localStorage.setItem("squeeklings:wallet", id);
    else localStorage.removeItem("squeeklings:wallet");
  } catch {
    /* Private browsers can refuse storage. */
  }
}
function rememberedWallet() {
  try {
    return localStorage.getItem("squeeklings:wallet");
  } catch {
    return null;
  }
}
let coinbaseProvider: WalletProvider | undefined;
async function coinbase() {
  if (!coinbaseProvider) {
    const { createCoinbaseWalletSDK } = await import("@coinbase/wallet-sdk");
    const sdk = createCoinbaseWalletSDK({
      appName: "Squeeklings",
      appLogoUrl: new URL("favicon.svg", document.baseURI).href,
      appChainIds: [CHAIN_ID],
      preference: { options: "all" },
    });
    coinbaseProvider = sdk.getProvider() as WalletProvider;
  }
  return coinbaseProvider;
}

export function WalletContext({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [options, setOptions] = useState<WalletOption[]>([]);
  const [opened, setOpened] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const resolveChoice = useRef<
    ((session: WalletSession | null) => void) | null
  >(null);
  const restoreAttempted = useRef(false);
  const mobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    !window.ethereum &&
    !options.length;

  async function restore(provider: WalletProvider, name: string) {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    try {
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      if (!accounts.length) return;
      const chainId = Number(await provider.request({ method: "eth_chainId" }));
      const { getAddress } = await getEthers();
      setSession({ provider, name, address: getAddress(accounts[0]), chainId });
    } catch {
      rememberWallet(null);
    }
  }
  useEffect(() => {
    const announce = (event: Event) => {
      const option = (event as CustomEvent<WalletOption>).detail;
      if (
        !option?.provider?.request ||
        !option.info?.uuid ||
        typeof option.info.name !== "string"
      )
        return;
      setOptions((current) =>
        current.some((item) => item.info.uuid === option.info.uuid)
          ? current
          : [...current, option],
      );
      if (rememberedWallet() === option.info.rdns)
        void restore(option.provider, option.info.name);
    };
    window.addEventListener("eip6963:announceProvider", announce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    if (rememberedWallet() === "browser" && window.ethereum)
      void restore(window.ethereum, "Browser wallet");
    if (rememberedWallet() === "coinbase")
      void coinbase()
        .then((provider) => restore(provider, "Coinbase Wallet"))
        .catch(() => rememberWallet(null));
    return () =>
      window.removeEventListener("eip6963:announceProvider", announce);
  }, []);

  useEffect(() => {
    if (!session) return;
    const provider = session.provider;
    const accountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!accounts?.length) {
        setSession(null);
        rememberWallet(null);
      } else
        void getEthers().then(({ getAddress }) =>
          setSession((current) =>
            current?.provider === provider
              ? { ...current, address: getAddress(accounts[0]) }
              : current,
          ),
        );
    };
    const chainChanged = (...args: unknown[]) =>
      setSession((current) =>
        current?.provider === provider
          ? { ...current, chainId: Number(args[0]) }
          : current,
      );
    const disconnected = () => {
      setSession(null);
      rememberWallet(null);
    };
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    provider.on?.("disconnect", disconnected);
    return () => {
      provider.removeListener?.("accountsChanged", accountsChanged);
      provider.removeListener?.("chainChanged", chainChanged);
      provider.removeListener?.("disconnect", disconnected);
    };
  }, [session?.provider]);

  function close() {
    setOpened(false);
    setError("");
    resolveChoice.current?.(null);
    resolveChoice.current = null;
  }
  async function connect(
    id: string,
    name: string,
    providerSource: WalletProvider | (() => Promise<WalletProvider>),
  ) {
    setPending(id);
    setError("");
    try {
      const provider =
        typeof providerSource === "function"
          ? await providerSource()
          : providerSource;
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts.length) throw new Error("Wallet returned no account");
      const { getAddress } = await getEthers();
      const connected = {
        provider,
        name,
        address: getAddress(accounts[0]),
        chainId: Number(await provider.request({ method: "eth_chainId" })),
      };
      setSession(connected);
      rememberWallet(id);
      setOpened(false);
      resolveChoice.current?.(connected);
      resolveChoice.current = null;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending("");
    }
  }
  async function switchChain(selected: WalletSession) {
    const current = Number(
      await selected.provider.request({ method: "eth_chainId" }),
    );
    if (current !== CHAIN_ID) {
      try {
        await selected.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_HEX }],
        });
      } catch (switchError) {
        // A rejected request stays rejected; other switch failures can mean an unknown chain.
        const code = (switchError as { code?: number }).code;
        if (code === 4001) throw switchError;
        await selected.provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN_HEX,
              chainName: "Ethereum Sepolia",
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "SepoliaETH",
                decimals: 18,
              },
              rpcUrls: [RPC_URLS[0]],
              blockExplorerUrls: [EXPLORER],
            },
          ],
        });
        const afterAdd = Number(
          await selected.provider.request({ method: "eth_chainId" }),
        );
        if (afterAdd !== CHAIN_ID)
          await selected.provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CHAIN_HEX }],
          });
      }
    }
    if (
      Number(await selected.provider.request({ method: "eth_chainId" })) !==
      CHAIN_ID
    )
      throw new Error("Wrong network");
    setSession((value) =>
      value?.provider === selected.provider
        ? { ...value, chainId: CHAIN_ID }
        : value,
    );
  }
  const value = {
    session,
    switchChain,
    open: () => {
      setError("");
      setOpened(true);
      window.dispatchEvent(new Event("eip6963:requestProvider"));
    },
    choose: () =>
      new Promise<WalletSession | null>((resolve) => {
        resolveChoice.current = resolve;
        setOpened(true);
        setError("");
        window.dispatchEvent(new Event("eip6963:requestProvider"));
      }),
  };
  return (
    <Context value={value}>
      {children}
      {opened && (
        <Modal
          title={session ? "Your wallet" : "Connect a wallet"}
          onClose={close}
          className="wallet-modal"
        >
          {session ? (
            <>
              <p className="muted">Connected with {session.name}</p>
              <a
                className="full-address"
                href={`${EXPLORER}/address/${session.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {session.address}
                <Icon name="external" />
              </a>
              <p className="network-note">
                {session.chainId === CHAIN_ID
                  ? "Ethereum Sepolia"
                  : "Switch to Sepolia to hatch or feed."}
              </p>
              {session.chainId !== CHAIN_ID && (
                <button
                  className="button primary wide"
                  disabled={!!pending}
                  onClick={async () => {
                    setPending("switch");
                    try {
                      await switchChain(session);
                      close();
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setPending("");
                    }
                  }}
                >
                  Switch to Sepolia
                </button>
              )}
              <button
                className="wallet-row"
                onClick={() => {
                  setSession(null);
                  rememberWallet(null);
                  close();
                  void session.provider.disconnect?.().catch(() => undefined);
                }}
              >
                <Icon name="wallet" />
                Disconnect {shortAddress(session.address)}
              </button>
            </>
          ) : (
            <>
              <p className="muted wallet-intro">
                A tiny friend, one wallet away. Only Sepolia test gas.
              </p>
              <div className="wallet-list">
                {options.map((option) => (
                  <button
                    key={option.info.uuid}
                    className="wallet-row"
                    disabled={!!pending}
                    onClick={() =>
                      void connect(
                        option.info.rdns,
                        option.info.name,
                        option.provider,
                      )
                    }
                  >
                    {option.info.icon?.startsWith("data:image/") ? (
                      <img
                        src={option.info.icon}
                        width="28"
                        height="28"
                        alt=""
                      />
                    ) : (
                      <Icon name="wallet" />
                    )}
                    <span>
                      {option.info.name}
                      {pending === option.info.rdns && " · opening…"}
                    </span>
                    <Icon name="chevron" />
                  </button>
                ))}
                {!options.length && window.ethereum && (
                  <button
                    className="wallet-row"
                    disabled={!!pending}
                    onClick={() =>
                      void connect(
                        "browser",
                        "Browser wallet",
                        window.ethereum!,
                      )
                    }
                  >
                    <Icon name="wallet" />
                    <span>
                      Browser wallet{pending === "browser" && " · opening…"}
                    </span>
                    <Icon name="chevron" />
                  </button>
                )}
                {mobile &&
                  OPEN_IN.map((wallet) => (
                    <a
                      key={wallet.id}
                      className="wallet-row"
                      href={wallet.href(location.href)}
                    >
                      <img
                        src={
                          new URL(`wallet-${wallet.id}.svg`, document.baseURI)
                            .href
                        }
                        width="28"
                        height="28"
                        alt=""
                      />
                      <span>Open in {wallet.name}</span>
                      <Icon name="external" />
                    </a>
                  ))}
                <button
                  className="wallet-row"
                  disabled={!!pending}
                  onClick={() =>
                    void connect("coinbase", "Coinbase Wallet", coinbase)
                  }
                >
                  <img
                    src={new URL("wallet-coinbase.svg", document.baseURI).href}
                    width="28"
                    height="28"
                    alt=""
                  />
                  <span>
                    {mobile ? "Coinbase Smart Wallet" : "Coinbase Wallet"}
                    {pending === "coinbase" && " · opening…"}
                  </span>
                  <Icon name="chevron" />
                </button>
              </div>
              {!options.length && !window.ethereum && !mobile && (
                <p className="small muted">
                  Use Coinbase Wallet with a passkey, or install MetaMask or
                  Rabby and reload.
                </p>
              )}
            </>
          )}
          <p role="status" className="error-text wallet-error">
            {error}
          </p>
        </Modal>
      )}
    </Context>
  );
}
