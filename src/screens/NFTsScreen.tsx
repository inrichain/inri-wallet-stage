import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { provider } from "../lib/inri";

export default function NFTsScreen({ address }: any) {
  const [nfts, setNfts] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `https://scan.inri.life/api?module=account&action=tokennfttx&address=${address}`
        );

        const data = await res.json();

        if (data.result) {
          setNfts(data.result);
        }
      } catch {}
    }

    load();
  }, [address]);

  if (nfts.length === 0) {
    return <div>No NFTs found</div>;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2,1fr)",
        gap: 14,
      }}
    >
      {nfts.map((nft, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #333",
            borderRadius: 16,
            padding: 10,
          }}
        >
          <div>{nft.tokenName}</div>
          <div>ID: {nft.tokenID}</div>
        </div>
      ))}
    </div>
  );
}
