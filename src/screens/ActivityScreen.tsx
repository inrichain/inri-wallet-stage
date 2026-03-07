import React, { useMemo } from "react";

const ACTIVITY_KEY = "wallet_activity_demo";

export default function ActivityScreen({
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

  const items = useMemo(() => {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    return raw.filter(
      (item: any) =>
        item.from?.toLowerCase() === address.toLowerCase() ||
        item.to?.toLowerCase() === address.toLowerCase()
    );
  }, [address]);

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
        {t.activity}
      </h2>

      {items.length === 0 ? (
        <div style={{ color: isLight ? "#5b6578" : "#97a0b3" }}>{t.empty}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item: any, index: number) => {
            const isOutgoing = item.from?.toLowerCase() === address.toLowerCase();

            return (
              <div
                key={item.hash || index}
                style={{
                  border: `1px solid ${isLight ? "#dbe2f0" : "#252b39"}`,
                  borderRadius: 16,
                  background: isLight ? "#f8faff" : "#0d111b",
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: isLight ? "#10131a" : "#ffffff",
                    }}
                  >
                    {isOutgoing ? t.sent : t.received}
                  </div>

                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: isLight ? "#edf3ff" : "#18233e",
                      color: "#3f7cff",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {item.status || t.confirmed}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontWeight: 900,
                    color: isLight ? "#10131a" : "#ffffff",
                    fontSize: 18,
                  }}
                >
                  {item.amount} {item.symbol}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: isLight ? "#5b6578" : "#97a0b3",
                    fontSize: 13,
                    wordBreak: "break-all",
                  }}
                >
                  {isOutgoing ? `${t.to}: ${item.to}` : `${t.from}: ${item.from}`}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: isLight ? "#5b6578" : "#97a0b3",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {item.hash}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color: "#3f7cff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      activity: "Activity",
      empty: "No activity yet.",
      sent: "Sent",
      received: "Received",
      to: "To",
      from: "From",
      confirmed: "confirmed",
    },
    pt: {
      activity: "Atividade",
      empty: "Ainda não há atividade.",
      sent: "Enviado",
      received: "Recebido",
      to: "Para",
      from: "De",
      confirmed: "confirmado",
    },
    es: {
      activity: "Actividad",
      empty: "Aún no hay actividad.",
      sent: "Enviado",
      received: "Recibido",
      to: "Para",
      from: "De",
      confirmed: "confirmado",
    },
  };

  return map[lang] || map.en;
}
