import React, { useRef, useState } from "react";
import QRCode from "react-qr-code";

const INRI_LOGO = "/brand-inri.png";

export default function ReceiveScreen({
  theme = "dark",
  lang = "en",
  address,
}: {
  theme?: "dark" | "light";
  lang?: string;
  address: string;
}) {
  const isLight = theme === "light";
  const t = getText(lang);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [scanResult, setScanResult] = useState("");
  const [scanning, setScanning] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      alert(t.copied);
    } catch {
      alert(t.copyFail);
    }
  }

  async function openCameraQr() {
    try {
      if (
        "BarcodeDetector" in window &&
        typeof (window as any).BarcodeDetector === "function"
      ) {
        fileRef.current?.click();
        return;
      }

      alert(t.cameraNotSupported);
    } catch {
      alert(t.cameraFail);
    }
  }

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setScanning(true);

      const imageBitmap = await createImageBitmap(file);
      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      const codes = await detector.detect(imageBitmap);

      if (codes?.length) {
        setScanResult(String(codes[0].rawValue || ""));
      } else {
        alert(t.noQrFound);
      }
    } catch {
      alert(t.cameraFail);
    } finally {
      setScanning(false);
      event.target.value = "";
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
        borderRadius: 20,
        background: isLight ? "#ffffff" : "#121621",
        padding: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img
          src={INRI_LOGO}
          alt="INRI"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
        <div>
          <h2 style={{ margin: 0, color: isLight ? "#10131a" : "#ffffff" }}>{t.receive}</h2>
          <div style={{ color: isLight ? "#5b6578" : "#97a0b3", fontSize: 13 }}>
            {t.receiveHint}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          placeItems: "center",
          margin: "24px 0",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: 16,
            borderRadius: 20,
            maxWidth: "100%",
          }}
        >
          <QRCode value={address || "0x"} size={190} />
        </div>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 14,
          border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
          background: isLight ? "#f8fafc" : "#0f1522",
          color: isLight ? "#334155" : "#cdd6ea",
          wordBreak: "break-all",
          overflowWrap: "anywhere",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {address}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 14,
        }}
      >
        <button
          onClick={copyAddress}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: "none",
            background: "#3f7cff",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {t.copyAddress}
        </button>

        <button
          onClick={openCameraQr}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
            background: isLight ? "#ffffff" : "#12192a",
            color: isLight ? "#10131a" : "#ffffff",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {scanning ? t.scanning : t.scanQr}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPickImage}
        style={{ display: "none" }}
      />

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            marginBottom: 8,
            color: isLight ? "#5b6578" : "#97a0b3",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {t.lastScan}
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
            background: isLight ? "#f8fafc" : "#0f1522",
            color: isLight ? "#334155" : "#cdd6ea",
            minHeight: 52,
            wordBreak: "break-all",
            overflowWrap: "anywhere",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {scanResult || t.noScanYet}
        </div>
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      receive: "Receive",
      receiveHint: "Wallet address and QR code",
      copyAddress: "Copy Address",
      scanQr: "Scan QR",
      scanning: "Scanning...",
      lastScan: "Last scanned QR",
      noScanYet: "No QR scanned yet.",
      copied: "Address copied.",
      copyFail: "Could not copy address.",
      cameraFail: "Could not read the QR code.",
      cameraNotSupported: "This browser does not support QR reading from image yet.",
      noQrFound: "No QR code was found in the image.",
    },
    pt: {
      receive: "Receber",
      receiveHint: "Endereço da carteira e código QR",
      copyAddress: "Copiar Endereço",
      scanQr: "Ler QR",
      scanning: "Lendo...",
      lastScan: "Último QR lido",
      noScanYet: "Nenhum QR lido ainda.",
      copied: "Endereço copiado.",
      copyFail: "Não foi possível copiar o endereço.",
      cameraFail: "Não foi possível ler o QR code.",
      cameraNotSupported: "Este navegador ainda não suporta leitura de QR por imagem.",
      noQrFound: "Nenhum QR code foi encontrado na imagem.",
    },
    es: {
      receive: "Recibir",
      receiveHint: "Dirección de la billetera y código QR",
      copyAddress: "Copiar Dirección",
      scanQr: "Escanear QR",
      scanning: "Escaneando...",
      lastScan: "Último QR escaneado",
      noScanYet: "Todavía no se ha escaneado ningún QR.",
      copied: "Dirección copiada.",
      copyFail: "No se pudo copiar la dirección.",
      cameraFail: "No se pudo leer el código QR.",
      cameraNotSupported: "Este navegador aún no admite lectura QR por imagen.",
      noQrFound: "No se encontró ningún código QR en la imagen.",
    },
    fr: {
      receive: "Recevoir",
      receiveHint: "Adresse du portefeuille et code QR",
      copyAddress: "Copier l’adresse",
      scanQr: "Scanner QR",
      scanning: "Scan en cours...",
      lastScan: "Dernier QR scanné",
      noScanYet: "Aucun QR scanné pour le moment.",
      copied: "Adresse copiée.",
      copyFail: "Impossible de copier l’adresse.",
      cameraFail: "Impossible de lire le code QR.",
      cameraNotSupported: "Ce navigateur ne prend pas encore en charge la lecture QR par image.",
      noQrFound: "Aucun code QR trouvé dans l’image.",
    },
    de: {
      receive: "Empfangen",
      receiveHint: "Wallet-Adresse und QR-Code",
      copyAddress: "Adresse kopieren",
      scanQr: "QR scannen",
      scanning: "Wird gescannt...",
      lastScan: "Zuletzt gescannter QR",
      noScanYet: "Noch kein QR gescannt.",
      copied: "Adresse kopiert.",
      copyFail: "Adresse konnte nicht kopiert werden.",
      cameraFail: "QR-Code konnte nicht gelesen werden.",
      cameraNotSupported: "Dieser Browser unterstützt das Lesen von QR aus Bildern noch nicht.",
      noQrFound: "Kein QR-Code im Bild gefunden.",
    },
    it: {
      receive: "Ricevi",
      receiveHint: "Indirizzo wallet e codice QR",
      copyAddress: "Copia indirizzo",
      scanQr: "Scansiona QR",
      scanning: "Scansione...",
      lastScan: "Ultimo QR scansionato",
      noScanYet: "Nessun QR ancora scansionato.",
      copied: "Indirizzo copiato.",
      copyFail: "Impossibile copiare l’indirizzo.",
      cameraFail: "Impossibile leggere il codice QR.",
      cameraNotSupported: "Questo browser non supporta ancora la lettura QR da immagine.",
      noQrFound: "Nessun codice QR trovato nell’immagine.",
    },
    ru: {
      receive: "Получить",
      receiveHint: "Адрес кошелька и QR-код",
      copyAddress: "Скопировать адрес",
      scanQr: "Сканировать QR",
      scanning: "Сканирование...",
      lastScan: "Последний QR",
      noScanYet: "QR ещё не сканировался.",
      copied: "Адрес скопирован.",
      copyFail: "Не удалось скопировать адрес.",
      cameraFail: "Не удалось прочитать QR-код.",
      cameraNotSupported: "Этот браузер пока не поддерживает чтение QR из изображения.",
      noQrFound: "QR-код на изображении не найден.",
    },
    zh: {
      receive: "接收",
      receiveHint: "钱包地址和二维码",
      copyAddress: "复制地址",
      scanQr: "扫描二维码",
      scanning: "扫描中...",
      lastScan: "最近扫描结果",
      noScanYet: "还没有扫描二维码。",
      copied: "地址已复制。",
      copyFail: "无法复制地址。",
      cameraFail: "无法读取二维码。",
      cameraNotSupported: "此浏览器暂不支持从图片读取二维码。",
      noQrFound: "图片中未找到二维码。",
    },
    ja: {
      receive: "受取",
      receiveHint: "ウォレットアドレスとQRコード",
      copyAddress: "アドレスをコピー",
      scanQr: "QRを読む",
      scanning: "読み取り中...",
      lastScan: "最後に読んだQR",
      noScanYet: "まだQRは読み取られていません。",
      copied: "アドレスをコピーしました。",
      copyFail: "アドレスをコピーできませんでした。",
      cameraFail: "QRコードを読み取れませんでした。",
      cameraNotSupported: "このブラウザは画像からのQR読取にまだ対応していません。",
      noQrFound: "画像内にQRコードが見つかりませんでした。",
    },
    ko: {
      receive: "수신",
      receiveHint: "지갑 주소와 QR 코드",
      copyAddress: "주소 복사",
      scanQr: "QR 스캔",
      scanning: "스캔 중...",
      lastScan: "마지막 스캔 QR",
      noScanYet: "아직 스캔된 QR이 없습니다.",
      copied: "주소가 복사되었습니다.",
      copyFail: "주소를 복사할 수 없습니다.",
      cameraFail: "QR 코드를 읽을 수 없습니다.",
      cameraNotSupported: "이 브라우저는 아직 이미지 QR 읽기를 지원하지 않습니다.",
      noQrFound: "이미지에서 QR 코드를 찾지 못했습니다.",
    },
    tr: {
      receive: "Al",
      receiveHint: "Cüzdan adresi ve QR kodu",
      copyAddress: "Adresi Kopyala",
      scanQr: "QR Tara",
      scanning: "Taranıyor...",
      lastScan: "Son taranan QR",
      noScanYet: "Henüz QR taranmadı.",
      copied: "Adres kopyalandı.",
      copyFail: "Adres kopyalanamadı.",
      cameraFail: "QR kodu okunamadı.",
      cameraNotSupported: "Bu tarayıcı henüz görüntüden QR okumayı desteklemiyor.",
      noQrFound: "Görüntüde QR kodu bulunamadı.",
    },
  };

  return map[lang] || map.en;
}
