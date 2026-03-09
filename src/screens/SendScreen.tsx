import React, { useState } from "react";
import { ethers } from "ethers";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { getActiveNetwork } from "../lib/networks";

export default function SendScreen({ wallet }: any) {

  const network = getActiveNetwork();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  async function scanQR() {

    const codeReader = new BrowserMultiFormatReader();

    const result = await codeReader.decodeOnceFromVideoDevice(
      undefined,
      "video"
    );

    setTo(result.getText());
  }

  async function send() {

    const provider = new ethers.JsonRpcProvider(network.rpcUrls[0]);

    const signer = wallet.connect(provider);

    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });

    alert("TX sent: " + tx.hash);
  }

  return (
    <div className="p-4 text-white">

      <h2 className="text-xl font-bold mb-4">
        Send
      </h2>

      <input
        className="w-full p-3 bg-[#0b0f1c] rounded-xl mb-2"
        placeholder="Address"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />

      <input
        className="w-full p-3 bg-[#0b0f1c] rounded-xl mb-2"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button
        onClick={scanQR}
        className="bg-blue-500 px-4 py-2 rounded-xl mr-2"
      >
        Scan QR
      </button>

      <button
        onClick={send}
        className="bg-green-500 px-4 py-2 rounded-xl"
      >
        Send
      </button>

    </div>
  );
}
