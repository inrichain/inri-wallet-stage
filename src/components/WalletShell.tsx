import React, { useState } from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import DashboardScreen from "../screens/DashboardScreen";
import SendScreen from "../screens/SendScreen";
import ReceiveScreen from "../screens/ReceiveScreen";
import TokensScreen from "../screens/TokensScreen";
import ActivityScreen from "../screens/ActivityScreen";
import SwapScreen from "../screens/SwapScreen";
import BridgeScreen from "../screens/BridgeScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "tokens"
  | "activity"
  | "swap"
  | "bridge"
  | "settings";

export default function WalletShell() {
  const [tab, setTab] = useState<Tab>("dashboard");

  const renderTab = () => {
    switch (tab) {
      case "dashboard": return <DashboardScreen setTab={setTab} />;
      case "send": return <SendScreen />;
      case "receive": return <ReceiveScreen />;
      case "tokens": return <TokensScreen />;
      case "activity": return <ActivityScreen />;
      case "swap": return <SwapScreen />;
      case "bridge": return <BridgeScreen />;
      case "settings": return <SettingsScreen />;
      default: return <DashboardScreen setTab={setTab} />;
    }
  };

  return (
    <div style={{minHeight:"100vh", paddingBottom:88}}>
      <Header />
      <main style={{padding:"16px", maxWidth:900, margin:"0 auto"}}>
        {renderTab()}
      </main>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
