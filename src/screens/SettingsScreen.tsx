import React, { useRef, useState } from "react";
import { NETWORKS } from "../lib/networks";

const BASE = "/inri-wallet-stage/";
const DEFAULT_AVATAR = BASE + "avatar.png";

export default function SettingsScreen({
  theme,
  setTheme,
  lang,
  setLang,
  activeNetworkId,
  setActiveNetworkId,
}: {
  theme: "dark" | "light";
  setTheme: (value: "dark" | "light") => void;
  lang: string;
  setLang: (value: string) => void;
  activeNetworkId: string;
  setActiveNetworkId: (value: string) => void;
}) {
  const isLight = theme === "light";
  const [avatar, setAvatar] = useState(localStorage.getItem("wallet_avatar") || DEFAULT_AVATAR);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = getText(lang);

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;
      localStorage.setItem("wallet_avatar", result);
      setAvatar(result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={cardStyle(isLight)}>
        <h2 style={titleStyle(isLight)}>{t.settings}</h2>
        <div style={subtitleStyle(isLight)}>{t.subtitle}</div>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.network}</div>
        <select value={activeNetworkId} onChange={(e) => setActiveNetworkId(e.target.value)} style={selectStyle(isLight)}>
          {NETWORKS.map((item) => (
            <option key={item.id} value={item.id}>{item.name} • {item.chainId}</option>
          ))}
        </select>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.language}</div>
        <select value={lang} onChange={(e) => setLang(e.target.value)} style={selectStyle(isLight)}>
          <option value="en">English</option><option value="pt">Português</option><option value="es">Español</option>
          <option value="fr">Français</option><option value="de">Deutsch</option><option value="it">Italiano</option>
          <option value="ru">Русский</option><option value="zh">中文</option><option value="ja">日本語</option>
          <option value="ko">한국어</option><option value="tr">Türkçe</option>
        </select>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.theme}</div>
        <select value={theme} onChange={(e) => setTheme(e.target.value as any)} style={selectStyle(isLight)}>
          <option value="dark">{t.dark}</option><option value="light">{t.light}</option>
        </select>
      </section>

      <section style={cardStyle(isLight)}>
        <div style={labelStyle(isLight)}>{t.avatar}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <img src={avatar} alt="Avatar" onError={(e)=>{(e.currentTarget as HTMLImageElement).src=DEFAULT_AVATAR;}}
            style={{ width:72,height:72,borderRadius:"50%",objectFit:"cover",border:`2px solid ${isLight?"#dbe2f0":"#2b3650"}`,background:isLight?"#f8fafc":"#0f172a" }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} style={primaryButtonStyle()}>{t.changeAvatar}</button>
            <button onClick={() => {localStorage.removeItem("wallet_avatar"); setAvatar(DEFAULT_AVATAR);}} style={secondaryButtonStyle(isLight)}>{t.removeAvatar}</button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
      </section>
    </div>
  );
}

function getText(lang: string) { const map: any = {
  en:{settings:"Settings",subtitle:"Network, language, theme and avatar",network:"Active network",language:"Language",theme:"Theme",dark:"Dark Mode",light:"Light Mode",avatar:"Avatar",changeAvatar:"Change Avatar",removeAvatar:"Remove Avatar"},
  pt:{settings:"Configurações",subtitle:"Rede, idioma, tema e avatar",network:"Rede ativa",language:"Idioma",theme:"Tema",dark:"Modo Escuro",light:"Modo Claro",avatar:"Avatar",changeAvatar:"Trocar Avatar",removeAvatar:"Remover Avatar"},
  es:{settings:"Configuración",subtitle:"Red, idioma, tema y avatar",network:"Red activa",language:"Idioma",theme:"Tema",dark:"Modo oscuro",light:"Modo claro",avatar:"Avatar",changeAvatar:"Cambiar avatar",removeAvatar:"Eliminar avatar"},
  fr:{settings:"Réglages",subtitle:"Réseau, langue, thème et avatar",network:"Réseau actif",language:"Langue",theme:"Thème",dark:"Mode sombre",light:"Mode clair",avatar:"Avatar",changeAvatar:"Changer l’avatar",removeAvatar:"Supprimer l’avatar"},
  de:{settings:"Einstellungen",subtitle:"Netzwerk, Sprache, Design und Avatar",network:"Aktives Netzwerk",language:"Sprache",theme:"Design",dark:"Dunkel",light:"Hell",avatar:"Avatar",changeAvatar:"Avatar ändern",removeAvatar:"Avatar entfernen"},
  it:{settings:"Impostazioni",subtitle:"Rete, lingua, tema e avatar",network:"Rete attiva",language:"Lingua",theme:"Tema",dark:"Scuro",light:"Chiaro",avatar:"Avatar",changeAvatar:"Cambia avatar",removeAvatar:"Rimuovi avatar"},
  ru:{settings:"Настройки",subtitle:"Сеть, язык, тема и аватар",network:"Активная сеть",language:"Язык",theme:"Тема",dark:"Тёмная",light:"Светлая",avatar:"Аватар",changeAvatar:"Сменить аватар",removeAvatar:"Удалить аватар"},
  zh:{settings:"设置",subtitle:"网络、语言、主题和头像",network:"当前网络",language:"语言",theme:"主题",dark:"深色",light:"浅色",avatar:"头像",changeAvatar:"更换头像",removeAvatar:"删除头像"},
  ja:{settings:"設定",subtitle:"ネットワーク、言語、テーマ、アバター",network:"アクティブネットワーク",language:"言語",theme:"テーマ",dark:"ダーク",light:"ライト",avatar:"アバター",changeAvatar:"アバター変更",removeAvatar:"アバター削除"},
  ko:{settings:"설정",subtitle:"네트워크, 언어, 테마 및 아바타",network:"활성 네트워크",language:"언어",theme:"테마",dark:"다크",light:"라이트",avatar:"아바타",changeAvatar:"아바타 변경",removeAvatar:"아바타 제거"},
  tr:{settings:"Ayarlar",subtitle:"Ağ, dil, tema ve avatar",network:"Aktif ağ",language:"Dil",theme:"Tema",dark:"Koyu",light:"Açık",avatar:"Avatar",changeAvatar:"Avatarı değiştir",removeAvatar:"Avatarı kaldır"},
}; return map[lang] || map.en; }
function cardStyle(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,borderRadius:20,background:isLight?"#fff":"#121621",padding:16}}
function titleStyle(isLight:boolean):React.CSSProperties{return{margin:0,color:isLight?"#10131a":"#fff"}}
function subtitleStyle(isLight:boolean):React.CSSProperties{return{marginTop:8,color:isLight?"#5b6578":"#97a0b3"}}
function labelStyle(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?"#5b6578":"#97a0b3"}}
function selectStyle(isLight:boolean):React.CSSProperties{return{width:"100%",padding:12,borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#101827",color:isLight?"#10131a":"#fff",outline:"none"}}
function primaryButtonStyle():React.CSSProperties{return{padding:"12px 14px",borderRadius:12,border:"none",background:"#3f7cff",color:"#fff",cursor:"pointer",fontWeight:800}}
function secondaryButtonStyle(isLight:boolean):React.CSSProperties{return{padding:"12px 14px",borderRadius:12,border:`1px solid ${isLight?"#dbe2f0":"#252b39"}`,background:isLight?"#fff":"#1b2741",color:isLight?"#10131a":"#fff",cursor:"pointer",fontWeight:700}}
