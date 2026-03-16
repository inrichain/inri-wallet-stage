export const translations: Record<string, Record<string, string>> = {
  en: {
    header_subtitle: "Professional multichain wallet for the INRI ecosystem",
    nav_home: "Home",
    nav_send: "Send",
    nav_receive: "Receive",
    nav_tokens: "Tokens",
    nav_activity: "Activity",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Settings",

    settings: "Settings",
    subtitle: "Manage language, theme, network and wallet profile",
    language: "Language",
    theme: "Theme",
    dark: "Dark Mode",
    light: "Light Mode",
    network: "Active network",
    network_hint:
      "Network switching stays here in one place. Swap and bridge screens use the active network display only.",
    save_rpc: "Save RPC",
    active: "Active",
    select: "Select",
    avatar: "Avatar",
    upload_avatar: "Upload Avatar",
    remove_avatar: "Remove Avatar",
    avatar_hint: "Your avatar is fully personal now. No INRI logo is forced here anymore."
  },

  pt: {
    header_subtitle: "Carteira multichain profissional para o ecossistema INRI",
    nav_home: "Início",
    nav_send: "Enviar",
    nav_receive: "Receber",
    nav_tokens: "Tokens",
    nav_activity: "Atividade",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Ajustes",

    settings: "Configurações",
    subtitle: "Gerencie idioma, tema, rede e perfil da carteira",
    language: "Idioma",
    theme: "Tema",
    dark: "Modo Escuro",
    light: "Modo Claro",
    network: "Rede ativa",
    network_hint:
      "A troca de rede fica centralizada aqui. As telas de swap e bridge usam apenas a rede ativa exibida.",
    save_rpc: "Salvar RPC",
    active: "Ativa",
    select: "Selecionar",
    avatar: "Avatar",
    upload_avatar: "Enviar Avatar",
    remove_avatar: "Remover Avatar",
    avatar_hint: "Seu avatar agora é totalmente pessoal. A logo da INRI não é mais forçada aqui."
  },

  es: {
    header_subtitle: "Billetera multichain profesional para el ecosistema INRI",
    nav_home: "Inicio",
    nav_send: "Enviar",
    nav_receive: "Recibir",
    nav_tokens: "Tokens",
    nav_activity: "Actividad",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Ajustes",

    settings: "Configuración",
    subtitle: "Gestiona idioma, tema, red y perfil de la billetera",
    language: "Idioma",
    theme: "Tema",
    dark: "Modo Oscuro",
    light: "Modo Claro",
    network: "Red activa",
    network_hint:
      "El cambio de red se gestiona aquí. Las pantallas de swap y bridge usan solo la red activa mostrada.",
    save_rpc: "Guardar RPC",
    active: "Activa",
    select: "Seleccionar",
    avatar: "Avatar",
    upload_avatar: "Subir Avatar",
    remove_avatar: "Eliminar Avatar",
    avatar_hint: "Tu avatar ahora es totalmente personal. El logo de INRI ya no se fuerza aquí."
  },

  fr: {
    header_subtitle: "Portefeuille multichaîne professionnel pour l’écosystème INRI",
    nav_home: "Accueil",
    nav_send: "Envoyer",
    nav_receive: "Recevoir",
    nav_tokens: "Tokens",
    nav_activity: "Activité",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Réglages"
  },

  de: {
    header_subtitle: "Professionelle Multichain-Wallet für das INRI-Ökosystem",
    nav_home: "Start",
    nav_send: "Senden",
    nav_receive: "Empfangen",
    nav_tokens: "Token",
    nav_activity: "Aktivität",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Einstellungen"
  },

  it: {
    header_subtitle: "Wallet multichain professionale per l’ecosistema INRI",
    nav_home: "Home",
    nav_send: "Invia",
    nav_receive: "Ricevi",
    nav_tokens: "Token",
    nav_activity: "Attività",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Impostazioni"
  },

  ru: {
    header_subtitle: "Профессиональный мультичейн-кошелёк для экосистемы INRI",
    nav_home: "Главная",
    nav_send: "Отправить",
    nav_receive: "Получить",
    nav_tokens: "Токены",
    nav_activity: "Активность",
    nav_swap: "Своп",
    nav_bridge: "Мост",
    nav_settings: "Настройки"
  },

  zh: {
    header_subtitle: "面向 INRI 生态系统的专业多链钱包",
    nav_home: "首页",
    nav_send: "发送",
    nav_receive: "接收",
    nav_tokens: "代币",
    nav_activity: "活动",
    nav_swap: "兑换",
    nav_bridge: "跨链桥",
    nav_settings: "设置"
  },

  ja: {
    header_subtitle: "INRI エコシステム向けのプロ向けマルチチェーンウォレット",
    nav_home: "ホーム",
    nav_send: "送信",
    nav_receive: "受取",
    nav_tokens: "トークン",
    nav_activity: "履歴",
    nav_swap: "スワップ",
    nav_bridge: "ブリッジ",
    nav_settings: "設定"
  },

  ko: {
    header_subtitle: "INRI 생태계를 위한 전문 멀티체인 지갑",
    nav_home: "홈",
    nav_send: "전송",
    nav_receive: "받기",
    nav_tokens: "토큰",
    nav_activity: "활동",
    nav_swap: "스왑",
    nav_bridge: "브리지",
    nav_settings: "설정"
  },

  tr: {
    header_subtitle: "INRI ekosistemi için profesyonel çok zincirli cüzdan",
    nav_home: "Ana Sayfa",
    nav_send: "Gönder",
    nav_receive: "Al",
    nav_tokens: "Tokenlar",
    nav_activity: "Etkinlik",
    nav_swap: "Swap",
    nav_bridge: "Bridge",
    nav_settings: "Ayarlar"
  }
};

export function tr(lang: string, key: string): string {
  return translations[lang]?.[key] || translations.en?.[key] || key;
}
