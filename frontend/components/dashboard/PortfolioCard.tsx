import Link from 'next/link';
import type { AccountOut } from '@/types';

interface Props {
  account: AccountOut;
}

const BROKER_COLORS: Record<string, string> = {
  KIS: '#1A56DB',
  KIWOOM: '#E03B3B',
};

export default function PortfolioCard({ account }: Props) {
  const color = BROKER_COLORS[account.broker_type] ?? '#4B5563';
  const initial = account.broker_type === 'KIS' ? 'K' : account.broker_type === 'KIWOOM' ? '키' : account.broker[0];
  const label = account.account_name || account.account_no;

  return (
    <Link
      href={`/portfolio/${account.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: '1px solid rgba(42,63,85,0.5)',
        textDecoration: 'none', transition: 'background 150ms', cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,41,55,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: 9999,
        background: color + '22', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {initial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: '#F9FAFB',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>{account.broker}</span>
          {account.is_mock && (
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 4,
              background: 'rgba(167,139,250,0.12)', color: '#A78BFA',
            }}>모의</span>
          )}
          {!account.is_verified && account.has_credentials && (
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 4,
              background: 'rgba(251,191,36,0.12)', color: '#FBB024',
            }}>미검증</span>
          )}
        </div>
      </div>

      {/* Active dot */}
      <div style={{
        width: 8, height: 8, borderRadius: 9999,
        background: account.is_active ? '#06B6D4' : '#374151',
        flexShrink: 0,
      }}/>

      {/* Arrow */}
      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1 1l4 4-4 4" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}
