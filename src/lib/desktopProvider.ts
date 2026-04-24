import { ethers } from "ethers";
import { getAllNetworks, getStoredNetwork, saveStoredNetwork, upsertCustomNetwork, resolveNetworkLogo, type NetworkItem } from "./network";
import { addWatchedAssetToWallet, handleRequestMethod } from "./wcRequestHandlers";
import { grantSitePermission, hasSitePermission, touchSitePermission } from "./sitePermissions";

type ProviderEventName = "accountsChanged" | "chainChanged" | "connect" | "disconnect" | "message";

type SensitiveRequestArgs = {
  method: string;
  params: any;
  address: string;
  privateKey: string;
};

type DesktopProviderOptions = {
  getAddress: () => string;
  getPrivateKey: () => string;
  requireSensitiveApproval: (args: SensitiveRequestArgs) => Promise<any>;
  showMessage?: (text: string) => void;
};

type ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

type EthereumChainInput = {
  chainId: string;
  chainName?: string;
  nativeCurrency?: {
    name?: string;
    symbol?: string;
    decimals?: number;
  };
  rpcUrls?: string[];
  blockExplorerUrls?: string[];
};

type Listener = (...args: any[]) => void;

declare global {
  interface Window {
    ethereum?: any;
    __INRI_DESKTOP_PROVIDER__?: InriDesktopProvider;
  }
}

function providerRpcError(code: number, message: string, data?: any) {
  const error = new Error(message) as Error & { code: number; data?: any };
  error.code = code;
  if (data !== undefined) error.data = data;
  return error;
}

function toHexChainId(chainId: number) {
  return ethers.toQuantity(chainId);
}


function getCurrentOrigin() {
  try {
    return window.location.origin || "browser";
  } catch {
    return "browser";
  }
}

function getCurrentSiteName() {
  try {
    return document.title || window.location.hostname || getCurrentOrigin();
  } catch {
    return getCurrentOrigin();
  }
}

function sanitizeKey(name?: string, chainId?: number) {
  return String(name || `chain-${chainId || Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `chain-${chainId || Date.now()}`;
}

function buildNetworkFromChain(input: EthereumChainInput): NetworkItem {
  const chainId = Number(input.chainId);
  const rpcUrl = input.rpcUrls?.[0] || "";
  const explorer = input.blockExplorerUrls?.[0] || "";
  return {
    key: sanitizeKey(input.chainName, chainId),
    name: input.chainName || `Chain ${chainId}`,
    chainId,
    symbol: input.nativeCurrency?.symbol || "ETH",
    rpcUrl,
    explorerAddressUrl: explorer ? `${explorer.replace(/\/$/, "")}/address/` : "",
    explorerTxUrl: explorer ? `${explorer.replace(/\/$/, "")}/tx/` : "",
    logo: getAllNetworks().find((item) => item.chainId === chainId)?.logo || resolveNetworkLogo({ key: sanitizeKey(input.chainName, chainId), name: input.chainName || `Chain ${chainId}`, symbol: input.nativeCurrency?.symbol || "ETH" }),
  };
}

class InriDesktopProvider {
  private listeners = new Map<ProviderEventName | string, Set<Listener>>();
  private options: DesktopProviderOptions;
  private currentAddress = "";
  private currentChainId = Number(getStoredNetwork().chainId || 3777);
  public readonly isMetaMask = false;
  public readonly isINRIWallet = true;
  public readonly info: ProviderInfo;

  constructor(options: DesktopProviderOptions) {
    this.options = options;
    this.info = {
      uuid: "4b0d8d26-8bc7-44d0-a38d-inri-wallet-desktop",
      name: "INRI Wallet",
      icon: resolveNetworkLogo({ key: getStoredNetwork().key, name: getStoredNetwork().name, symbol: getStoredNetwork().symbol }),
      rdns: "life.inri.wallet",
    };
    this.sync();
  }

  sync(options?: Partial<DesktopProviderOptions>) {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    const nextAddress = this.options.getAddress() || "";
    const nextChainId = Number(getStoredNetwork().chainId || 3777);
    const previousAddress = this.currentAddress;
    const previousChainId = this.currentChainId;

    this.currentAddress = nextAddress;
    this.currentChainId = nextChainId;

    if (previousAddress !== nextAddress) {
      this.emit("accountsChanged", nextAddress ? [nextAddress] : []);
      if (nextAddress) {
        this.emit("connect", { chainId: toHexChainId(nextChainId) });
      }
    }

    if (previousChainId !== nextChainId) {
      this.emit("chainChanged", toHexChainId(nextChainId));
    }
  }

  get chainId() {
    return toHexChainId(this.currentChainId);
  }

  get selectedAddress() {
    return this.currentAddress || null;
  }

  isConnected() {
    return Boolean(this.currentAddress);
  }

  on(event: ProviderEventName | string, listener: Listener) {
    const set = this.listeners.get(event) || new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  removeListener(event: ProviderEventName | string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  off(event: ProviderEventName | string, listener: Listener) {
    return this.removeListener(event, listener);
  }

  private emit(event: ProviderEventName | string, ...args: any[]) {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (err) {
        console.error(`INRI desktop provider listener error for ${event}`, err);
      }
    });
  }

  private ensureUnlocked() {
    if (!this.currentAddress) {
      throw providerRpcError(4100, "Unlock INRI Wallet first");
    }
  }

  private async handleAddEthereumChain(chainParams: EthereumChainInput[]) {
    const item = chainParams?.[0];
    if (!item?.chainId) {
      throw providerRpcError(32602, "Invalid chain parameters");
    }

    const network = buildNetworkFromChain(item);
    upsertCustomNetwork(network);
    saveStoredNetwork(network);
    window.dispatchEvent(new Event("wallet-network-updated"));
    this.options.showMessage?.(`Network added: ${network.name}`);
    this.sync();
    return null;
  }

  private async handleSwitchEthereumChain(chainParams: Array<{ chainId: string }>) {
    const requested = chainParams?.[0]?.chainId;
    if (!requested) {
      throw providerRpcError(32602, "Missing chainId");
    }

    const chainId = Number(requested);
    const current = getStoredNetwork();
    if (Number(current.chainId) === chainId) return null;

    const known = getAllNetworks().find((item) => Number(item.chainId) === chainId);
    if (!known) {
      throw providerRpcError(4902, "Requested chain is not configured in INRI Wallet");
    }

    saveStoredNetwork(known);
    window.dispatchEvent(new Event("wallet-network-updated"));
    this.options.showMessage?.(`Network changed to ${known.name}`);
    this.sync();
    return null;
  }

  private getActiveNetwork() {
    return getStoredNetwork();
  }

  private buildRpcProvider() {
    const net = this.getActiveNetwork();
    if (!net?.rpcUrl) {
      throw providerRpcError(4900, "Current network RPC is not configured");
    }
    return new ethers.JsonRpcProvider(net.rpcUrl, Number(net.chainId));
  }

  private async handleSensitive(method: string, params: any) {
    this.ensureUnlocked();
    return this.options.requireSensitiveApproval({
      method,
      params,
      address: this.currentAddress,
      privateKey: this.options.getPrivateKey(),
    });
  }

  async request(payload: { method: string; params?: any }) {
    const method = payload?.method;
    const params = payload?.params ?? [];

    if (this.currentAddress && hasSitePermission(getCurrentOrigin(), "browser")) {
      touchSitePermission(getCurrentOrigin(), "browser", {
        accounts: [this.currentAddress],
        chains: [this.currentChainId],
        methods: method ? [method] : [],
      });
    }

    switch (method) {
      case "eth_requestAccounts": {
        this.ensureUnlocked();
        grantSitePermission({
          origin: getCurrentOrigin(),
          name: getCurrentSiteName(),
          type: "browser",
          accounts: [this.currentAddress],
          chains: [this.currentChainId],
          methods: ["eth_accounts", "eth_requestAccounts"],
        });
        return [this.currentAddress];
      }
      case "eth_accounts":
        return this.currentAddress && hasSitePermission(getCurrentOrigin(), "browser") ? [this.currentAddress] : [];
      case "eth_chainId":
        return toHexChainId(this.currentChainId);
      case "net_version":
        return String(this.currentChainId);
      case "wallet_getPermissions":
        return this.currentAddress && hasSitePermission(getCurrentOrigin(), "browser")
          ? [{ parentCapability: "eth_accounts", caveats: [{ type: "restrictReturnedAccounts", value: [this.currentAddress] }] }]
          : [];
      case "wallet_requestPermissions":
        this.ensureUnlocked();
        grantSitePermission({
          origin: getCurrentOrigin(),
          name: getCurrentSiteName(),
          type: "browser",
          accounts: [this.currentAddress],
          chains: [this.currentChainId],
          methods: ["eth_accounts", "eth_requestAccounts", "wallet_requestPermissions"],
        });
        return [{ parentCapability: "eth_accounts" }];
      case "wallet_switchEthereumChain":
        return this.handleSwitchEthereumChain(params);
      case "wallet_addEthereumChain":
        return this.handleAddEthereumChain(params);
      case "eth_getBalance": {
        const provider = this.buildRpcProvider();
        const address = params?.[0] || this.currentAddress;
        return ethers.toQuantity(await provider.getBalance(address));
      }
      case "eth_blockNumber": {
        const provider = this.buildRpcProvider();
        return ethers.toQuantity(await provider.getBlockNumber());
      }
      case "eth_getTransactionCount": {
        const provider = this.buildRpcProvider();
        const address = params?.[0] || this.currentAddress;
        const blockTag = params?.[1] || "latest";
        return ethers.toQuantity(await provider.getTransactionCount(address, blockTag));
      }
      case "eth_gasPrice": {
        const provider = this.buildRpcProvider();
        const feeData = await provider.getFeeData();
        return ethers.toQuantity(feeData.gasPrice || 0n);
      }
      case "eth_estimateGas": {
        const provider = this.buildRpcProvider();
        const tx = params?.[0] || {};
        const estimate = await provider.estimateGas(tx);
        return ethers.toQuantity(estimate);
      }
      case "eth_call": {
        const provider = this.buildRpcProvider();
        const tx = params?.[0] || {};
        const blockTag = params?.[1] || "latest";
        return await provider.call(tx, blockTag);
      }
      case "eth_getCode": {
        const provider = this.buildRpcProvider();
        return await provider.getCode(params?.[0], params?.[1] || "latest");
      }
      case "eth_getTransactionByHash": {
        const provider = this.buildRpcProvider();
        return await provider.getTransaction(params?.[0]);
      }
      case "eth_getTransactionReceipt": {
        const provider = this.buildRpcProvider();
        return await provider.getTransactionReceipt(params?.[0]);
      }
      case "eth_getBlockByNumber": {
        const provider = this.buildRpcProvider();
        return await provider.send("eth_getBlockByNumber", [params?.[0] || "latest", !!params?.[1]]);
      }
      case "eth_getLogs": {
        const provider = this.buildRpcProvider();
        return await provider.getLogs(params?.[0] || {});
      }
      case "eth_getBlockByHash": {
        const provider = this.buildRpcProvider();
        return await provider.send("eth_getBlockByHash", [params?.[0], !!params?.[1]]);
      }
      case "eth_getStorageAt": {
        const provider = this.buildRpcProvider();
        return await provider.send("eth_getStorageAt", [params?.[0], params?.[1], params?.[2] || "latest"]);
      }
      case "eth_feeHistory": {
        const provider = this.buildRpcProvider();
        return await provider.send("eth_feeHistory", [params?.[0], params?.[1], params?.[2] || []]);
      }
      case "eth_maxPriorityFeePerGas": {
        const provider = this.buildRpcProvider();
        const feeData = await provider.getFeeData();
        return ethers.toQuantity(feeData.maxPriorityFeePerGas || 0n);
      }
      case "web3_clientVersion":
        return "INRI Wallet/1.0";
      case "wallet_watchAsset": {
        return addWatchedAssetToWallet(params, `eip155:${this.currentChainId}`);
      }
      case "wallet_revokePermissions":
        return [];
      case "eth_sendTransaction":
      case "personal_sign":
      case "eth_sign":
      case "eth_signTypedData":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4":
        return this.handleSensitive(method, params);
      default:
        throw providerRpcError(4200, `Unsupported method: ${method}`);
    }
  }
}

export function installDesktopEthereumProvider(options: DesktopProviderOptions) {
  const provider =
    window.__INRI_DESKTOP_PROVIDER__ ||
    new InriDesktopProvider(options);

  provider.sync(options);
  window.__INRI_DESKTOP_PROVIDER__ = provider;
  window.ethereum = provider as any;

  const announce = () => {
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: {
          info: provider.info,
          provider,
        },
      })
    );
  };

  const handleNetworkSync = () => provider.sync();

  announce();
  window.addEventListener("eip6963:requestProvider", announce);
  window.addEventListener("wallet-network-updated", handleNetworkSync);

  return () => {
    window.removeEventListener("eip6963:requestProvider", announce);
    window.removeEventListener("wallet-network-updated", handleNetworkSync);
  };
}

export async function handleDesktopProviderRequest(args: SensitiveRequestArgs) {
  return handleRequestMethod(args);
}
