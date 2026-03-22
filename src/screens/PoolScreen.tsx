import React from 'react';
import ScreenCard from '../components/ScreenCard';
import SectionTitle from '../components/SectionTitle';
import StatusPill from '../components/StatusPill';
import ActionButton from '../components/ActionButton';
import EmptyState from '../components/EmptyState';

export default function PoolScreen({ theme = 'dark' }: { theme?: 'dark' | 'light'; lang?: string }) {
  const isLight = theme === 'light';
  return (
    <div className="wallet-screen-stack wallet-screen-mobile-tight">
      <ScreenCard theme={theme} className="wallet-home-hero">
        <SectionTitle
          title="INRI Pool"
          subtitle="Professional mining pool module prepared for the next integration step."
          theme={theme}
          actions={<StatusPill theme={theme} tone="primary">Coming soon</StatusPill>}
        />
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="wallet-home-actions-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
            <div className="wallet-mini-stat" style={{ background: isLight ? '#eef4ff' : '#16213b', color: '#3f7cff' }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>0</span>
              <span style={{ opacity: 0.78 }}>Workers</span>
            </div>
            <div className="wallet-mini-stat" style={{ background: isLight ? '#eef4ff' : '#16213b', color: '#3f7cff' }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>0 H/s</span>
              <span style={{ opacity: 0.78 }}>Hashrate</span>
            </div>
            <div className="wallet-mini-stat" style={{ background: isLight ? '#eef4ff' : '#16213b', color: '#3f7cff' }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>0 INRI</span>
              <span style={{ opacity: 0.78 }}>Pending rewards</span>
            </div>
            <div className="wallet-mini-stat" style={{ background: isLight ? '#eef4ff' : '#16213b', color: '#3f7cff' }}>
              <span style={{ fontWeight: 900, fontSize: 18 }}>0 INRI</span>
              <span style={{ opacity: 0.78 }}>Paid out</span>
            </div>
          </div>
          <div className="wallet-action-row">
            <ActionButton theme={theme} compact disabled>Connect miner</ActionButton>
            <ActionButton theme={theme} tone="ghost" compact disabled>Pool stats</ActionButton>
          </div>
        </div>
      </ScreenCard>

      <ScreenCard theme={theme}>
        <SectionTitle title="Pool module ready" subtitle="We can connect the real pool logic here as soon as the backend and payout flow are ready." theme={theme} compact />
        <EmptyState
          theme={theme}
          title="Pool integration pending"
          description="Next step: connect worker stats, miner endpoint, rewards, payouts and account tracking."
        />
      </ScreenCard>
    </div>
  );
}
