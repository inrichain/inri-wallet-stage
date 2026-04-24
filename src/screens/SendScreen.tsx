import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { decodeQrFromFile, ensureCameraAccess, isIosPwaStandalone, listVideoDevices, pickPreferredCamera, startQrDecode, stopVideoStream } from "../lib/camera";
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

function tokenKey(token: Pick<ViewToken, "symbol" | "isNative" | "address">) {
  if (token.isNative) return `native:${token.symbol.toUpperCase()}`;
  return `token:${(token.address || "").toLowerCase()}:${token.symbol.toUpperCase()}`;
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
    const key = tokenKey(token);
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
  onSensitiveAction,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
  privateKey: string;
  onSensitiveAction?: (action: (overridePrivateKey?: string) => Promise<void>) => Promise<void>;
}) {
  const isLight = theme === "light";
  const [networkKey, setNetworkKey] = useState(getStoredNetwork().key);
  const [selectedTokenKey, setSelectedTokenKey] = useState(() => {
    const first = getDefaultTokensForNetwork(getStoredNetwork().key)[0];
    return first ? tokenKey({ ...first, balance: "0.000000" } as ViewToken) : "native:INRI";
  });
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showReceiveQr, setShowReceiveQr] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tokens, setTokens] = useState<ViewToken[]>(() =>
    buildTokenList(getStoredNetwork().key, readCustomTokens())
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const token = useMemo(
    () => tokens.find((item) => tokenKey(item) === selectedTokenKey) || tokens[0],
    [selectedTokenKey, tokens]
  );

  const tokenIdentityKey = useMemo(() => {
    return tokens.map((t) => `${tokenKey(t)}:${t.decimals || 18}`).join("|");
  }, [tokens]);

  const t = getText(lang);

  const amountNumber = Number(amount || "0");
  const balanceNumber = Number(token?.balance || "0");
  const hasValidPositiveAmount = Number.isFinite(amountNumber) && amountNumber > 0;
  const amountOverBalance = !!token && hasValidPositiveAmount && Number.isFinite(balanceNumber) && amountNumber > balanceNumber;

  useEffect(() => {
    function refreshCustomTokens() {
      setTokens((prev) => {
        const activeKey = getStoredNetwork().key;
        setNetworkKey(activeKey);

        const customTokens = readCustomTokens();
        const rebuilt = buildTokenList(activeKey, customTokens);

        return rebuilt.map((item) => {
          const existing = prev.find((p) => tokenKey(p) === tokenKey(item));
          return {
            ...item,
            balance: existing?.balance || item.balance || "0.000000",
          };
        });
      });
    }

    refreshCustomTokens();

    const onFocus = () => refreshCustomTokens();
    const onNetworkUpdated = () => refreshCustomTokens();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CUSTOM_TOKENS_KEY || event.key === "wallet_active_network") {
        refreshCustomTokens();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("wallet-network-updated", onNetworkUpdated);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wallet-network-updated", onNetworkUpdated);
    };
  }, []);

  useEffect(() => {
    if (!tokens.some((item) => tokenKey(item) === selectedTokenKey)) {
      setSelectedTokenKey(tokens[0] ? tokenKey(tokens[0]) : "native:INRI");
    }
  }, [tokens, selectedTokenKey]);

  useEffect(() => {
    let active = true;

    async function loadBalancesNow() {
      try {
        const balances = await loadAllBalances(address, tokens, networkKey);
        if (!active) return;

        setTokens((prev) =>
          prev.map((item) => ({
            ...item,
            balance: balances[item.symbol] || item.balance || "0.000000",
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
    setTimeout(() => setMessage(""), 3600);
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
        balance: balances[item.symbol] || item.balance || "0.000000",
      }))
    );
  }

  function validateSendForm(show = true) {
    if (!token) {
      if (show) showMessage(t.sendFailed);
      return false;
    }

    if (!validateAddress(toAddress.trim())) {
      if (show) showMessage(t.invalidAddress);
      return false;
    }

    if (!hasValidPositiveAmount) {
      if (show) showMessage(t.invalidAmount);
      return false;
    }

    if (amountOverBalance) {
      if (show) showMessage(`${t.insufficientBalance}: ${t.available} ${token.balance} ${token.symbol}.`);
      return false;
    }

    return true;
  }

  function openSendReview() {
    if (!validateSendForm(true)) return;
    setShowReview(true);
  }

  async function confirmReviewedSend() {
    if (!validateSendForm(true)) return;
    setShowReview(false);

    if (onSensitiveAction) {
      await onSensitiveAction(async (overridePrivateKey?: string) => {
        await executeSend(overridePrivateKey);
      });
      return;
    }

    await executeSend();
  }

  async function executeSend(overridePrivateKey?: string) {
    const signingPrivateKey = overridePrivateKey || privateKey;

    if (!signingPrivateKey) {
      showMessage(t.noWallet);
      return;
    }

    if (!validateSendForm(true)) return;

    setSending(true);

    try {
      const activeNetwork = getStoredNetwork();
      const wallet = new ethers.Wallet(signingPrivateKey, getProvider(networkKey));

      let tx: any;

      if (token.isNative) {
        tx = await wallet.sendTransaction({
          to: toAddress.trim(),
          value: ethers.parseEther(amount),
        });
      } else {
        if (!token.address) {
          throw new Error(t.tokenContractMissing);
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

    try {
      const reader = readerRef.current || new BrowserMultiFormatReader();
      readerRef.current = reader;
      const text = await decodeQrFromFile(file, reader);
      const match = text.match(/0x[a-fA-F0-9]{40}/);
      if (!match?.[0]) {
        showMessage(t.cameraFail);
        return;
      }
      setToAddress(match[0]);
      closeScanner();
      showMessage(t.qrCaptured);
    } catch (error) {
      console.error(error);
      showMessage(t.cameraFail);
    } finally {
      event.target.value = "";
    }
  }

  function openScanner() {
    setScannerStatus(t.cameraOpening);
    setShowScanner(true);
  }

  async function startLiveScanner() {
    if (!showScanner) return;

    try {
      setScannerStatus(t.cameraOpening);

      try {
        (readerRef.current as any)?.reset?.();
      } catch {}
      stopCameraTracks();

      await ensureCameraAccess();
      await new Promise((resolve) => window.setTimeout(resolve, 350));

      const video = videoRef.current;
      if (!video) {
        throw new Error(t.cameraUnavailable);
      }

      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.autoplay = true;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const devices = await listVideoDevices();
      const preferred = pickPreferredCamera(devices);

      await startQrDecode({
        reader,
        video,
        deviceId: preferred?.deviceId,
        onResult: (text) => {
          const match = text.match(/0x[a-fA-F0-9]{40}/);
          if (!match?.[0]) return;
          setToAddress(match[0]);
          closeScanner();
          showMessage(t.qrCaptured);
        },
      });

      setScannerStatus(t.cameraLive);
    } catch (error) {
      console.error(error);
      setScannerStatus(t.cameraFallbackHint);
      showMessage(t.cameraFail);
    }
  }

  function closeScanner() {
    try {
      (readerRef.current as any)?.reset?.();
    } catch {}

    stopCameraTracks();
    setScannerStatus("");
    setShowScanner(false);
  }

  useEffect(() => {
    if (!showScanner) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void startLiveScanner();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showScanner]);

  useEffect(() => {
    return () => {
      try {
        (readerRef.current as any)?.reset?.();
      } catch {}
      stopCameraTracks();
    };
  }, []);

  const activeNetwork = getStoredNetwork();

  return (
    <div style={screenStyle(isLight)}>
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
              value={selectedTokenKey}
              onChange={(e) => setSelectedTokenKey(e.target.value)}
              style={selectStyle(isLight)}
            >
              {tokens.map((item) => (
                <option key={tokenKey(item)} value={tokenKey(item)}>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
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
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            placeholder="0.00"
            inputMode="decimal"
            style={inputStyle(isLight)}
          />
          {amountOverBalance ? (
            <div style={dangerInlineStyle(isLight)}>
              {t.insufficientBalance}. {t.available}: {token?.balance} {token?.symbol}. {t.tryLowerAmount}
            </div>
          ) : null}
        </div>

        <div style={cardStyle(isLight)}>
          <div style={labelStyle(isLight)}>{t.yourAddress}</div>

          <div style={addressBoxStyle(isLight)}>{address}</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 12 }}>
            <button onClick={() => copyAddress(address)} style={secondaryButtonStyle()}>
              {t.copyAddress}
            </button>

            <button onClick={() => setShowReceiveQr((v) => !v)} style={secondaryButtonStyle()}>
              {showReceiveQr ? t.hideQr : t.showQr}
            </button>
          </div>

          {showReceiveQr ? (
            <div style={qrBoxStyle}>
              <QRCode value={address} size={180} />
            </div>
          ) : null}
        </div>

        <div style={secureBannerStyle(isLight)}>🔐 SECURE SEND V8 ACTIVE — review first, password second, send last.</div>

        {!token?.isNative ? (
          <div style={gasNoticeStyle(isLight)}>⛽ {t.gasNotice}</div>
        ) : null}

        <button
          onClick={openSendReview}
          disabled={sending}
          style={{
            ...mainButtonStyle(),
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? t.sending : `${t.reviewSend} ${token?.symbol || ""}`}
        </button>

        {token?.isNative ? (
          <div style={infoStyle(isLight)}>{t.nativeInfo}</div>
        ) : (
          <div style={infoStyle(isLight)}>{t.tokenInfo}</div>
        )}

        {message ? <div style={messageStyle}>{message}</div> : null}
      </div>

      {showReview ? (
        <div style={modalBackdropStyle} onClick={() => !sending && setShowReview(false)}>
          <div style={modalStyle(isLight)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#3f7cff", letterSpacing: ".08em", textTransform: "uppercase" }}>
                  INRI Secure Send V8
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: isLight ? "#10131a" : "#ffffff" }}>
                  {t.reviewTransaction}
                </div>
              </div>
              <button onClick={() => setShowReview(false)} disabled={sending} style={modalCloseButtonStyle(isLight)}>
                ×
              </button>
            </div>

            <div style={reviewGridStyle}>
              <div style={reviewRowStyle(isLight)}><span>{t.token}</span><strong>{token?.symbol || "-"}</strong></div>
              <div style={reviewRowStyle(isLight)}><span>{t.amount}</span><strong>{amount || "0"}</strong></div>
              <div style={reviewRowStyle(isLight)}><span>{t.network}</span><strong>{activeNetwork.name} · Chain {activeNetwork.chainId}</strong></div>
              <div style={reviewRowStyle(isLight)}><span>{t.recipient}</span><strong>{truncateMiddle(toAddress.trim())}</strong></div>
              <div style={reviewRowStyle(isLight)}><span>{t.contract}</span><strong>{token?.isNative ? t.nativeTransfer : truncateMiddle(token?.address || "-")}</strong></div>
            </div>

            <div style={warningStyle(isLight)}>⚠️ {t.securityWarning}</div>
            {!token?.isNative ? <div style={gasNoticeStyle(isLight)}>⛽ {t.gasNotice}</div> : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
              <button onClick={() => setShowReview(false)} disabled={sending} style={secondaryButtonStyle()}>
                {t.cancel}
              </button>
              <button onClick={confirmReviewedSend} disabled={sending} style={mainButtonStyle()}>
                {sending ? t.sending : t.confirmSend}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showScanner ? (
        <div style={modalBackdropStyle} onClick={closeScanner}>
          <div style={modalStyle(isLight)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: isLight ? "#10131a" : "#ffffff" }}>
                {t.scanQr}
              </div>

              <button onClick={closeScanner} style={secondaryButtonStyle()}>
                {t.close}
              </button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPickImage} style={{ display: "none" }} />

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: 320, objectFit: "cover", borderRadius: 16, border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`, background: "#000" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 12 }}>
              <button type="button" onClick={() => void startLiveScanner()} style={secondaryButtonStyle()}>
                {t.openLiveCamera}
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} style={secondaryButtonStyle()}>
                {t.openCameraGallery}
              </button>
            </div>

            {scannerStatus ? (
              <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginTop: 12, lineHeight: 1.45 }}>
                {scannerStatus}
              </div>
            ) : null}

            <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13, marginTop: 8, lineHeight: 1.45 }}>
              {isIosPwaStandalone() ? `${t.scanHint} ${t.openCameraGallery}.` : t.scanHint}
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
      insufficientBalance: "Insufficient balance",
      available: "Available",
      tryLowerAmount: "Use a lower amount.",
      sending: "Sending...",
      sent: "Sent",
      sendFailed: "Transaction failed.",
      nativeInfo: "Native token transfer pays network gas fees.",
      tokenInfo: "ERC-20 token transfer through the active network.",
      gasNotice: "Token transfers still require native INRI in the wallet to pay network gas.",
      scanQr: "Scan QR",
      close: "Close",
      scanHint: "Point your camera at a QR code containing a wallet address.",
      qrCaptured: "Address captured from QR.",
      cameraFail: "Could not open camera.",
      cameraUnavailable: "Camera unavailable.",
      cameraOpening: "Opening camera... If your phone asks for permission, tap Allow.",
      cameraLive: "Camera active. Point it at the QR code.",
      cameraFallbackHint: "Live camera did not open. Use the button below to open the phone camera/gallery and read the QR image.",
      openLiveCamera: "Open live camera",
      openCameraGallery: "Use phone camera/gallery",
      reviewSend: "Review send",
      reviewTransaction: "Review transaction",
      network: "Network",
      contract: "Contract",
      nativeTransfer: "Native transfer",
      securityWarning: "Check the recipient, amount, network and contract before confirming. After confirmation, this transaction cannot be reversed.",
      cancel: "Cancel",
      confirmSend: "Confirm send",
      tokenContractMissing: "Token contract address not found.",
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
      insufficientBalance: "Saldo insuficiente",
      available: "Disponível",
      tryLowerAmount: "Use um valor menor.",
      sending: "Enviando...",
      sent: "Enviado",
      sendFailed: "Falha na transação.",
      nativeInfo: "A transferência do token nativo paga as taxas da rede.",
      tokenInfo: "Transferência de token ERC-20 pela rede ativa.",
      gasNotice: "Transferências de token ainda precisam de INRI nativo na carteira para pagar o gas da rede.",
      scanQr: "Ler QR",
      close: "Fechar",
      scanHint: "Aponte sua câmera para um QR code com endereço de carteira.",
      qrCaptured: "Endereço capturado do QR.",
      cameraFail: "Não foi possível abrir a câmera.",
      cameraUnavailable: "Câmera indisponível.",
      cameraOpening: "Abrindo câmera... Se o celular pedir permissão, toque em Permitir.",
      cameraLive: "Câmera ativa. Aponte para o QR code.",
      cameraFallbackHint: "A câmera ao vivo não abriu. Use o botão abaixo para abrir a câmera/galeria do celular e ler a imagem do QR.",
      openLiveCamera: "Abrir câmera ao vivo",
      openCameraGallery: "Usar câmera/galeria",
      reviewSend: "Revisar envio",
      reviewTransaction: "Revisar transação",
      network: "Rede",
      contract: "Contrato",
      nativeTransfer: "Transferência nativa",
      securityWarning: "Confira o destinatário, valor, rede e contrato antes de confirmar. Depois de confirmar, essa transação não pode ser desfeita.",
      cancel: "Cancelar",
      confirmSend: "Confirmar envio",
      tokenContractMissing: "Endereço do contrato do token não encontrado.",
    },
    es: {
      send: "Enviar",
      token: "Token",
      balance: "Saldo",
      recipient: "Dirección del destinatario",
      amount: "Cantidad",
      yourAddress: "Tu dirección",
      openCamera: "Abrir Cámara",
      useMyAddress: "Usar Mi Dirección",
      copyAddress: "Copiar Dirección",
      showQr: "Mostrar QR",
      hideQr: "Ocultar QR",
      copied: "Copiado.",
      copyFail: "No se pudo copiar.",
      noWallet: "Desbloquea tu wallet primero.",
      invalidAddress: "Dirección del destinatario inválida.",
      invalidAmount: "Cantidad inválida.",
      insufficientBalance: "Saldo insuficiente",
      available: "Disponible",
      tryLowerAmount: "Usa una cantidad menor.",
      sending: "Enviando...",
      sent: "Enviado",
      sendFailed: "La transacción falló.",
      nativeInfo: "La transferencia del token nativo paga las comisiones de la red.",
      tokenInfo: "Transferencia de token ERC-20 a través de la red activa.",
      gasNotice: "Las transferencias de tokens también requieren INRI nativo para pagar el gas de la red.",
      scanQr: "Escanear QR",
      close: "Cerrar",
      scanHint: "Apunta tu cámara a un código QR que contenga una dirección de wallet.",
      qrCaptured: "Dirección capturada desde el QR.",
      cameraFail: "No se pudo abrir la cámara.",
      cameraUnavailable: "Cámara no disponible.",
      cameraOpening: "Abriendo cámara... Si el teléfono pide permiso, toca Permitir.",
      cameraLive: "Cámara activa. Apunta al código QR.",
      cameraFallbackHint: "La cámara en vivo no se abrió. Usa el botón abajo para abrir la cámara/galería del teléfono y leer la imagen QR.",
      openLiveCamera: "Abrir cámara en vivo",
      openCameraGallery: "Usar cámara/galería",
      reviewSend: "Revisar envío",
      reviewTransaction: "Revisar transacción",
      network: "Red",
      contract: "Contrato",
      nativeTransfer: "Transferencia nativa",
      securityWarning: "Revisa el destinatario, monto, red y contrato antes de confirmar. Después de confirmar, esta transacción no se puede revertir.",
      cancel: "Cancelar",
      confirmSend: "Confirmar envío",
      tokenContractMissing: "No se encontró la dirección del contrato del token.",
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

function truncateMiddle(value: string, left = 8, right = 6) {
  if (!value) return "-";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function screenStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    borderRadius: 20,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
  };
}

function secureBannerStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#bfdbfe" : "rgba(96,165,250,.3)"}`,
    background: isLight ? "#eff6ff" : "rgba(63,124,255,.1)",
    color: isLight ? "#1d4ed8" : "#93c5fd",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 900,
  };
}

const reviewGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

function reviewRowStyle(isLight: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#0d111b",
    borderRadius: 14,
    padding: "12px 14px",
    color: isLight ? "#4a5568" : "#97a0b3",
  };
}

function warningStyle(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 12,
    border: `1px solid ${isLight ? "#fed7aa" : "rgba(251,146,60,.35)"}`,
    background: isLight ? "#fff7ed" : "rgba(251,146,60,.09)",
    color: isLight ? "#9a3412" : "#fdba74",
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 700,
  };
}

function gasNoticeStyle(isLight: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isLight ? "#bfdbfe" : "rgba(96,165,250,.22)"}`,
    background: isLight ? "#eff6ff" : "rgba(96,165,250,.08)",
    color: isLight ? "#1e40af" : "#bfdbfe",
    borderRadius: 14,
    padding: "10px 12px",
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 700,
  };
}

function dangerInlineStyle(isLight: boolean): React.CSSProperties {
  return {
    marginTop: 10,
    border: `1px solid ${isLight ? "#fecaca" : "rgba(248,113,113,.32)"}`,
    background: isLight ? "#fff1f2" : "rgba(248,113,113,.08)",
    color: isLight ? "#991b1b" : "#fecaca",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
  };
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

function modalCloseButtonStyle(isLight: boolean): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#1b2741",
    color: isLight ? "#10131a" : "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 22,
    lineHeight: 1,
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
  borderRadius: 999,
  objectFit: "cover",
};

function addressBoxStyle(isLight: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#f6f8fc" : "#0d111b",
    color: isLight ? "#4a5568" : "#97a0b3",
    wordBreak: "break-all",
    fontSize: 13,
  };
}

const qrBoxStyle: React.CSSProperties = {
  marginTop: 16,
  borderRadius: 18,
  background: "#ffffff",
  padding: 14,
  display: "grid",
  placeItems: "center",
};

function infoStyle(isLight: boolean): React.CSSProperties {
  return {
    color: isLight ? "#5b6578" : "#97a0b3",
    fontSize: 12,
    lineHeight: 1.5,
  };
}

const messageStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(63,124,255,.12)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 700,
};

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.72)",
  display: "grid",
  placeItems: "center",
  padding: 12,
  zIndex: 9999,
};

function modalStyle(isLight: boolean): React.CSSProperties {
  return {
    width: "min(560px, 100%)",
    maxHeight: "calc(100dvh - 24px)",
    overflowY: "auto",
    borderRadius: 22,
    border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
    background: isLight ? "#ffffff" : "#121621",
    padding: 16,
    boxShadow: "0 24px 80px rgba(0,0,0,.55)",
  };
}
