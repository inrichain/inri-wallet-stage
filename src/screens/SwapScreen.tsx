import React, { useEffect, useMemo, useState } from 'react';
import { getStoredNetwork, type NetworkItem } from '../lib/network';
import { loadAllBalances } from '../lib/inri';
import {
  estimateSwapQuote,
  getDefaultSwapPair,
  getSwapOperations,
  getSwapTokensForNetwork,
  submitSwapOperation,
} from '../lib/swap';

const BASE = import.meta.env.BASE_URL || '/';
const SWAP_READY_FOR_INTEGRATION = true;

export default function SwapScreen({ theme = 'dark', lang = 'en', address }: { theme?: 'dark' | 'light'; lang?: string; address: string }) {
  const isLight = theme === 'light';
  const t = getText(lang);
  const [network, setNetwork] = useState<NetworkItem>(getStoredNetwork());
  const tokenOptions = useMemo(() => getSwapTokensForNetwork(network.key), [network.key]);
  const defaultPair = useMemo(() => getDefaultSwapPair(network.key), [network.key]);
  const [fromToken, setFromToken] = useState(defaultPair.from?.symbol || 'INRI');
  const [toToken, setToToken] = useState(defaultPair.to?.symbol || 'iUSD');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('0.50');
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'editing' | 'reviewing' | 'submitting'>('editing');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [opsTick, setOpsTick] = useState(0);

  useEffect(() => {
    const sync = () => setNetwork(getStoredNetwork());
    window.addEventListener('storage', sync);
    window.addEventListener('wallet-network-updated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('wallet-network-updated', sync as EventListener);
    };
  }, []);

  useEffect(() => {
    const pair = getDefaultSwapPair(network.key);
    setFromToken((prev) => (tokenOptions.some((item) => item.symbol === prev) ? prev : pair.from?.symbol || 'INRI'));
    setToToken((prev) => (tokenOptions.some((item) => item.symbol === prev && item.symbol !== fromToken) ? prev : pair.to?.symbol || 'iUSD'));
  }, [network.key]);

  useEffect(() => {
    let active = true;
    async function load() {
      const next = await loadAllBalances(address, tokenOptions);
      if (!active) return;
      setBalances(next);
    }
    if (!tokenOptions.length) return;
    load();
    const timer = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [address, tokenOptions]);

  const quote = useMemo(
    () =>
      estimateSwapQuote({
        networkKey: network.key,
        fromSymbol: fromToken,
        toSymbol: toToken,
        amountText: amount,
        slippageText: slippage,
      }),
    [network.key, fromToken, toToken, amount, slippage],
  );

  const operations = useMemo(() => getSwapOperations(address), [address, opsTick]);
  const from = tokenOptions.find((t) => t.symbol === fromToken) || tokenOptions[0];
  const to = tokenOptions.find((t) => t.symbol === toToken) || tokenOptions[1] || tokenOptions[0];
  const canReview = Number(amount || '0') > 0 && !!from && !!to && from.symbol !== to.symbol;

  function reverseTokens() {
    setFromToken(toToken);
    setToToken(fromToken);
    setStep('editing');
  }

  async function handlePrimaryAction() {
    if (step === 'editing') {
      if (!canReview) {
        setFlash(t.fillFields);
        return;
      }
      setStep('reviewing');
      return;
    }

    if (step === 'reviewing') {
      setBusy(true);
      setStep('submitting');
      try {
        await submitSwapOperation({
          walletAddress: address,
          networkKey: network.key,
          fromSymbol: fromToken,
          toSymbol: toToken,
          amountText: amount,
          slippageText: slippage,
        });
        setFlash(t.swapCreated);
        setAmount('');
        setStep('editing');
        setOpsTick((n) => n + 1);
      } catch (e: any) {
        setFlash(e?.message || t.swapFailed);
        setStep('reviewing');
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div style={wrap(isLight)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={title(isLight)}>{t.swap}</h2>
          <div style={subhead(isLight)}>{t.swapSubtitle}</div>
        </div>
        <div style={chip(isLight)}>
          <img src={getNetworkDisplayLogo(network)} alt={network.name} style={chipLogo} />
          <span>{network.name}</span>
        </div>
      </div>

      <div style={banner(isLight, SWAP_READY_FOR_INTEGRATION)}>{SWAP_READY_FOR_INTEGRATION ? t.routerReady : t.routerPending}</div>
      {!!flash ? <div style={notice(isLight)}>{flash}</div> : null}

      {!from || !to ? (
        <div style={emptyOps(isLight)}>{t.notEnoughTokens}</div>
      ) : (
        <>
          <div style={panel(isLight)}>
            <div style={sectionHeader(isLight)}><span>{t.from}</span><span>{t.balance}: {balances[from.symbol] || '0.000000'}</span></div>
            <div style={tokenPreview(isLight)}>
              <div style={tokenBox}>
                <img src={from.logo || '/token-placeholder.svg'} alt={from.symbol} style={logoStyle} />
                <div>
                  <strong style={{ color: isLight ? '#10131a' : '#fff' }}>{from.symbol}</strong>
                  <div style={hint(isLight)}>{from.subtitle}</div>
                </div>
              </div>
              <select value={fromToken} onChange={(e) => { const next = e.target.value; if (next === toToken) setToToken(fromToken); setFromToken(next); setStep('editing'); }} style={tokenSelectStyle(isLight)}>
                {tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
              </select>
            </div>
            <div style={amountRow}>
              <input value={amount} onChange={(e) => { setAmount(e.target.value.replace(/,/g, '.')); setStep('editing'); }} placeholder='0.00' style={amountInput(isLight)} />
              <button style={maxButton(isLight)} onClick={() => { setAmount(balances[from.symbol] || '0'); setStep('editing'); }}>Max</button>
            </div>
          </div>

          <div style={{ display: 'grid', placeItems: 'center', margin: '12px 0' }}><button onClick={reverseTokens} style={swapButtonStyle(isLight)} title={t.reverse}>⇅</button></div>

          <div style={panel(isLight)}>
            <div style={sectionHeader(isLight)}><span>{t.to}</span><span>{t.estimatedOutput}</span></div>
            <div style={tokenPreview(isLight)}>
              <div style={tokenBox}>
                <img src={to.logo || '/token-placeholder.svg'} alt={to.symbol} style={logoStyle} />
                <div>
                  <strong style={{ color: isLight ? '#10131a' : '#fff' }}>{to.symbol}</strong>
                  <div style={hint(isLight)}>{to.subtitle}</div>
                </div>
              </div>
              <select value={toToken} onChange={(e) => { const next = e.target.value; if (next === fromToken) setFromToken(toToken); setToToken(next); setStep('editing'); }} style={tokenSelectStyle(isLight)}>
                {tokenOptions.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol}</option>)}
              </select>
            </div>
            <div style={estimatedStyle(isLight)}>{quote.amountOut} {to.symbol}</div>
          </div>

          <div style={{ ...panel(isLight), marginTop: 12 }}>
            <div style={label(isLight)}>{t.execution}</div>
            <div style={networkInfo(isLight)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={getNetworkDisplayLogo(network)} alt={network.name} style={networkExecutionLogo(isLight)} />
                <div>
                  <div style={{ color: isLight ? '#10131a' : '#fff', fontWeight: 800 }}>{network.name}</div>
                  <div style={hint(isLight)}>Chain ID {network.chainId}</div>
                </div>
              </div>
              <div style={hint(isLight)}>{t.networkLocked}</div>
            </div>
            <div style={miniGridStyle}><div style={{ color: isLight ? '#334155' : '#cfd6e4' }}>{t.slippage}</div><input value={slippage} onChange={(e) => { setSlippage(e.target.value); setStep('editing'); }} style={smallInput(isLight)} /></div>
            <div style={miniRow(isLight)}><span>{t.minimumReceived}</span><strong>{quote.minimumReceived} {to.symbol}</strong></div>
            <div style={miniRow(isLight)}><span>{t.priceImpact}</span><strong>{quote.priceImpact}</strong></div>
            <div style={miniRow(isLight)}><span>{t.route}</span><strong>{quote.routeLabel}</strong></div>
            <div style={miniRow(isLight)}><span>{t.router}</span><strong>{quote.route.routerName}</strong></div>
            <div style={miniRow(isLight)}><span>{t.quoteMethod}</span><strong>{quote.route.quoteMethod}</strong></div>
            <div style={miniRow(isLight)}><span>{t.swapMethod}</span><strong>{quote.route.swapMethod}</strong></div>
            <div style={miniRow(isLight)}><span>{t.estimatedGas}</span><strong>{quote.estimatedGasNative} {network.symbol} • {quote.estimatedGasUsd}</strong></div>
            <div style={miniRow(isLight)}><span>{t.approval}</span><strong>{quote.requiresApproval ? t.required : t.notRequired}</strong></div>
            <div style={miniRow(isLight)}><span>{t.routerContract}</span><strong>{quote.route.routerAddress || t.contractPlaceholder}</strong></div>
          </div>

          {step === 'reviewing' ? (
            <div style={{ ...panel(isLight), marginTop: 12, borderColor: '#3f7cff' }}>
              <div style={{ ...label(isLight), color: '#3f7cff', fontWeight: 800 }}>{t.reviewTitle}</div>
              <div style={reviewTitle(isLight)}>{from.symbol} → {to.symbol}</div>
              <div style={reviewSub(isLight)}>{t.reviewSubtitle}</div>
              <div style={reviewGrid}>
                <ReviewCard isLight={isLight} label={t.youPay} value={`${quote.amountIn} ${from.symbol}`} />
                <ReviewCard isLight={isLight} label={t.youReceive} value={`${quote.amountOut} ${to.symbol}`} />
                <ReviewCard isLight={isLight} label={t.minimumReceived} value={`${quote.minimumReceived} ${to.symbol}`} />
                <ReviewCard isLight={isLight} label={t.route} value={quote.routeLabel} mono />
                <ReviewCard isLight={isLight} label={t.router} value={quote.route.routerName} />
                <ReviewCard isLight={isLight} label={t.mode} value={t.mockReadyMode} />
              </div>
            </div>
          ) : null}

          <div style={{ ...panel(isLight), marginTop: 12 }}>
            <div style={label(isLight)}>{t.operationStatus}</div>
            <div style={timelineWrap}>
              <TimelineDot active={step !== 'editing'} done={step === 'submitting' || operations.length > 0} label={t.stepReview} isLight={isLight} />
              <TimelineDot active={step === 'submitting' || operations.length > 0} done={operations.some((item) => item.status === 'confirmed')} label={t.stepSubmit} isLight={isLight} />
              <TimelineDot active={operations.length > 0} done={operations.some((item) => item.status === 'confirmed')} label={t.stepConfirm} isLight={isLight} />
            </div>
          </div>

          <div style={{ ...panel(isLight), marginTop: 12 }}>
            <div style={label(isLight)}>{t.recentSwaps}</div>
            {operations.length === 0 ? (
              <div style={emptyOps(isLight)}>{t.noSwaps}</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {operations.slice(0, 4).map((item) => (
                  <OperationCard key={item.id} item={item} isLight={isLight} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div style={foot(isLight)}>{t.previewFee}</div>
      <button style={{ ...mainButtonStyle(), opacity: busy ? 0.7 : 1 }} disabled={busy || !from || !to} onClick={handlePrimaryAction}>
        {busy ? t.processing : step === 'editing' ? t.reviewSwap : t.submitSwap}
      </button>
    </div>
  );
}

function getText(lang: string) { const map: Record<string, any> = {
 en: { swap:'Swap', swapSubtitle:'Execution-ready swap flow prepared for real router integration.', from:'From', to:'To', balance:'Balance', reverse:'Reverse', estimatedOutput:'Estimated output', previewFee:'Swap UI is now separated from execution logic, so later you only need to connect quotes, approvals and router calls.', execution:'Execution', slippage:'Slippage %', minimumReceived:'Minimum received', priceImpact:'Price impact', route:'Route', waitingConfig:'Router not configured yet', swapNow:'Swap now', routerPending:'Swap UI exists, but router integration is still pending.', routerReady:'Swap is ready for real integration with adapter, review flow and operation history.', networkLocked:'Change network only in Settings', router:'Router', quoteMethod:'Quote method', swapMethod:'Swap method', estimatedGas:'Estimated gas', approval:'Approval', required:'Required', notRequired:'Not required', routerContract:'Router contract', contractPlaceholder:'Add router contract later', reviewTitle:'Review swap', reviewSubtitle:'Check the route, minimum received and execution details before sending.', youPay:'You pay', youReceive:'You receive', mode:'Mode', mockReadyMode:'Integration-ready mock', operationStatus:'Operation status', stepReview:'Review', stepSubmit:'Submit', stepConfirm:'Confirm', recentSwaps:'Recent swaps', noSwaps:'No swap operations yet.', reviewSwap:'Review swap', submitSwap:'Submit swap', processing:'Processing...', fillFields:'Choose two different tokens and enter an amount.', swapCreated:'Swap operation created successfully.', swapFailed:'Swap execution failed.', notEnoughTokens:'Not enough tokens available on this network for swap.', },
 pt: { swap:'Swap', swapSubtitle:'Fluxo de swap pronto para execução real depois da integração do router.', from:'De', to:'Para', balance:'Saldo', reverse:'Inverter', estimatedOutput:'Saída estimada', previewFee:'Agora o swap está separado da lógica de execução. Depois você só precisa ligar quote, approve e chamada do router.', execution:'Execução', slippage:'Slippage %', minimumReceived:'Mínimo recebido', priceImpact:'Impacto no preço', route:'Rota', waitingConfig:'Roteador ainda não configurado', swapNow:'Trocar agora', routerPending:'A UI do swap existe, mas a integração do router ainda está pendente.', routerReady:'Swap pronto para integração real com adapter, revisão e histórico.', networkLocked:'Troque a rede apenas em Configurações', router:'Router', quoteMethod:'Método de quote', swapMethod:'Método de swap', estimatedGas:'Gas estimado', approval:'Aprovação', required:'Necessária', notRequired:'Não necessária', routerContract:'Contrato do router', contractPlaceholder:'Adicionar contrato do router depois', reviewTitle:'Revisar swap', reviewSubtitle:'Confira rota, mínimo recebido e detalhes de execução antes de enviar.', youPay:'Você paga', youReceive:'Você recebe', mode:'Modo', mockReadyMode:'Mock pronto para integração', operationStatus:'Status da operação', stepReview:'Revisão', stepSubmit:'Envio', stepConfirm:'Confirmação', recentSwaps:'Swaps recentes', noSwaps:'Ainda não há operações de swap.', reviewSwap:'Revisar swap', submitSwap:'Enviar swap', processing:'Processando...', fillFields:'Escolha dois tokens diferentes e informe um valor.', swapCreated:'Operação de swap criada com sucesso.', swapFailed:'Falha ao executar o swap.', notEnoughTokens:'Não há tokens suficientes nessa rede para swap.', },
 es: { swap:'Swap', swapSubtitle:'Flujo de swap listo para ejecución real cuando conectes el router.', from:'De', to:'A', balance:'Saldo', reverse:'Invertir', estimatedOutput:'Salida estimada', previewFee:'Ahora el swap está separado de la lógica de ejecución. Luego solo conectas quote, approve y llamada al router.', execution:'Ejecución', slippage:'Slippage %', minimumReceived:'Mínimo recibido', priceImpact:'Impacto de precio', route:'Ruta', waitingConfig:'Router aún no configurado', swapNow:'Hacer swap', routerPending:'La UI del swap existe, pero la integración del router sigue pendiente.', routerReady:'Swap listo para integración real con adapter, revisión e historial.', networkLocked:'Cambia la red solo en Ajustes', router:'Router', quoteMethod:'Método de quote', swapMethod:'Método de swap', estimatedGas:'Gas estimado', approval:'Aprobación', required:'Requerida', notRequired:'No requerida', routerContract:'Contrato del router', contractPlaceholder:'Agregar contrato del router después', reviewTitle:'Revisar swap', reviewSubtitle:'Verifica ruta, mínimo recibido y detalles antes de enviar.', youPay:'Tú pagas', youReceive:'Tú recibes', mode:'Modo', mockReadyMode:'Mock listo para integración', operationStatus:'Estado de la operación', stepReview:'Revisión', stepSubmit:'Envío', stepConfirm:'Confirmación', recentSwaps:'Swaps recientes', noSwaps:'Aún no hay swaps.', reviewSwap:'Revisar swap', submitSwap:'Enviar swap', processing:'Procesando...', fillFields:'Elige dos tokens diferentes e ingresa un monto.', swapCreated:'Operación de swap creada con éxito.', swapFailed:'Falló la ejecución del swap.', notEnoughTokens:'No hay tokens suficientes en esta red para swap.', }, };
 return map[lang] || map.en; }
function wrap(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?'#dbe2f0':'#252b39'}`,borderRadius:20,background:isLight?'#ffffff':'#121621',padding:16}}
function title(isLight:boolean):React.CSSProperties{return{margin:'0',color:isLight?'#10131a':'#ffffff'}}
function subhead(isLight:boolean):React.CSSProperties{return{marginTop:6,color:isLight?'#5b6578':'#97a0b3',fontSize:14}}
function panel(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?'#dbe2f0':'#252b39'}`,borderRadius:20,background:isLight?'#fbfcff':'#0f1522',padding:14}}
function banner(isLight:boolean, ready:boolean):React.CSSProperties{return{margin:'12px 0',padding:'12px 14px',borderRadius:14,background:ready?(isLight?'#eefbf4':'#11241b'):(isLight?'#eef4ff':'#16213b'),color:ready?'#16a34a':'#3f7cff',fontWeight:700}}
function chip(isLight:boolean):React.CSSProperties{return{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:999,background:isLight?'#eef4ff':'#16213b',color:'#3f7cff',fontWeight:800,fontSize:13}}
function notice(isLight:boolean):React.CSSProperties{return{marginBottom:12,padding:'12px 14px',borderRadius:14,background:isLight?'#fff7ed':'#2a1d0d',color:'#f59e0b',fontWeight:700}}
const chipLogo:React.CSSProperties={width:18,height:18,borderRadius:999,objectFit:'cover',background:'transparent'};
function label(isLight:boolean):React.CSSProperties{return{marginBottom:10,fontSize:13,color:isLight?'#5b6578':'#97a0b3'}}
function hint(isLight:boolean):React.CSSProperties{return{fontSize:12,color:isLight?'#5b6578':'#97a0b3'}}
function sectionHeader(isLight:boolean):React.CSSProperties{return{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:10,fontSize:13,color:isLight?'#5b6578':'#97a0b3'}}
const tokenBox:React.CSSProperties={display:'flex',alignItems:'center',gap:10,minWidth:0};
function tokenPreview(isLight:boolean):React.CSSProperties{return{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',padding:'10px 12px',borderRadius:16,background:isLight?'#ffffff':'#0b1120',border:`1px solid ${isLight?'#e2e8f0':'#1f2937'}`}}
const logoStyle:React.CSSProperties={width:42,height:42,borderRadius:21,objectFit:'cover',background:'transparent'};
function networkExecutionLogo(isLight:boolean):React.CSSProperties{return{width:42,height:42,borderRadius:21,objectFit:'cover',background:'transparent',flexShrink:0}}
function getNetworkDisplayLogo(network: NetworkItem) {
  if (network.key === 'inri') return `${BASE}token-inri.png`;
  return network.logo;
}

function tokenSelectStyle(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?'#dbe2f0':'#2a3344'}`,borderRadius:12,padding:'10px 12px',background:isLight?'#fff':'#111827',color:isLight?'#0f172a':'#fff',fontWeight:700}}
function amountInput(isLight:boolean):React.CSSProperties{return{flex:1,border:`1px solid ${isLight?'#dbe2f0':'#2a3344'}`,borderRadius:14,padding:'14px 16px',background:isLight?'#ffffff':'#111827',color:isLight?'#10131a':'#fff',fontSize:26,fontWeight:900,minWidth:0}}
const amountRow:React.CSSProperties={display:'flex',alignItems:'center',gap:10,marginTop:12};
function maxButton(isLight:boolean):React.CSSProperties{return{border:'none',borderRadius:14,padding:'12px 14px',background:'#3f7cff',color:'#fff',fontWeight:800,cursor:'pointer'}}
function estimatedStyle(isLight:boolean):React.CSSProperties{return{marginTop:14,fontSize:28,fontWeight:900,color:isLight?'#10131a':'#fff'}}
function networkInfo(isLight:boolean):React.CSSProperties{return{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',padding:'12px 14px',borderRadius:16,background:isLight?'#ffffff':'#0b1120',border:`1px solid ${isLight?'#e2e8f0':'#1f2937'}`,marginBottom:12}}
const miniGridStyle:React.CSSProperties={display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'center',marginBottom:10};
function smallInput(isLight:boolean):React.CSSProperties{return{width:92,border:`1px solid ${isLight?'#dbe2f0':'#2a3344'}`,borderRadius:12,padding:'10px 12px',background:isLight?'#ffffff':'#111827',color:isLight?'#10131a':'#fff',fontWeight:700,textAlign:'right'}}
function miniRow(isLight:boolean):React.CSSProperties{return{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${isLight?'#edf2f7':'#192030'}`,color:isLight?'#334155':'#cfd6e4',fontSize:14,flexWrap:'wrap'}}
function foot(isLight:boolean):React.CSSProperties{return{marginTop:12,fontSize:13,color:isLight?'#5b6578':'#97a0b3'}}
function mainButtonStyle():React.CSSProperties{return{marginTop:12,width:'100%',border:'none',borderRadius:16,padding:'15px 18px',background:'#3f7cff',color:'#fff',fontWeight:900,fontSize:16,cursor:'pointer'}}
function swapButtonStyle(isLight:boolean):React.CSSProperties{return{border:`1px solid ${isLight?'#dbe2f0':'#252b39'}`,background:isLight?'#ffffff':'#0f1522',color:'#3f7cff',width:48,height:48,borderRadius:999,fontSize:20,fontWeight:900,cursor:'pointer'}}
const reviewGrid:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:12};
function reviewTitle(isLight:boolean):React.CSSProperties{return{fontSize:22,fontWeight:900,color:isLight?'#10131a':'#fff'}}
function reviewSub(isLight:boolean):React.CSSProperties{return{marginTop:6,color:isLight?'#5b6578':'#97a0b3',fontSize:13}}
const timelineWrap:React.CSSProperties={display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:10};
function emptyOps(isLight:boolean):React.CSSProperties{return{padding:'12px 14px',borderRadius:14,background:isLight?'#f8fafc':'#0b1120',color:isLight?'#5b6578':'#97a0b3',border:`1px solid ${isLight?'#e2e8f0':'#1f2937'}`}}
function ReviewCard({ isLight, label, value, mono = false }: { isLight: boolean; label: string; value: string; mono?: boolean }) {
  return <div style={{ border:`1px solid ${isLight?'#e2e8f0':'#1f2937'}`, borderRadius:14, padding:'12px 14px', background:isLight?'#f8fafc':'#0b1120' }}><div style={{ fontSize:12, color:isLight?'#64748b':'#94a3b8', marginBottom:6 }}>{label}</div><div style={{ color:isLight?'#10131a':'#fff', fontSize:13, fontWeight:700, wordBreak:'break-word', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined }}>{value}</div></div>;
}
function TimelineDot({ active, done, label, isLight }: { active: boolean; done: boolean; label: string; isLight: boolean }) {
  const bg = done ? '#16a34a' : active ? '#3f7cff' : isLight ? '#e2e8f0' : '#1f2937';
  const color = done || active ? '#fff' : isLight ? '#64748b' : '#94a3b8';
  return <div style={{ borderRadius:16, padding:'12px 10px', textAlign:'center', background:bg, color, fontWeight:800, fontSize:13 }}>{label}</div>;
}
function OperationCard({ item, isLight }: { item: any; isLight: boolean }) {
  return <div style={{ border:`1px solid ${isLight?'#e2e8f0':'#1f2937'}`, borderRadius:16, padding:'12px 14px', background:isLight?'#ffffff':'#0b1120' }}><div style={{ display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}><strong style={{ color:isLight?'#10131a':'#fff' }}>{item.fromSymbol} → {item.toSymbol}</strong><span style={{ color:item.status === 'confirmed' ? '#16a34a' : '#f59e0b', fontWeight:800 }}>{item.status}</span></div><div style={{ marginTop:8, color:isLight?'#5b6578':'#97a0b3', fontSize:13 }}>{item.amountIn} {item.fromSymbol} → {item.amountOut} {item.toSymbol}</div><div style={{ marginTop:6, color:isLight?'#5b6578':'#97a0b3', fontSize:12 }}>{item.routeLabel}</div></div>;
}
