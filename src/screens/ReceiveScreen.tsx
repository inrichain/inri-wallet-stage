import React from "react";
import QRCode from "react-qr-code";
import { getReceiveUri } from "../lib/inri";
import { getActiveNetwork } from "../lib/networks";

export default function ReceiveScreen({ address }: any) {

  const network = getActiveNetwork();
  const uri = getReceiveUri(network.id, address);

  return (
    <div className="p-4 text-white">

      <h2 className="text-xl font-bold mb-4">
        Receive
      </h2>

      <div className="bg-[#0b0f1c] p-4 rounded-xl">

        <QRCode
          value={uri}
          size={180}
        />

        <div className="mt-4 text-sm text-gray-400">
          Network: {network.name}
        </div>

        <div className="mt-2 text-xs break-all">
          {address}
        </div>

      </div>

    </div>
  );
}
