import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ethers } from "ethers";

const BASE = "/inri-wallet-stage/";
const RPC_URL = "https://rpc-chain.inri.life";
const ACTIVITY_KEY = "wallet_activity_demo";

type TokenItem = {
  symbol: string;
  logo: string;
  balance: string;
  isNative?: boolean;
  address?: string;
  decimals?: number;
};

const DEFAULT_TOKENS: TokenItem[] = [
  {
    symbol: "INRI",
    logo: BASE + "token-inri.png",
    balance: "0.000000",
    isNative: true,
  },
  {
    symbol: "iUSD",
    logo: BASE + "token-iusd.png",
    balance: "0.000000",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
  },
  {
    symbol: "WINRI",
    logo: BASE + "token-winri.png",
    balance: "0.000000",
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
  },
  {
    symbol: "DNR",
    logo: BASE + "token-dnr.png",
    balance: "0.000000",
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
  },
];

export default function SendScreen({
  theme = "dark",
  lang = "en",
  address,
  mnemonic,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
  mnemonic: string;
}) {
  const isLight = theme === "light";
  const [selectedToken, setSelectedToken] = useState("INRI");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showReceiveQr, setShowReceiveQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tokens, setTokens] = useState<TokenItem[]>(DEFAULT_TOKENS);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const token = useMemo(
    () => tokens.find((t) => t.symbol === selectedToken) || tokens[0],
    [selectedToken, tokens]
  );

  const t = getText(lang);

  useEffect(() => {
    let active = true;

    async function loadBalances() {
      if (!address) return;

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        const nativeRaw = await provider.getBalance(address);
        const next = [...DEFAULT_TOKENS];
        next[0].balance = Number(ethers.formatEther(nativeRaw)).toFixed(6);

        const abi = ["function balanceOf(address) view returns (uint256)"];

        for (let i = 1; i < next.length; i++) {
          const item = next[i];
          if (!item.address) continue;

          try {
            const contract = new ethers.Contract(item.address, abi, provider);
            const raw = await contract.balanceOf(address);
            next[i].balance = Number(
              ethers.formatUnits(raw, item.decimals || 18)
            ).toFixed(6);
          } catch {
            next[i].balance = "0.000000";
          }
        }

        if (!active) return;
        setTokens(next);
      } catch {}
    }

    loadBalances();
    const timer = setInterval(loadBalances, 12000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address]);

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

  async function handleSend() {
    if (!mnemonic) {
      showMessage(t.noWallet);
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

    setSending(true);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);

      let txHash = "";

      if (token.isNative) {
        const tx = await wallet.sendTransaction({
          to: toAddress.trim(),
          value: ethers.parseEther(amount),
        });
        txHash = tx.hash;
        await tx.wait();
      } else {
        const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
        const contract = new ethers.Contract(token.address!, abi, wallet);
        const tx = await contract.transfer(
          toAddress.trim(),
          ethers.parseUnits(amount, token.decimals || 18)
        );
        txHash = tx.hash;
        await tx.wait();
      }

      saveActivity({
        hash: txHash,
        type: token.isNative ? "native" : "token",
        symbol: token.symbol,
        amount,
        to: toAddress.trim(),
        from: address,
        createdAt: new Date().toISOString(),
      });

      showMessage(`${t.sent}: ${amount} ${token.symbol}`);
      setAmount("");
      setToAddress("");
    } catch (e: any) {
      showMessage(e?.shortMessage || e?.message || t.sendFailed);
    } finally {
      setSending(false);
    }
  }

  function stopCameraTracks() {
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.srcObject = null;
    }
  }

  async function openScanner() {
    setShowScanner(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!videoRef.current) {
        showMessage(t.cameraUnavailable);
        return;
      }

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const backCamera = devices.find((d) =>
        /back|rear|environment/gi.test(`${d.label} ${d.deviceId}`)
      );

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: backCamera?.deviceId
          ? { deviceId: { exact: backCamera.deviceId } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      await reader.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result) => {
          if (!result) return;

          const text = result.getText();
          const match = text.match(/0x[a-fA-F0-9]{40}/);

          if (match?.[0]) {
            setToAddress(match[0]);
            closeScanner();
            showMessage(t.qrCaptured);
          }
        }
      );
    } catch {
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
      <h2 style={{ marginTop: 0, color: isLight ? "#10131a" : "#ffffff" }}>
        {t.send}
      </h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.token}</div>

          <div style={tokenPreviewStyle}>
            <div style={tokenLeftStyle}>
              <img
                src={token.logo}
                alt={token.symbol}
                style={tokenLogoStyle}
              />
              <div>
                <div style={{ fontWeight: 800, color: isLight ? "#10131a" : "#fff" }}>
                  {token.symbol}
                </div>
                <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 12 }}>
                  {t.balance}: {token.balance}
                </div>
              </div>
            </div>

            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              style={selectStyle(isLight)}
            >
              {tokens.map((item) => (
                <option key={item.symbol} value={item.symbol}>
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
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button onClick={openScanner} style={secondaryButtonStyle()}>
              {t.openCamera}
            </button>

            <button onClick={() => setToAddress(address)} style={secondaryButtonStyle()}>
              {t.useMyAddress}
            </button>
          </div>
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
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button onClick={() => copyAddress(address)} style={secondaryButtonStyle()}>
              {t.copyAddress}
            </button>

            <button
              onClick={() => setShowReceiveQr((v) => !v)}
              style={secondaryButtonStyle()}
            >
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
          {sending ? t.sending : `${t.send} ${token.symbol}`}
        </button>

        {token.isNative ? (
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
      send: "Send",
      token: "Token",
      balance: "Balance",
      recipient: "Recipient address",
      amount: "Amount",
      yourAddress: "Your address",
      openCamera: "Open Camera",
      useMyAddress: "Use My Address",
      copyAddress: "Copy Address",
      showQr: "Show QR",
      hideQr: "Hide QR",
      sending: "Sending...",
      scanQr: "Scan QR",
      close: "Close",
      scanHint: "Point the camera at a wallet QR code.",
      copied: "Copied.",
      copyFail: "Copy failed.",
      invalidAddress: "Invalid recipient address.",
      invalidAmount: "Invalid amount.",
      sent: "Sent",
      sendFailed: "Send failed.",
      cameraUnavailable: "Camera not available.",
      qrCaptured: "QR captured.",
      cameraFail: "Could not open camera.",
      nativeInfo: "INRI is the native gas token of the network and pays transaction fees.",
      tokenInfo: "This sends a real ERC-20 transfer on INRI.",
      noWallet: "No wallet loaded.",
    },
    pt: {
      send: "Enviar",
      token: "Token",
      balance: "Saldo",
      recipient: "Endereço do destinatário",
      amount: "Valor",
      yourAddress: "Seu endereço",
      openCamera: "Abrir câmera",
      useMyAddress: "Usar meu endereço",
      copyAddress: "Copiar endereço",
      showQr: "Mostrar QR",
      hideQr: "Ocultar QR",
      sending: "Enviando...",
      scanQr: "Ler QR",
      close: "Fechar",
      scanHint: "Aponte a câmera para um QR de carteira.",
      copied: "Copiado.",
      copyFail: "Falha ao copiar.",
      invalidAddress: "Endereço inválido.",
      invalidAmount: "Valor inválido.",
      sent: "Enviado",
      sendFailed: "Falha no envio.",
      cameraUnavailable: "Câmera indisponível.",
      qrCaptured: "QR capturado.",
      cameraFail: "Não foi possível abrir a câmera.",
      nativeInfo: "INRI é o token nativo da rede e paga as taxas.",
      tokenInfo: "Isso envia uma transferência ERC-20 real na INRI.",
      noWallet: "Nenhuma carteira carregada.",
    },
    es: {
      send: "Enviar",
      token: "Token",
      balance: "Saldo",
      recipient: "Dirección del destinatario",
      amount: "Cantidad",
      yourAddress: "Tu dirección",
      openCamera: "Abrir cámara",
      useMyAddress: "Usar mi dirección",
      copyAddress: "Copiar dirección",
      showQr: "Mostrar QR",
      hideQr: "Ocultar QR",
      sending: "Enviando...",
      scanQr: "Escanear QR",
      close: "Cerrar",
      scanHint: "Apunta la cámara al QR de una billetera.",
      copied: "Copiado.",
      copyFail: "Error al copiar.",
      invalidAddress: "Dirección inválida.",
      invalidAmount: "Cantidad inválida.",
      sent: "Enviado",
      sendFailed: "Error al enviar.",
      cameraUnavailable: "Cámara no disponible.",
      qrCaptured: "QR capturado.",
      cameraFail: "No se pudo abrir la cámara.",
      nativeInfo: "INRI es el token nativo de la red y paga las comisiones.",
      tokenInfo: "Esto envía una transferencia ERC-20 real en INRI.",
      noWallet: "No hay billetera cargada.",
    },
  };

  return map[lang] || map.en;
}

function cardStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 18,
    background: isLight ? "#ffffff" : "#0d111b",
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
    background: isLight ? "#f6f8fc" : "#121621",
    color: isLight ? "#10131a" : "#fff",
    outline: "none",
  };
}

function selectStyle(isLight: boolean): React.CSSProperties {
  return {
    background: isLight ? "#f6f8fc" : "#121621",
    color: isLight ? "#10131a" : "#fff",
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 10,
    padding: "8px 10px",
  };
}

const tokenPreviewStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const tokenLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const tokenLogoStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  objectFit: "cover",
  background: "#121621",
};

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
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #252b39",
    background: "#1b2741",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function infoStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 13,
    textAlign: "center",
  };
}

const messageStyle: React.CSSProperties = {
  color: "#3f7cff",
  fontSize: 13,
  textAlign: "center",
  fontWeight: 700,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 100,
};

function modalStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(560px, 100%)",
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}
