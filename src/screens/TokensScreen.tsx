import React, { useEffect, useState } from "react";
import { getKnownTokens, loadAllBalances } from "../lib/inri";
import { getActiveNetwork } from "../lib/networks";

export default function TokensScreen({ address }: any) {

  const network = getActiveNetwork();

  const [tokens, setTokens] = useState<any[]>([]);
  const [balances, setBalances] = useState<any>({});

  useEffect(() => {

    const t = getKnownTokens(network.id);
    setTokens(t);

    loadAllBalances(network.id, address, t).then(setBalances);

  }, [address, network.id]);

  return (
    <div className="p-4 text-white">

      <h2 className="text-xl font-bold mb-4">
        Tokens
      </h2>

      {tokens.map((t) => (
        <div
          key={t.symbol}
          className="flex items-center gap-3 bg-[#0b0f1c] p-3 rounded-xl mb-2"
        >

          <img
            src={t.logo}
            className="w-8 h-8"
          />

          <div className="flex-1">
            <div className="text-white">
              {t.symbol}
            </div>

            <div className="text-gray-400 text-xs">
              {t.name}
            </div>
          </div>

          <div>
            {balances[t.symbol] || "0.000000"}
          </div>

        </div>
      ))}

    </div>
  );
}
