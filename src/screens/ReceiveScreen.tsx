import React, { useMemo, useState } from "react";
import QRCode from "react-qr-code";

type Props = {
  theme: "dark" | "light";
  lang: string;
  address: string;
};

const BASE = "/inri-wallet-stage/";

export default function ReceiveScreen({ theme, lang, address }: Props) {
  const t = getText(lang);
  const [copied, setCopied] = useState(false);

  const receiveUri = useMemo(() => {
    if (!address) return "";
    return `ethereum:${address}@3777`;
  }, [address]);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.receiveInri}</div>

        <div
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: 18,
              borderRadius: 24,
              boxShadow: "0 12px 28px rgba(0,0,0,.10)",
            }}
          >
            <QRCode
              value={receiveUri || address || "INRI"}
              size={220}
              bgColor="#ffffff"
              fgColor="#111827"
            />
          </div>

          <img
            src={`${BASE}token-inri.png`}
            alt="INRI"
            style={{
              width: 58,
              height: 58,
              objectFit: "contain",
              filter:
                theme === "light"
                  ? "drop-shadow(0 12px 24px rgba(63,124,255,.16))"
                  : "drop-shadow(0 14px 26px rgba(63,124,255,.30))",
            }}
          />

          <div
            style={{
              textAlign: "center",
              color: theme === "light" ? "#64748b" : "#94a3b8",
              fontSize: 13,
              fontWeight: 700,
              maxWidth: 420,
              lineHeight: 1.5,
            }}
          >
            {t.scanOrCopy}
          </div>
        </div>
      </section>

      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.yourAddress}</div>

        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
            background: theme === "light" ? "#f8fafc" : "#0f1726",
            color: theme === "light" ? "#0f172a" : "#ffffff",
            fontWeight: 800,
            fontSize: 14,
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {address || t.noAddressLoaded}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginTop: 14,
          }}
        >
          <button onClick={copyAddress} style={mainButtonStyle()}>
            {copied ? t.copied : t.copyAddress}
          </button>

          <button
            onClick={() => {
              if (!address) return;
              const text = `${t.myInriAddress}\n${address}`;
              if (navigator.share) {
                navigator.share({
                  title: "INRI Wallet",
                  text,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text).catch(() => {});
              }
            }}
            style={secondaryButtonStyle(theme)}
          >
            {t.share}
          </button>
        </div>
      </section>

      <section style={panel(theme)}>
        <div style={titleStyle(theme)}>{t.receiveTips}</div>

        <div style={{ display: "grid", gap: 10 }}>
          <Tip theme={theme} text={t.tip1} />
          <Tip theme={theme} text={t.tip2} />
          <Tip theme={theme} text={t.tip3} />
        </div>
      </section>
    </div>
  );
}

function Tip({ theme, text }: { theme: "dark" | "light"; text: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        border: `1px solid ${theme === "light" ? "#e2e8f0" : "#1f2937"}`,
        background: theme === "light" ? "#f8fafc" : "#101827",
        color: theme === "light" ? "#334155" : "#cbd5e1",
        fontSize: 13,
        lineHeight: 1.55,
        fontWeight: 700,
      }}
    >
      {text}
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

function secondaryButtonStyle(theme: "dark" | "light"): React.CSSProperties {
  return {
    width: "100%",
    padding: "15px 16px",
    borderRadius: 16,
    border: `1px solid ${theme === "light" ? "#dbe2f0" : "#253047"}`,
    background: theme === "light" ? "#ffffff" : "#101827",
    color: theme === "light" ? "#0f172a" : "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 15,
  };
}

function getText(lang: string) {
  const map: Record<string, Record<string, string>> = {
    en: {
      receiveInri: "Receive INRI",
      scanOrCopy: "Scan this QR code or copy your address to receive INRI and supported assets on the INRI network.",
      yourAddress: "Your address",
      noAddressLoaded: "No address loaded",
      copied: "Copied",
      copyAddress: "Copy address",
      share: "Share",
      receiveTips: "Receive tips",
      tip1: "Only send assets supported by the INRI network to this address.",
      tip2: "Always double-check the network before transferring funds.",
      tip3: "For security, test with a small amount before sending a large transfer.",
      myInriAddress: "My INRI Wallet address:",
    },
    pt: {
      receiveInri: "Receber INRI",
      scanOrCopy: "Escaneie este QR code ou copie seu endereço para receber INRI e ativos compatíveis na rede INRI.",
      yourAddress: "Seu endereço",
      noAddressLoaded: "Nenhum endereço carregado",
      copied: "Copiado",
      copyAddress: "Copiar endereço",
      share: "Compartilhar",
      receiveTips: "Dicas de recebimento",
      tip1: "Envie apenas ativos compatíveis com a rede INRI para este endereço.",
      tip2: "Sempre confira a rede antes de transferir fundos.",
      tip3: "Por segurança, teste com um valor pequeno antes de enviar uma quantia maior.",
      myInriAddress: "Meu endereço da INRI Wallet:",
    },
    es: {
      receiveInri: "Recibir INRI",
      scanOrCopy: "Escanea este código QR o copia tu dirección para recibir INRI y activos compatibles en la red INRI.",
      yourAddress: "Tu dirección",
      noAddressLoaded: "No hay dirección cargada",
      copied: "Copiado",
      copyAddress: "Copiar dirección",
      share: "Compartir",
      receiveTips: "Consejos de recepción",
      tip1: "Envía solo activos compatibles con la red INRI a esta dirección.",
      tip2: "Verifica siempre la red antes de transferir fondos.",
      tip3: "Por seguridad, prueba primero con una cantidad pequeña.",
      myInriAddress: "Mi dirección de INRI Wallet:",
    },
    fr: {
      receiveInri: "Recevoir INRI",
      scanOrCopy: "Scannez ce QR code ou copiez votre adresse pour recevoir INRI et les actifs compatibles sur le réseau INRI.",
      yourAddress: "Votre adresse",
      noAddressLoaded: "Aucune adresse chargée",
      copied: "Copié",
      copyAddress: "Copier l'adresse",
      share: "Partager",
      receiveTips: "Conseils de réception",
      tip1: "Envoyez uniquement des actifs compatibles avec le réseau INRI à cette adresse.",
      tip2: "Vérifiez toujours le réseau avant un transfert.",
      tip3: "Pour plus de sécurité, testez d'abord avec un petit montant.",
      myInriAddress: "Mon adresse INRI Wallet :",
    },
    de: {
      receiveInri: "INRI empfangen",
      scanOrCopy: "Scanne diesen QR-Code oder kopiere deine Adresse, um INRI und unterstützte Assets im INRI-Netzwerk zu empfangen.",
      yourAddress: "Deine Adresse",
      noAddressLoaded: "Keine Adresse geladen",
      copied: "Kopiert",
      copyAddress: "Adresse kopieren",
      share: "Teilen",
      receiveTips: "Empfangstipps",
      tip1: "Sende nur Assets an diese Adresse, die vom INRI-Netzwerk unterstützt werden.",
      tip2: "Prüfe vor jeder Übertragung immer das Netzwerk.",
      tip3: "Teste aus Sicherheitsgründen zuerst mit einem kleinen Betrag.",
      myInriAddress: "Meine INRI Wallet-Adresse:",
    },
    ja: {
      receiveInri: "INRIを受け取る",
      scanOrCopy: "このQRコードをスキャンするか、アドレスをコピーしてINRIネットワーク上でINRIと対応資産を受け取ってください。",
      yourAddress: "あなたのアドレス",
      noAddressLoaded: "アドレスが読み込まれていません",
      copied: "コピー済み",
      copyAddress: "アドレスをコピー",
      share: "共有",
      receiveTips: "受取のヒント",
      tip1: "このアドレスにはINRIネットワーク対応資産のみ送信してください。",
      tip2: "送金前に必ずネットワークを確認してください。",
      tip3: "安全のため、最初は少額でテストしてください。",
      myInriAddress: "私のINRI Walletアドレス:",
    },
    zh: {
      receiveInri: "接收 INRI",
      scanOrCopy: "扫描此二维码或复制你的地址，以在 INRI 网络上接收 INRI 和受支持的资产。",
      yourAddress: "你的地址",
      noAddressLoaded: "未加载地址",
      copied: "已复制",
      copyAddress: "复制地址",
      share: "分享",
      receiveTips: "接收提示",
      tip1: "只向此地址发送 INRI 网络支持的资产。",
      tip2: "转账前请务必确认网络。",
      tip3: "为了安全起见，先用小额测试。",
      myInriAddress: "我的 INRI Wallet 地址：",
    },
  };

  return map[lang] || map.en;
}
