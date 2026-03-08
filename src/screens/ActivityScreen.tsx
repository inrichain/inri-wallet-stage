import React, { useMemo, useState } from "react";
import { shortAddress } from "../lib/inri";

const ACTIVITY_KEY = "wallet_activity_demo";
const EXPLORER_TX = "https://scan.inri.life/tx/";

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
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");

  const items = useMemo(() => {
    const raw = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]") as any[];
    const sorted = raw
      .filter(
        (item) =>
          item?.from?.toLowerCase() === address.toLowerCase() ||
          item?.to?.toLowerCase() === address.toLowerCase()
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sorted.filter((item) => {
      const outgoing = item?.from?.toLowerCase() === address.toLowerCase();
      if (filter === "sent") return outgoing;
      if (filter === "received") return !outgoing;
      return true;
    });
  }, [address, filter]);

  return (
    <div className="inri-fade-up" style={{ display: "grid", gap: 16 }}>
      <section className="inri-card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: isLight ? "#0f172a" : "#ffffff" }}>{t.activity}</h2>
            <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 13 }}>
              {t.subtitle}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([
              ["all", t.all],
              ["sent", t.sent],
              ["received", t.received],
            ] as const).map(([id, label]) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  style={{
                    border: `1px solid ${active ? "transparent" : isLight ? "rgba(155,170,200,.24)" : "rgba(134,153,192,.14)"}`,
                    background: active
                      ? isLight
                        ? "linear-gradient(180deg,#4f7cff 0%,#3f73ff 100%)"
                        : "linear-gradient(180deg,rgba(79,124,255,.95) 0%, rgba(122,92,255,.92) 100%)"
                      : isLight
                      ? "#ffffff"
                      : "rgba(255,255,255,.03)",
                    color: active ? "#ffffff" : isLight ? "#475569" : "#c7d2e5",
                    borderRadius: 14,
                    padding: "10px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="inri-card" style={{ padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 42 }}>⏳</div>
          <div
            style={{
              marginTop: 10,
              fontWeight: 900,
              fontSize: 20,
              color: isLight ? "#0f172a" : "#ffffff",
            }}
          >
            {t.empty}
          </div>
          <div style={{ marginTop: 6, color: isLight ? "#64748b" : "#95a2bd", fontSize: 14 }}>
            {t.emptySub}
          </div>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {items.map((item, index) => {
            const isOutgoing = item?.from?.toLowerCase() === address.toLowerCase();
            const status = String(item.status || t.confirmed);
            const createdAt = item.createdAt ? new Date(item.createdAt) : null;

            return (
              <article
                key={item.hash || `${item.createdAt}_${index}`}
                className="inri-card"
                style={{ padding: 16 }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        fontWeight: 900,
                        color: isOutgoing ? "#ff9b5a" : "#16c784",
                        background: isOutgoing
                          ? isLight
                            ? "rgba(255,181,71,.14)"
                            : "rgba(255,181,71,.10)"
                          : isLight
                          ? "rgba(22,199,132,.12)"
                          : "rgba(22,199,132,.10)",
                      }}
                    >
                      {isOutgoing ? "↗" : "↙"}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          color: isLight ? "#0f172a" : "#ffffff",
                          fontSize: 17,
                        }}
                      >
                        {isOutgoing ? t.sent : t.received}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: isLight ? "#64748b" : "#95a2bd",
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {isOutgoing ? `${t.to}: ${shortAddress(item.to || "")}` : `${t.from}: ${shortAddress(item.from || "")}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 900,
                        color: isLight ? "#0f172a" : "#ffffff",
                        fontSize: 18,
                      }}
                    >
                      {item.amount || "0"} {item.symbol || "INRI"}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: isLight ? "#eef4ff" : "rgba(79,124,255,.12)",
                        color: "#4f7cff",
                        fontSize: 12,
                        fontWeight: 800,
                        textTransform: "capitalize",
                      }}
                    >
                      {status}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <InfoCell theme={theme} label={t.hash} value={item.hash || "-"} mono />
                  <InfoCell
                    theme={theme}
                    label={t.time}
                    value={createdAt ? createdAt.toLocaleString() : "-"}
                  />
                  <InfoCell
                    theme={theme}
                    label={t.type}
                    value={item.type || (item.symbol === "INRI" ? "native" : "token")}
                  />
                </div>

                {item.hash ? (
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={`${EXPLORER_TX}${item.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#4f7cff",
                        fontWeight: 800,
                        textDecoration: "none",
                      }}
                    >
                      {t.viewExplorer}
                    </a>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function InfoCell({
  theme,
  label,
  value,
  mono = false,
}: {
  theme: "dark" | "light";
  label: string;
  value: string;
  mono?: boolean;
}) {
  const isLight = theme === "light";

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        background: isLight ? "#f8fbff" : "rgba(255,255,255,.03)",
        border: `1px solid ${isLight ? "rgba(155,170,200,.16)" : "rgba(134,153,192,.10)"}`,
      }}
    >
      <div style={{ color: isLight ? "#64748b" : "#95a2bd", fontSize: 12 }}>{label}</div>
      <div
        style={{
          marginTop: 6,
          color: isLight ? "#0f172a" : "#ffffff",
          fontWeight: 800,
          fontSize: 13,
          wordBreak: "break-all",
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getText(lang: string) {
  const map: Record<string, any> = {
    en: {
      activity: "Activity",
      subtitle: "Wallet history with a cleaner explorer-style layout.",
      all: "All",
      sent: "Sent",
      received: "Received",
      empty: "No activity yet",
      emptySub: "Your confirmed sends and receives will appear here.",
      to: "To",
      from: "From",
      confirmed: "confirmed",
      hash: "Transaction hash",
      time: "Time",
      type: "Type",
      viewExplorer: "Open in explorer",
    },
    pt: {
      activity: "Atividade",
      subtitle: "Histórico da wallet com layout melhor no estilo explorer.",
      all: "Tudo",
      sent: "Enviado",
      received: "Recebido",
      empty: "Ainda não há atividade",
      emptySub: "Seus envios e recebimentos confirmados vão aparecer aqui.",
      to: "Para",
      from: "De",
      confirmed: "confirmado",
      hash: "Hash da transação",
      time: "Data e hora",
      type: "Tipo",
      viewExplorer: "Abrir no explorer",
    },
  };

  return map[lang] || map.en;
}
