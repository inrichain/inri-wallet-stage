import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ethers } from "ethers";
import { DEFAULT_TOKENS, TokenItem, getWalletForPhrase, loadAllBalances } from "../lib/inri";

const ACTIVITY_KEY = "wallet_activity_demo";

type ViewToken = TokenItem & {
  balance: string;
};

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
  const [tokens, setTokens] = useState<ViewToken[]>(
    DEFAULT_TOKENS.map((item) => ({ ...item, balance: "0.000000" }))
  );

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
      try {
        const balances = await loadAllBalances(address, tokens);
        if (!active) return;

        setTokens((prev) =>
          prev.map((item) => ({
            ...item,
            balance: balances[item.symbol] || "0.000000",
          }))
        );
      } catch {}
    }

    loadBalances();
    const timer = setInterval(loadBalances, 8000);

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

  async function refreshBalances() {
    const balances = await loadAllBalances(address, tokens);
    setTokens((prev) =>
      prev.map((item) => ({
        ...item,
        balance: balances[item.symbol] || "0.000000",
      }))
    );
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

    if (Number(amount) > Number(token.balance || "0")) {
      showMessage(t.insufficientBalance);
      return;
    }

    setSending(true);

    try {
      const wallet = await getWalletForPhrase(mnemonic);

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
        status: "confirmed",
      });

      showMessage(`${t.sent}: ${amount} ${token.symbol}`);
      setAmount("");
      setToAddress("");

      await refreshBalances();
    } catch (e: any) {
      showMessage(e?.shortMessage || e?.info?.error?.message || e?.message || t.sendFailed);
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
              <img src={token.logo} alt={token.symbol} style={tokenLogoStyle} />
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
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
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
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
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
      copied: "Copied.",
      copyFail: "Could not copy.",
      noWallet: "Unlock your wallet first.",
      invalidAddress: "Invalid recipient address.",
      invalidAmount: "Invalid amount.",
      insufficientBalance: "Insufficient balance.",
      sending: "Sending...",
      sent: "Sent",
      sendFailed: "Transaction failed.",
      nativeInfo: "INRI is the native gas token of the network and pays transaction fees.",
      tokenInfo: "ERC20 token transfer through the INRI network.",
      scanQr: "Scan QR",
      close: "Close",
      scanHint: "Point your camera at a QR code containing a wallet address.",
      qrCaptured: "Address captured from QR.",
      cameraFail: "Could not open camera.",
      cameraUnavailable: "Camera unavailable.",
    },
    pt: {
      send: "Enviar",
      token: "Token",
      balance: "Saldo",
      recipient: "Endereço do destinatário",
      amount: "Quantidade",
      yourAddress: "Seu endereço",
      openCamera: "Abrir Câmera",
      useMyAddress: "Usar Meu Endereço",
      copyAddress: "Copiar Endereço",
      showQr: "Mostrar QR",
      hideQr: "Ocultar QR",
      copied: "Copiado.",
      copyFail: "Não foi possível copiar.",
      noWallet: "Desbloqueie sua carteira primeiro.",
      invalidAddress: "Endereço do destinatário inválido.",
      invalidAmount: "Quantidade inválida.",
      insufficientBalance: "Saldo insuficiente.",
      sending: "Enviando...",
      sent: "Enviado",
      sendFailed: "Falha na transação.",
      nativeInfo: "INRI é o token nativo da rede e paga as taxas.",
      tokenInfo: "Transferência de token ERC20 pela rede INRI.",
      scanQr: "Ler QR",
      close: "Fechar",
      scanHint: "Aponte sua câmera para um QR code com endereço de carteira.",
      qrCaptured: "Endereço capturado do QR.",
      cameraFail: "Não foi possível abrir a câmera.",
      cameraUnavailable: "Câmera indisponível.",
    },
  };

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
