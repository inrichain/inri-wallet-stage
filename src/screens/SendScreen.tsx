import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";

const BASE = "/inri-wallet-stage/";

type TokenItem = {
  symbol: string;
  logo: string;
  balance: string;
  isNative?: boolean;
};

const TOKENS: TokenItem[] = [
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
  },
  {
    symbol: "WINRI",
    logo: BASE + "token-winri.png",
    balance: "0.000000",
  },
  {
    symbol: "DNR",
    logo: BASE + "token-dnr.png",
    balance: "0.000000",
  },
];

const DEMO_ADDRESS = "0x119B51608D139342baB20bFF0654F275FFbbaAD0";

export default function SendScreen() {
  const [selectedToken, setSelectedToken] = useState("INRI");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showReceiveQr, setShowReceiveQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const walletAddress = useMemo(() => {
    const saved = localStorage.getItem("wallet_address_demo");
    return saved || DEMO_ADDRESS;
  }, []);

  const token = useMemo(
    () => TOKENS.find((t) => t.symbol === selectedToken) || TOKENS[0],
    [selectedToken]
  );

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2600);
  }

  async function copyAddress(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Copied.");
    } catch {
      showMessage("Copy failed.");
    }
  }

  function validateAddress(value: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function handleSend() {
    if (!validateAddress(toAddress.trim())) {
      showMessage("Invalid recipient address.");
      return;
    }

    const n = Number(amount || "0");
    if (!Number.isFinite(n) || n <= 0) {
      showMessage("Invalid amount.");
      return;
    }

    showMessage(`Send preview: ${amount} ${selectedToken}`);
  }

  async function openScanner() {
    setShowScanner(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (!videoRef.current) {
        showMessage("Camera not available.");
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
            showMessage("QR captured.");
          }
        }
      );
    } catch {
      showMessage("Could not open camera.");
    }
  }

  function closeScanner() {
    try {
      readerRef.current?.reset();
    } catch {}
    setShowScanner(false);
  }

  useEffect(() => {
    return () => {
      try {
        readerRef.current?.reset();
      } catch {}
    };
  }, []);

  return (
    <div
      style={{
        border: "1px solid #252b39",
        borderRadius: 20,
        background: "#121621",
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Send</h2>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Token</div>

          <div style={tokenPreviewStyle}>
            <div style={tokenLeftStyle}>
              <img
                src={token.logo}
                alt={token.symbol}
                style={tokenLogoStyle}
              />
              <div>
                <div style={{ fontWeight: 800 }}>{token.symbol}</div>
                <div style={{ color: "#97a0b3", fontSize: 12 }}>
                  Balance: {token.balance}
                </div>
              </div>
            </div>

            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              style={selectStyle}
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Recipient address</div>
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            style={inputStyle}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button onClick={openScanner} style={secondaryButtonStyle}>
              Open Camera
            </button>

            <button
              onClick={() => setToAddress(walletAddress)}
              style={secondaryButtonStyle}
            >
              Use My Address
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Amount</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Your address</div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #252b39",
              background: "#0d111b",
              color: "#97a0b3",
              wordBreak: "break-all",
              fontSize: 13,
            }}
          >
            {walletAddress}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button
              onClick={() => copyAddress(walletAddress)}
              style={secondaryButtonStyle}
            >
              Copy Address
            </button>

            <button
              onClick={() => setShowReceiveQr((v) => !v)}
              style={secondaryButtonStyle}
            >
              {showReceiveQr ? "Hide QR" : "Show QR"}
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
              <QRCode value={walletAddress} size={180} />
            </div>
          ) : null}
        </div>

        <button onClick={handleSend} style={mainButtonStyle}>
          Send {selectedToken}
        </button>

        {token.isNative ? (
          <div style={infoStyle}>
            INRI is the native gas token of the network and pays transaction fees.
          </div>
        ) : (
          <div style={infoStyle}>
            This is a token transfer preview screen.
          </div>
        )}

        {message ? <div style={messageStyle}>{message}</div> : null}
      </div>

      {showScanner ? (
        <div style={modalBackdropStyle} onClick={closeScanner}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18 }}>Scan QR</div>

              <button onClick={closeScanner} style={secondaryButtonStyle}>
                Close
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
                border: "1px solid #252b39",
                background: "#000",
              }}
            />

            <div style={{ color: "#97a0b3", fontSize: 13, marginTop: 12 }}>
              Point the camera at a wallet QR code.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #252b39",
  borderRadius: 18,
  background: "#0d111b",
  padding: 14,
};

const labelStyle: React.CSSProperties = {
  color: "#97a0b3",
  fontSize: 13,
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#121621",
  color: "#fff",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  background: "#121621",
  color: "#fff",
  border: "1px solid #252b39",
  borderRadius: 10,
  padding: "8px 10px",
};

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

const mainButtonStyle: React.CSSProperties = {
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

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #252b39",
  background: "#1b2741",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const infoStyle: React.CSSProperties = {
  color: "#97a0b3",
  fontSize: 13,
  textAlign: "center",
};

const messageStyle: React.CSSProperties = {
  color: "#8fb3ff",
  fontSize: 13,
  textAlign: "center",
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

const modalStyle: React.CSSProperties = {
  width: "min(560px, 100%)",
  border: "1px solid #252b39",
  borderRadius: 20,
  background: "#121621",
  padding: 16,
};
