import React, { useEffect, useMemo, useState } from "react";
import { fallbackAsset, type AssetKind } from "../lib/assets";

type Props = {
  src?: string;
  alt: string;
  kind?: AssetKind;
  label?: string;
  symbol?: string;
  color?: string;
  size?: number;
  rounded?: boolean;
  style?: React.CSSProperties;
};

export default function LogoImage({
  src,
  alt,
  kind = "network",
  label,
  symbol,
  color,
  size = 24,
  rounded = true,
  style,
}: Props) {
  const fallback = useMemo(() => fallbackAsset(kind, { label: label || alt, symbol, color }), [kind, label, alt, symbol, color]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const resolved = !failed && src ? src : fallback;

  return (
    <img
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        borderRadius: rounded ? Math.round(size / 2) : Math.max(8, Math.round(size * 0.22)),
        objectFit: "cover",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
