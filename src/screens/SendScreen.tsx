import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

type Props = {
  theme: "dark" | "light";
  lang: string;
  address: string;
  mnemonic?: string;
};

const INRI_RPC = "https://rpc.inri.life";
const INRI_RPC_FALLBACK = "https://rpc-chain.inri.life";

type AssetOption = {
  type: "native" | "erc20";
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
};

const KNOWN_TOKENS: AssetOption[] = [
  {
    type: "native",
    symbol: "INRI",
    name: "INRI",
    decimals: 18,
  },
  {
    type: "erc20",
    symbol: "iUSD",
    name: "iUSD",
    decimals: 18,
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
  },
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

export default function SendScreen({
  theme,
  lang,
  address,
  mnemonic = "",
}: Props) {
  const t = getText(lang);

  const [assetIndex, setAssetIndex] = useState(0);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [gasPriceGwei, setGasPriceGwei] = useState("1");
  const [balance, setBalance] = useState("0");
  const [estimatedFee, setEstimatedFee] = useState("0");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const selectedAsset = KNOWN_TOKENS[assetIndex];

  const provider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(INRI_RPC, {
        name: "INRI",
        chainId: 3777,
      });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadBalance() {
      if (!address) {
        if (mounted) setBalance("0");
        return;
      }

      setLoadingBalance(true);

      try {
        const p =
          provider ||
          new ethers.JsonRpcProvider(INRI_RPC, {
            name: "INRI",
            chainId: 3777,
          });

        const nextBalance = await readAssetBalance(p, address, selectedAsset);

        if (!mounted) return;
        setBalance(nextBalance);
      } catch {
        try {
          const fallback = new ethers.JsonRpcProvider(INRI_RPC_FALLBACK, {
            name: "INRI",
            chainId: 3777,
          });

          const nextBalance = await readAssetBalance(
            fallback,
            address,
            selectedAsset
          );

          if (!mounted) return;
          setBalance(nextBalance);
        } catch {
          if (!mounted) return;
          setBalance("0");
        }
      } finally {
        if (mounted) setLoadingBalance(false);
      }
    }

    loadBalance();

    return () => {
      mounted = false;
    };
  }, [address, selectedAsset, provider]);

  useEffect(() => {
    try {
      const gasLimit = selectedAsset.type === "native" ? 21000 : 65000;
      const feeEth =
        (Number(gasPriceGwei || "0") * gasLimit) / 1_000_000_000;
      setEstimatedFee(formatDisplay(String(feeEth)));
    } catch {
      setEstimatedFee("0");
    }
  }, [gasPriceGwei, selectedAsset]);

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  async function handleSend() {
    if (!mnemonic.trim()) {
      showMessage(t.unlockToSend);
      return;
    }

    if (!to.trim()) {
      showMessage(t.enterRecipient);
      return;
    }

    if (!ethers.isAddress(to.trim())) {
      showMessage(t.invalidRecipient);
      return;
    }

    if (!amount.trim() || Number(amount) <= 0) {
      showMessage(t.invalidAmount);
      return;
    }

    setLoading(true);
    setTxHash("");

    try {
      let activeProvider: ethers.JsonRpcProvider;

      try {
        activeProvider =
          provider ||
          new ethers.JsonRpcProvider(INRI_RPC, {
            name: "INRI",
            chainId: 3777,
          });

        await activeProvider.getBlockNumber();
      } catch {
        activeProvider = new ethers.JsonRpcProvider(INRI_RPC_FALLBACK, {
          name: "INRI",
          chainId: 3777,
        });
        await activeProvider.getBlockNumber();
      }

      const signer = ethers.Wallet.fromPhrase(mnemonic.trim()).connect(
        activeProvider
      );

      const gasPrice = ethers.parseUnits(gasPriceGwei || "1", "gwei");

      let tx: ethers.TransactionResponse;

      if (selectedAsset.type === "native") {
        tx = await signer.sendTransaction({
          to: to.trim(),
          value: ethers.parseEther(amount),
          gasPrice,
        });
      } else {
        const contract = new ethers.Contract(
          selectedAsset.address!,
          ERC20_ABI,
          signer
        );

        const decimals =
          selectedAsset.decimals ??
          Number(await contract.decimals().catch(() => 18));

        tx = await contract.transfer(
          to.trim(),
          ethers.parseUnits(amount, decimals),
          {
            gasPrice,
          }
        );
      }

      setTxHash(tx.hash);
      showMessage(t.transactionSent);

      setTo("");
      setAmount("");

      try {
        const refreshedBalance = await readAssetBalance(
          activeProvider,
          address,
          selectedAsset
        );
        setBalance(refreshedBalance);
      } catch {}
    } catch (err: any) {
      const msg = String(err?.message || err || "");

      if (msg.toLowerCase().includes("insufficient funds")) {
        showMessage(t.insufficientFunds);
      } else if (msg.toLowerCase().includes("user rejected")) {
        showMessage(t.userRejected);
      } else {
        showMessage(t.sendFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.sendAsset}</div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={labelStyle(theme)}>{t.asset}</div>
            <select
              value={assetIndex}
              onChange={(e) => setAssetIndex(Number(e.target.value))}
              style={inputStyle(theme)}
            >
              {KNOWN_TOKENS.map((token, index) => (
                <option key={`${token.symbol}-${index}`} value={index}>
                  {token.symbol} — {token.name}
                </option>
              ))}
            </select>
          </div>

          <div style={balanceBox(theme)}>
            <div style={smallMuted(theme)}>{t.availableBalance}</div>
            <div style={balanceValue(theme)}>
              {loadingBalance ? "..." : balance} {selectedAsset.symbol}
            </div>
          </div>
        </div>
      </section>

      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.transferDetails}</div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={labelStyle(theme)}>{t.recipientAddress}</div>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={t.recipientPlaceholder}
              style={inputStyle(theme)}
            />
          </div>

          <div>
            <div style={labelStyle(theme)}>{t.amount}</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`0.00 ${selectedAsset.symbol}`}
              style={inputStyle(theme)}
              inputMode="decimal"
            />
          </div>

          <div>
            <div style={labelStyle(theme)}>{t.gasPrice}</div>
            <input
              value={gasPriceGwei}
              onChange={(e) => setGasPriceGwei(e.target.value)}
              placeholder="1"
              style={inputStyle(theme)}
              inputMode="decimal"
            />
          </div>

          <div style={summaryCard(theme)}>
            <SummaryRow
              theme={theme}
              label={t.network}
              value="INRI Mainnet"
            />
            <SummaryRow
              theme={theme}
              label={t.asset}
              value={selectedAsset.symbol}
            />
            <SummaryRow
              theme={theme}
              label={t.estimatedFee}
              value={`${estimatedFee} INRI`}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            style={mainButtonStyle()}
          >
            {loading ? t.sending : t.sendNow}
          </button>

          {txHash ? (
            <div style={hashBox(theme)}>
              <div style={smallMuted(theme)}>{t.transactionHash}</div>
              <div
                style={{
                  color: theme === "light" ? "#0f172a" : "#ffffff",
                  fontWeight: 800,
                  fontSize: 13,
                  wordBreak: "break-all",
                }}
              >
                {txHash}
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              style={{
                textAlign: "center",
                color: "#3f7cff",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {message}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

async function readAssetBalance(
  provider: ethers.JsonRpcProvider,
  owner: string,
  asset: AssetOption
) {
  if (!owner) return "0";

  if (asset.type === "native") {
    const raw = await provider.getBalance(owner);
    return formatDisplay(ethers.formatEther(raw));
  }

  const contract = new ethers.Contract(asset.address!, ERC20_ABI, provider);
  const [rawBalance, decimals] = await Promise.all([
    contract.balanceOf(owner),
    contract.decimals().catch(() => asset.decimals ?? 18),
  ]);

  return formatDisplay(ethers.formatUnits(rawBalance, Number(decimals)));
}

function SummaryRow({
  theme,
  label,
  value,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
      }}
    >
      <div
        style={{
          color: theme === "light" ? "#64748b" : "#94a3b8",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: theme === "light" ? "#0f172a" : "#ffffff",
          fontSize: 13,
          fontWeight: 800,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function panel(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 24,
    padding: 18,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "rgba(255,255,255,.94)" : "rgba(18,22,33,.94)",
    boxShadow:
      theme === "light"
        ? "0 12px 30px rgba(30,40,70,.06)"
        : "0 12px 30px rgba(0,0,0,.22)",
  };
}

function titleStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 14,
    color: theme === "light" ? "#0f172a" : "#ffffff",
  };
}

function labelStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    color: theme === "light" ? "#64748b" : "#94a3b8",
  };
}

function inputStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#252b39"}`,
    background: theme === "light" ? "#f8fafc" : "#0e1422",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function balanceBox(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${theme === "light" ? "#e2e8f0" : "#1f2937"}`,
    background: theme === "light" ? "#f8fafc" : "#101827",
  };
}

function balanceValue(theme: "dark" | "light"): React.CSSProperties {
  return {
    marginTop: 4,
    fontSize: 22,
    fontWeight: 900,
    color: theme === "light" ? "#0f172a" : "#ffffff",
  };
}

function smallMuted(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 12,
    color: theme === "light" ? "#64748b" : "#94a3b8",
    fontWeight: 700,
  };
}

function summaryCard(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${theme === "light" ? "#e2e8f0" : "#1f2937"}`,
    background: theme === "light" ? "#f8fafc" : "#101827",
  };
}

function hashBox(theme: "dark" | "light"): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
    background: theme === "light" ? "#ffffff" : "#0f1726",
  };
}

function mainButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "15px 16px",
    borderRadius: 16,
    border: "none",
    background: "#3f7cff",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 15,
  };
}

function formatDisplay(value: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  if (num === 0) return "0";
  if (num < 0.0001) return num.toFixed(8);
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(3);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      sendAsset: "Send asset",
      asset: "Asset",
      availableBalance: "Available balance",
      transferDetails: "Transfer details",
      recipientAddress: "Recipient address",
      recipientPlaceholder: "0x...",
      amount: "Amount",
      gasPrice: "Gas price (Gwei)",
      network: "Network",
      estimatedFee: "Estimated fee",
      sendNow: "Send now",
      sending: "Sending...",
      transactionHash: "Transaction hash",
      unlockToSend: "Unlock wallet to send funds.",
      enterRecipient: "Enter recipient address.",
      invalidRecipient: "Invalid recipient address.",
      invalidAmount: "Invalid amount.",
      transactionSent: "Transaction sent.",
      insufficientFunds: "Insufficient funds.",
      userRejected: "Transaction rejected.",
      sendFailed: "Could not send transaction.",
    },
    pt: {
      sendAsset: "Enviar ativo",
      asset: "Ativo",
      availableBalance: "Saldo disponível",
      transferDetails: "Detalhes da transferência",
      recipientAddress: "Endereço do destinatário",
      recipientPlaceholder: "0x...",
      amount: "Quantidade",
      gasPrice: "Preço do gás (Gwei)",
      network: "Rede",
      estimatedFee: "Taxa estimada",
      sendNow: "Enviar agora",
      sending: "Enviando...",
      transactionHash: "Hash da transação",
      unlockToSend: "Desbloqueie a carteira para enviar fundos.",
      enterRecipient: "Digite o endereço do destinatário.",
      invalidRecipient: "Endereço do destinatário inválido.",
      invalidAmount: "Quantidade inválida.",
      transactionSent: "Transação enviada.",
      insufficientFunds: "Fundos insuficientes.",
      userRejected: "Transação rejeitada.",
      sendFailed: "Não foi possível enviar a transação.",
    },
  };

  return map[lang] || map.en;
}
