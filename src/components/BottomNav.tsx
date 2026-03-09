import React from "react";

export default function BottomNav({ tab, setTab }: any) {
  const items = [
    ["dashboard", "Home"],
    ["tokens", "Tokens"],
    ["send", "Send"],
    ["receive", "Receive"],
    ["activity", "Activity"],
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0b0f1c] border-t border-[#1e263f] flex justify-around py-3">

      {items.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`text-sm ${
            tab === id ? "text-blue-400" : "text-gray-500"
          }`}
        >
          {label}
        </button>
      ))}

    </div>
  );
}
