import { ethers } from "ethers";

export type TxRiskLevel = "low" | "medium" | "high";

export type TxAnalysis = {
  action: string;
  selector: string;
  functionName: string;
  spender?: string;
  tokenRecipient?: string;
  amountLabel?: string;
  isUnlimitedApproval?: boolean;
  riskLevel: TxRiskLevel;
  warnings: string[];
  fields: Array<{ label: string; value: string }>;
};

function shorten(value?: string, left = 8, right = 6) {
  if (!value) return "-";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function fmtUnits(value: bigint, decimals = 18) {
  try {
    const out = ethers.formatUnits(value, decimals);
    const [a, b = ""] = out.split(".");
    const c = b.slice(0, 6).replace(/0+$/, "");
    return c ? `${a}.${c}` : a;
  } catch {
    return value.toString();
  }
}

function readUint256(data: string, index: number): bigint | null {
  const start = 10 + index * 64;
  const slice = data.slice(start, start + 64);
  if (slice.length !== 64) return null;
  try {
    return BigInt(`0x${slice}`);
  } catch {
    return null;
  }
}

function readAddress(data: string, index: number): string | null {
  const start = 10 + index * 64;
  const slice = data.slice(start, start + 64);
  if (slice.length !== 64) return null;
  try {
    return ethers.getAddress(`0x${slice.slice(24)}`);
  } catch {
    return null;
  }
}

function readBool(data: string, index: number): boolean | null {
  const value = readUint256(data, index);
  if (value === null) return null;
  return value !== 0n;
}

export function analyzeTransactionCalldata(data?: string | null): TxAnalysis | null {
  if (!data || data === "0x" || data.length < 10) return null;
  const normalized = String(data);
  const selector = normalized.slice(0, 10).toLowerCase();

  if (selector === "0x095ea7b3") {
    const spender = readAddress(normalized, 0) || undefined;
    const amount = readUint256(normalized, 1) ?? 0n;
    const unlimited = amount >= (2n ** 255n);
    return {
      action: "Token approval",
      selector,
      functionName: "approve(address,uint256)",
      spender,
      amountLabel: unlimited ? "Unlimited" : fmtUnits(amount),
      isUnlimitedApproval: unlimited,
      riskLevel: unlimited ? "high" : "medium",
      warnings: [
        "This can allow another address to spend your tokens.",
        unlimited ? "Unlimited approvals are high risk." : "Verify the spender before approving.",
      ],
      fields: [
        { label: "Spender", value: spender ? shorten(spender) : "-" },
        { label: "Allowance", value: unlimited ? "Unlimited" : fmtUnits(amount) },
      ],
    };
  }

  if (selector === "0xa22cb465") {
    const operator = readAddress(normalized, 0) || undefined;
    const approved = readBool(normalized, 1);
    return {
      action: "NFT collection approval",
      selector,
      functionName: "setApprovalForAll(address,bool)",
      spender: operator,
      riskLevel: approved ? "high" : "medium",
      warnings: [
        "This can grant control over all NFTs in this collection.",
        "Only approve trusted marketplaces or contracts.",
      ],
      fields: [
        { label: "Operator", value: operator ? shorten(operator) : "-" },
        { label: "Approval", value: approved ? "Enabled" : "Disabled" },
      ],
    };
  }

  if (selector === "0xd505accf") {
    const owner = readAddress(normalized, 0);
    const spender = readAddress(normalized, 1) || undefined;
    const value = readUint256(normalized, 2) ?? 0n;
    const unlimited = value >= (2n ** 255n);
    return {
      action: "Permit signature",
      selector,
      functionName: "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
      spender,
      amountLabel: unlimited ? "Unlimited" : fmtUnits(value),
      isUnlimitedApproval: unlimited,
      riskLevel: unlimited ? "high" : "high",
      warnings: [
        "Permit signatures can approve token spending without an on-chain approve transaction.",
        "Treat this like a token approval request.",
      ],
      fields: [
        { label: "Owner", value: owner ? shorten(owner) : "-" },
        { label: "Spender", value: spender ? shorten(spender) : "-" },
        { label: "Allowance", value: unlimited ? "Unlimited" : fmtUnits(value) },
      ],
    };
  }

  if (selector === "0xa9059cbb") {
    const to = readAddress(normalized, 0) || undefined;
    const amount = readUint256(normalized, 1) ?? 0n;
    return {
      action: "Token transfer",
      selector,
      functionName: "transfer(address,uint256)",
      tokenRecipient: to,
      amountLabel: fmtUnits(amount),
      riskLevel: "medium",
      warnings: ["This transfers tokens from your wallet."],
      fields: [
        { label: "Recipient", value: to ? shorten(to) : "-" },
        { label: "Amount", value: fmtUnits(amount) },
      ],
    };
  }

  if (selector === "0x23b872dd") {
    const from = readAddress(normalized, 0);
    const to = readAddress(normalized, 1) || undefined;
    const amount = readUint256(normalized, 2) ?? 0n;
    return {
      action: "Delegated token transfer",
      selector,
      functionName: "transferFrom(address,address,uint256)",
      tokenRecipient: to,
      amountLabel: fmtUnits(amount),
      riskLevel: "high",
      warnings: [
        "This can move tokens using an approval you already granted.",
        "Verify both sender and recipient carefully.",
      ],
      fields: [
        { label: "From", value: from ? shorten(from) : "-" },
        { label: "To", value: to ? shorten(to) : "-" },
        { label: "Amount", value: fmtUnits(amount) },
      ],
    };
  }

  return {
    action: "Contract interaction",
    selector,
    functionName: selector,
    riskLevel: "medium",
    warnings: ["This calls a smart contract. Only continue if you trust the dApp and the contract."],
    fields: [{ label: "Function selector", value: selector }],
  };
}
