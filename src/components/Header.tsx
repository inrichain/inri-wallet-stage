import React from "react";
import { shortAddress } from "../lib/inri";
import { getActiveNetwork } from "../lib/networks";

export default function Header({ address }: { address: string }) {
  const network = getActiveNetwork();

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center gap-3 bg-[#0b0f1c] rounded-2xl p-4 border border-[#1e263f]">
        
        <img
          src={network.icon}
          className="w-12 h-12 rounded-xl"
        />

        <div className="flex-1">
          <div className="text-white text-lg font-bold">
            Wallet 1
          </div>

          <div className="text-gray-400 text-sm">
            {network.name} • Mainnet ready
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {shortAddress(address)}
        </div>
      </div>
    </div>
  );
}
