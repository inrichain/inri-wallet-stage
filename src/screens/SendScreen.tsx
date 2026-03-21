import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ensureCameraAccess, listVideoDevices, pickPreferredCamera, shouldPreferImageCaptureFallback, startQrDecode, stopVideoStream } from "../lib/camera";
import { ethers } from "ethers";
import { TokenItem, getDefaultTokensForNetwork, getProvider, loadAllBalances } from "../lib/inri";
import { getStoredNetwork } from "../lib/network";

const ACTIVITY_KEY = "wallet_activity_demo";
const CUSTOM_TOKENS_KEY = "wallet_custom_tokens";
const BASE = import.meta.env.BASE_URL || "/";

type ViewToken = TokenItem & {
  balance: string;
  networkKey?: string;
};

function readCustomTokens(): ViewToken[] {
  try {
    const saved = localStorage.getItem(CUSTOM_TOKENS_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        symbol: String(item.symbol || "").trim().toUpperCase(),
        subtitle: String(item.subtitle || "custom token"),
        logo: String(item.logo || BASE + "token-inri.png"),
        isDefault: false,
        isNative: false,
        address: item.address ? String(item.address).trim() : undefined,
        decimals:
          typeof item.decimals === "number"
            ? item.decimals
            : Number.isFinite(Number(item.decimals))
            ? Number(item.decimals)
            : 18,
        balance: String(item.balance || "0.000000"),
        networkKey: item.networkKey ? String(item.networkKey) : "inri",
      }))
      .filter((item) => item.symbol && item.address);
  } catch {
    return [];
  }
}

function buildTokenList(networkKey: string, customTokens: ViewToken[]): ViewToken[] {
  const merged: ViewToken[] = [
    ...getDefaultTokensForNetwork(networkKey).map((item) => ({ ...item, balance: "0.000000" })),
    ...customTokens
      .filter((item) => !item.networkKey || item.networkKey === networkKey)
      .map((item) => ({
        ...item,
        balance: item.balance || "0.000000",
        logo: item.logo || BASE + "token-inri.png",
      })),
  ];

  const seen = new Set<string>();
  const unique: ViewToken[] = [];

  for (const token of merged) {
    const key = token.isNative
      ? `native:${token.symbol.toUpperCase()}`
      : `token:${(token.address || "").toLowerCase()}:${token.symbol.toUpperCase()}`;

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(token);
  }

  return unique;
}

export default function SendScreen({
  theme = "dark",
  lang = "en",
  address,
  privateKey,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
  privateKey: string;
}) {
  const isLight = theme === "light";
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [selectedToken, setSelectedToken] = useState(
    getDefaultTokensForNetwork(getStoredNetwork().key)[0]?.symbol || "INRI"
  );
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showReceiveQr, setShowReceiveQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tokens, setTokens] = useState<ViewToken[]>(() =>
    buildTokenList(getStoredNetwork().key, readCustomTokens())
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const token = useMemo(
    () => tokens.find((t) => t.symbol === selectedToken) || tokens[0],
    [selectedToken, tokens]
  );

  const tokenIdentityKey = useMemo(() => {
    return tokens.map((t) => `${t.symbol}:${t.address || "native"}:${t.decimals || 18}`).join("|");
  }, [tokens]);

  const t = getText(lang);

  useEffect(() => {
    function refreshCustomTokens() {
      setTokens((prev) => {
        const activeKey = getStoredNetwork().key;
        setNetworkKey(activeKey);

        const customTokens = readCustomTokens();
        const rebuilt = buildTokenList(activeKey, customTokens);

        return rebuilt.map((item) => {
          const existing = prev.find(
            (p) =>
              p.symbol === item.symbol &&
              (p.address || "").toLowerCase() === (item.address || "").toLowerCase()
          );

          return {
            ...item,
            balance: existing?.balance || item.balance || "0.000000",
          };
        });
      });
    }

    refreshCustomTokens();

    const onFocus = () => refreshCustomTokens();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CUSTOM_TOKENS_KEY) {
        refreshCustomTokens();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!tokens.some((item) => item.symbol === selectedToken)) {
      setSelectedToken(tokens[0]?.symbol || "INRI");
    }
  }, [tokens, selectedToken]);

  useEffect(() => {
    let active = true;

    async function loadBalancesNow() {
      try {
        const balances = await loadAllBalances(address, tokens, networkKey);
        if (!active) return;

        setTokens((prev) =>
          prev.map((item) => ({
            ...item,
            balance: balances[item.symbol] || "0.000000",
          }))
        );
      } catch {}
    }

    loadBalancesNow();
    const timer = setInterval(loadBalancesNow, 8000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address, tokenIdentityKey, networkKey]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  }

  async function copyAddress(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showMessage(t.copied);
    } catch {
      showMessage(t.copyFail);
    }
  }

  function validateAddress(value: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function saveActivity(entry: any) {
    const current = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify([entry, ...current]));
  }

  async function refreshBalances() {
    const balances = await loadAllBalances(address, tokens, networkKey);
    setTokens((prev) =>
      prev.map((item) => ({
        ...item,
        balance: balances[item.symbol] || "0.000000",
      }))
    );
  }

  async function handleSend() {
    if (!privateKey) {
      showMessage(t.noWallet);
      return;
    }

    if (!token) {
      showMessage(t.sendFailed);
      return;
    }

    if (!validateAddress(toAddress.trim())) {
      showMessage(t.invalidAddress);
      return;
    }

    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) {
      showMessage(t.invalidAmount);
      return;
    }

    if (Number(amount) > Number(token.balance || "0")) {
      showMessage(t.insufficientBalance);
      return;
    }

    setSending(true);

    try {
      const activeNetwork = getStoredNetwork();
      const wallet = new ethers.Wallet(privateKey, getProvider(networkKey));

      let tx: any;

      if (token.isNative) {
        tx = await wallet.sendTransaction({
          to: toAddress.trim(),
          value: ethers.parseEther(amount),
        });
      } else {
        if (!token.address) {
          throw new Error("Token contract address not found.");
        }

        const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
        const contract = new ethers.Contract(token.address, abi, wallet);

        tx = await contract.transfer(
          toAddress.trim(),
          ethers.parseUnits(amount, token.decimals || 18)
        );
      }

      const txHash = tx.hash;
      const receipt = await tx.wait();

      const gasUsed = receipt?.gasUsed ? receipt.gasUsed.toString() : "0";

      const gasPriceWei =
        tx.gasPrice?.toString?.() ||
        tx.maxFeePerGas?.toString?.() ||
        receipt?.gasPrice?.toString?.() ||
        "0";

      const feeWei = BigInt(gasUsed || "0") * BigInt(gasPriceWei || "0");

      const gasPriceGwei = gasPriceWei !== "0" ? ethers.formatUnits(gasPriceWei, "gwei") : "0";

      const feeNative = feeWei !== 0n ? ethers.formatEther(feeWei) : "0";

      let priority = "normal";
      const gasGweiNumber = Number(gasPriceGwei);

      if (Number.isFinite(gasGweiNumber)) {
        if (gasGweiNumber > 20) priority = "high";
        else if (gasGweiNumber < 2) priority = "low";
      }

      saveActivity({
        hash: txHash,
        type: token.isNative ? "native" : "token",
        symbol: token.symbol,
        amount,
        to: toAddress.trim(),
        from: address,
        createdAt: new Date().toISOString(),
        status: receipt?.status === 1 ? "confirmed" : "failed",
        networkKey: activeNetwork.key,
        networkName: activeNetwork.name,
        chainId: activeNetwork.chainId,
        gasUsed,
        gasPriceGwei,
        feeNative,
        priority,
      });

      if (receipt?.status === 1) {
        showMessage(`${t.sent}: ${amount} ${token.symbol}`);
        setAmount("");
        setToAddress("");
        await refreshBalances();
      } else {
        showMessage(t.sendFailed);
      }
    } catch (e: any) {
      showMessage(e?.shortMessage || e?.message || t.sendFailed);
    } finally {
      setSending(false);
    }
  }

  function stopCameraTracks() {
    stopVideoStream(videoRef.current);
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new BrowserMultiFormatReader();
    try {
      const url = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(url);
      const text = result?.getText?.()?.trim?.() || "";
      const match = text.match(/0x[a-fA-F0-9]{40}/);
      if (match?.[0]) {
        setToAddress(match[0]);
        showMessage(t.qrCaptured);
      } else {
        showMessage(t.cameraFail);
      }
      URL.revokeObjectURL(url);
    } catch {
      showMessage(t.cameraFail);
    } finally {
      try { (reader as any)?.reset?.(); } catch {}
      event.target.value = "";
    }
  }

  async function openScanner() {
    if (shouldPreferImageCaptureFallback()) {
      fileRef.current?.click();
      return;
    }

    setShowScanner(true);

    try {
      await ensureCameraAccess();
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!videoRef.current) {
        showMessage(t.cameraUnavailable);
        return;
      }

      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.muted = true;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await listVideoDevices();
      const preferred = pickPreferredCamera(devices);

      await startQrDecode({
        reader,
        video: videoRef.current,
        deviceId: preferred?.deviceId,
        onResult: (text) => {
          const match = text.match(/0x[a-fA-F0-9]{40}/);
          if (!match?.[0]) return;
          setToAddress(match[0]);
          closeScanner();
          showMessage(t.qrCaptured);
        },
      });
    } catch (error) {
      console.error(error);
      showMessage(t.cameraFail);
    }
  }

  function closeScanner() {
    try {
      (readerRef.current as any)?.reset?.();
    } catch {}

    stopCameraTracks();
    setShowScanner(false);
  }

  useEffect(() => {
    return () => {
      try {
        (readerRef.current as any)?.reset?.();
      } catch {}
      stopCameraTracks();
    };
  }, []);

  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: isLight ? "#ffffff" : "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0, color: isLight ? "#10131a" : "#ffffff" }}>{t.send}</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.token}</div>

          <div style={tokenPreviewStyle}>
            <div style={tokenLeftStyle}>
              <img src={token?.logo} alt={token?.symbol} style={tokenLogoStyle} />
              <div>
                <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>
                  {token?.symbol}
                </div>
                <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12 }}>
                  {t.balance}: {token?.balance}
                </div>
              </div>
            </div>

            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              style={selectStyle(isLight)}
            >
              {tokens.map((item) => (
                <option key={`${item.symbol}-${item.address || "native"}`} value={item.symbol}>
                  {item.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.recipient}</div>
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            style={inputStyle(isLight)}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button onClick={openScanner} style={secondaryButtonStyle()}>
              {shouldPreferImageCaptureFallback() ? t.scanQr : t.openCamera}
            </button>

            <button onClick={() => setToAddress(address)} style={secondaryButtonStyle()}>
              {t.useMyAddress}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickImage} style={{ display: "none" }} />
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.amount}</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle(isLight)}
          />
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.yourAddress}</div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
              background: isLight ? "#f6f8fc" : "#0d111b",
              color: isLight ? "#4a5568" : "#97a0b3",
              wordBreak: "break-all",
              fontSize: 13,
            }}
          >
            {address}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button onClick={() => copyAddress(address)} style={secondaryButtonStyle()}>
              {t.copyAddress}
            </button>

            <button onClick={() => setShowReceiveQr((v) => !v)} style={secondaryButtonStyle()}>
              {showReceiveQr ? t.hideQr : t.showQr}
            </button>
          </div>

          {showReceiveQr ? (
            <div
              style={{
                marginTop: 16,
                borderRadius: 18,
                background: "#ffffff",
                padding: 14,
                display: "grid",
                placeItems: "center",
              }}
            >
              <QRCode value={address} size={180} />
            </div>
          ) : null}
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            ...mainButtonStyle(),
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? t.sending : `${t.send} ${token?.symbol || ""}`}
        </button>

        {token?.isNative ? (
          <div style={infoStyle(isLight)}>{t.nativeInfo}</div>
        ) : (
          <div style={infoStyle(isLight)}>{t.tokenInfo}</div>
        )}

        {message ? <div style={messageStyle}>{message}</div> : null}
      </div>

      {showScanner ? (
        <div style={modalBackdropStyle} onClick={closeScanner}>
          <div style={modalStyle(isLight)} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: isLight ? "#10131a" : "#ffffff",
                }}
              >
                {t.scanQr}
              </div>

              <button onClick={closeScanner} style={secondaryButtonStyle()}>
                {t.close}
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: 320,
                objectFit: "cover",
                borderRadius: 16,
                border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                background: "#000",
              }}
            />

            <div
              style={{
                color: isLight ? "#5b6578" : "#97a0b3",
                fontSize: 13,
                marginTop: 12,
              }}
            >
              {t.scanHint}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      send: "Send", token: "Token", balance: "Balance", recipient: "Recipient address", amount: "Amount", yourAddress: "Your address", openCamera: "Open Camera", useMyAddress: "Use My Address", copyAddress: "Copy Address", showQr: "Show QR", hideQr: "Hide QR", copied: "Copied.", copyFail: "Could not copy.", noWallet: "Unlock your wallet first.", invalidAddress: "Invalid recipient address.", invalidAmount: "Invalid amount.", insufficientBalance: "Insufficient balance.", sending: "Sending...", sent: "Sent", sendFailed: "Transaction failed.", nativeInfo: "Native token transfer pays network gas fees.", tokenInfo: "ERC-20 token transfer through the active network.", scanQr: "Scan QR", close: "Close", scanHint: "Point your camera at a QR code containing a wallet address.", qrCaptured: "Address captured from QR.", cameraFail: "Could not open camera.", cameraUnavailable: "Camera unavailable.",
    },
    pt: {
      send: "Enviar", token: "Token", balance: "Saldo", recipient: "Endereço do destinatário", amount: "Quantidade", yourAddress: "Seu endereço", openCamera: "Abrir Câmera", useMyAddress: "Usar Meu Endereço", copyAddress: "Copiar Endereço", showQr: "Mostrar QR", hideQr: "Ocultar QR", copied: "Copiado.", copyFail: "Não foi possível copiar.", noWallet: "Desbloqueie sua carteira primeiro.", invalidAddress: "Endereço do destinatário inválido.", invalidAmount: "Quantidade inválida.", insufficientBalance: "Saldo insuficiente.", sending: "Enviando...", sent: "Enviado", sendFailed: "Falha na transação.", nativeInfo: "A transferência do token nativo paga as taxas da rede.", tokenInfo: "Transferência de token ERC-20 pela rede ativa.", scanQr: "Ler QR", close: "Fechar", scanHint: "Aponte sua câmera para um QR code com endereço de carteira.", qrCaptured: "Endereço capturado do QR.", cameraFail: "Não foi possível abrir a câmera.", cameraUnavailable: "Câmera indisponível.",
    },
    es: {
      send: "Enviar", token: "Token", balance: "Saldo", recipient: "Dirección del destinatario", amount: "Cantidad", yourAddress: "Tu dirección", openCamera: "Abrir Cámara", useMyAddress: "Usar Mi Dirección", copyAddress: "Copiar Dirección", showQr: "Mostrar QR", hideQr: "Ocultar QR", copied: "Copiado.", copyFail: "No se pudo copiar.", noWallet: "Desbloquea tu wallet primero.", invalidAddress: "Dirección del destinatario inválida.", invalidAmount: "Cantidad inválida.", insufficientBalance: "Saldo insuficiente.", sending: "Enviando...", sent: "Enviado", sendFailed: "La transacción falló.", nativeInfo: "La transferencia del token nativo paga las comisiones de la red.", tokenInfo: "Transferencia de token ERC-20 a través de la red activa.", scanQr: "Escanear QR", close: "Cerrar", scanHint: "Apunta tu cámara a un código QR que contenga una dirección de wallet.", qrCaptured: "Dirección capturada desde el QR.", cameraFail: "No se pudo abrir la cámara.", cameraUnavailable: "Cámara no disponible.",
    },
  };

  map.fr ||= map.en;
  map.de ||= map.en;
  map.it ||= map.en;
  map.ru ||= map.en;
  map.zh ||= map.en;
  map.ja ||= map.en;
  map.ko ||= map.en;
  map.tr ||= map.en;
  return map[lang] || map.en;
}


function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 18,
    background: isLight ? "#fbfcff" : "#0f1522",
    padding: 14,
  };
}

function labelStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
    marginBottom: 10,
  };
}

function inputStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#0d111b",
    color: isLight ? "#10131a" : "#ffffff",
    outline: "none",
    boxSizing: "border-box",
  };
}

function selectStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#12192a",
    color: isLight ? "#10131a" : "#ffffff",
    outline: "none",
  };
}

function mainButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "none",
    background: "#3f7cff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16,
  };
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #252b39",
    background: "#1b2741",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}

const tokenPreviewStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const tokenLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const tokenLogoStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 17,
  objectFit: "cover",
};

function infoStyle(isLight: boolean): React.CSSProperties {
  return {
    textAlign: "center",
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
  };
}

const messageStyle: React.CSSProperties = {
  color: "#3f7cff",
  fontWeight: 700,
  textAlign: "center",
  fontSize: 13,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};

function modalStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(560px, 100%)",
    borderRadius: 20,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}
