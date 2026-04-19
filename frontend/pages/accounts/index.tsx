import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import axios from 'axios';

interface Account {
  id: string;
  broker: string;
  broker_type: string;
  account_no: string;
  account_name: string;
  is_mock: boolean;
  is_active: boolean;
  is_verified: boolean;
  display_order: number;
  has_credentials: boolean;
}

interface BrokerInfo {
  code: string;
  name: string;
  supported: boolean;
  guide_url: string;
}

interface AccountFormData {
  account_no: string;
  account_name: string;
  broker_type: string;
  app_key: string;
  app_secret: string;
  is_mock: boolean;
}

const fetcher = (url: string) => axios.get(url).then(r => r.data);

const BROKER_COLORS: Record<string, string> = {
  KIS: '#1A56DB',
  KIWOOM: '#E03B3B',
};

const BROKER_LABELS: Record<string, string> = {
  KIS: 'KIS',
  KIWOOM: '키움',
};

function BrokerAvatar({ brokerType }: { brokerType: string }) {
  const color = BROKER_COLORS[brokerType] ?? '#4B5563';
  const label = BROKER_LABELS[brokerType] ?? brokerType[0];
  return (
    <div
      style={{ backgroundColor: color + '22', color }}
      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
    >
      {label}
    </div>
  );
}

function StatusBadge({ verified, active }: { verified: boolean; active: boolean }) {
  if (!active) return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-white/[0.06] text-white/40">
      비활성
    </span>
  );
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
      verified
        ? 'bg-cyan-500/10 text-cyan-400'
        : 'bg-amber-500/10 text-amber-400'
    }`}>
      {verified ? '검증됨' : '미검증'}
    </span>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{ backgroundColor: active ? '#06B6D4' : 'rgba(255,255,255,0.1)' }}
      className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function AccountFormModal({
  initial,
  brokers,
  onClose,
  onSave,
}: {
  initial?: Account;
  brokers: BrokerInfo[];
  onClose: () => void;
  onSave: (data: AccountFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<AccountFormData>({
    account_no: initial?.account_no ?? '',
    account_name: initial?.account_name ?? '',
    broker_type: initial?.broker_type ?? 'KIS',
    app_key: '',
    app_secret: '',
    is_mock: initial?.is_mock ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.account_no.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        style={{ backgroundColor: '#131C27', border: '1px solid rgba(255,255,255,0.08)' }}
        className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">{isEdit ? '계좌 수정' : '계좌 추가'}</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Broker selection */}
          {!isEdit && (
            <div>
              <p className="text-xs text-white/50 mb-2">증권사</p>
              <div className="flex gap-2">
                {brokers.map(b => (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, broker_type: b.code }))}
                    style={{
                      borderColor: form.broker_type === b.code ? (BROKER_COLORS[b.code] ?? '#06B6D4') : 'rgba(255,255,255,0.1)',
                      backgroundColor: form.broker_type === b.code ? (BROKER_COLORS[b.code] ?? '#06B6D4') + '15' : 'transparent',
                      color: form.broker_type === b.code ? (BROKER_COLORS[b.code] ?? '#06B6D4') : 'rgba(255,255,255,0.5)',
                    }}
                    className="flex-1 py-2 rounded-lg border text-sm font-medium transition-all"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account no */}
          <div>
            <p className="text-xs text-white/50 mb-1.5">계좌번호</p>
            <input
              value={form.account_no}
              onChange={e => setForm(f => ({ ...f, account_no: e.target.value }))}
              placeholder="XXXXXXXXXX-XX"
              disabled={isEdit}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              className="w-full border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 disabled:opacity-50 font-mono transition"
            />
          </div>

          {/* Account name */}
          <div>
            <p className="text-xs text-white/50 mb-1.5">계좌 별칭 <span className="text-white/30">(선택)</span></p>
            <input
              value={form.account_name}
              onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))}
              placeholder="예: KIS 주식계좌"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              className="w-full border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 transition"
            />
          </div>

          {/* API Key / Secret */}
          <div>
            <p className="text-xs text-white/50 mb-1.5">App Key {isEdit && <span className="text-white/30">(변경 시만 입력)</span>}</p>
            <input
              value={form.app_key}
              onChange={e => setForm(f => ({ ...f, app_key: e.target.value }))}
              placeholder={isEdit ? '••••••••' : 'App Key'}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              className="w-full border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 font-mono transition"
            />
          </div>
          <div>
            <p className="text-xs text-white/50 mb-1.5">App Secret {isEdit && <span className="text-white/30">(변경 시만 입력)</span>}</p>
            <input
              type="password"
              value={form.app_secret}
              onChange={e => setForm(f => ({ ...f, app_secret: e.target.value }))}
              placeholder={isEdit ? '••••••••' : 'App Secret'}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
              className="w-full border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 transition"
            />
          </div>

          {/* Mock toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-white">모의투자</p>
              <p className="text-xs text-white/40">실전 투자가 아닌 모의 환경으로 연결</p>
            </div>
            <Toggle active={form.is_mock} onChange={() => setForm(f => ({ ...f, is_mock: !f.is_mock }))} />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving || !form.account_no.trim()}
            style={{ backgroundColor: '#06B6D4' }}
            className="w-full py-2.5 hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-lg text-sm transition-all"
          >
            {saving ? '저장 중...' : isEdit ? '수정 저장' : '계좌 추가'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AccountRow({
  acc,
  onToggle,
  onVerify,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isOnlyOne,
}: {
  acc: Account;
  onToggle: () => void;
  onVerify: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isOnlyOne: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <BrokerAvatar brokerType={acc.broker_type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white font-mono">{acc.account_no}</span>
          <StatusBadge verified={acc.is_verified} active={acc.is_active} />
          {acc.is_mock && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-400">
              모의
            </span>
          )}
        </div>
        <p className="text-xs text-white/40 mt-0.5">
          {acc.account_name || acc.broker} · {acc.has_credentials ? 'API 연결됨' : 'API 미설정'}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Move up/down */}
        {!isOnlyOne && (
          <div className="flex flex-col mr-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-white/20 hover:text-white/60 disabled:opacity-0 transition-colors p-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="text-white/20 hover:text-white/60 disabled:opacity-0 transition-colors p-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        )}

        {/* Verify */}
        {!acc.is_verified && acc.has_credentials && (
          <button
            onClick={onVerify}
            className="text-xs text-cyan-400 font-medium px-2 py-1 rounded hover:bg-cyan-500/10 transition-colors"
          >
            검증
          </button>
        )}

        {/* Edit */}
        <button
          onClick={onEdit}
          className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>

        {/* Toggle */}
        <Toggle active={acc.is_active} onChange={onToggle} />

        {/* Delete */}
        <button
          onClick={onDelete}
          className="text-white/20 hover:text-red-400 transition-colors p-1.5 rounded ml-0.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useSWR<Account[]>('/api/v1/accounts', fetcher);
  const { data: brokers = [] } = useSWR<BrokerInfo[]>('/api/v1/accounts/brokers', fetcher);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | undefined>(undefined);

  async function handleSave(form: AccountFormData) {
    if (editTarget) {
      const patch: Record<string, unknown> = { account_name: form.account_name, is_mock: form.is_mock };
      if (form.app_key) patch.app_key = form.app_key;
      if (form.app_secret) patch.app_secret = form.app_secret;
      await axios.patch(`/api/v1/accounts/${editTarget.id}`, patch);
    } else {
      await axios.post('/api/v1/accounts', form);
    }
    mutate('/api/v1/accounts');
  }

  async function handleVerify(id: string) {
    try {
      await axios.post(`/api/v1/accounts/${id}/verify`);
      mutate('/api/v1/accounts');
    } catch {
      alert('계좌 검증 실패. API 키를 확인해 주세요.');
    }
  }

  async function handleToggle(id: string) {
    await axios.patch(`/api/v1/accounts/${id}/toggle`);
    mutate('/api/v1/accounts');
  }

  async function handleDelete(id: string) {
    if (!confirm('계좌를 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    await axios.delete(`/api/v1/accounts/${id}`);
    mutate('/api/v1/accounts');
  }

  async function handleReorder(id: string, direction: 'up' | 'down') {
    await axios.post(`/api/v1/accounts/${id}/reorder?direction=${direction}`);
    mutate('/api/v1/accounts');
  }

  function openAdd() {
    setEditTarget(undefined);
    setShowModal(true);
  }

  function openEdit(acc: Account) {
    setEditTarget(acc);
    setShowModal(true);
  }

  const activeCount = accounts.filter(a => a.is_active).length;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">증권 계좌</h1>
            <p className="text-white/40 text-sm mt-1">
              증권사 API 키를 등록하면 실시간 잔고가 자동 집계됩니다
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{ backgroundColor: '#06B6D4' }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            계좌 추가
          </button>
        </div>

        {/* Stats */}
        {accounts.length > 0 && (
          <div className="flex gap-3">
            {[
              { label: '전체', value: accounts.length },
              { label: '활성', value: activeCount },
              { label: '검증됨', value: accounts.filter(a => a.is_verified).length },
            ].map(s => (
              <div
                key={s.label}
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                className="flex-1 rounded-xl px-4 py-3 text-center"
              >
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Account list */}
        <div
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          className="rounded-2xl overflow-hidden"
        >
          {isLoading ? (
            <div className="p-10 text-center text-white/30 text-sm">불러오는 중...</div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <p className="text-white/50 text-sm">등록된 계좌가 없습니다</p>
              <p className="text-white/25 text-xs">위 버튼을 눌러 계좌를 추가해 주세요</p>
            </div>
          ) : (
            accounts.map((acc, i) => (
              <div key={acc.id}>
                <AccountRow
                  acc={acc}
                  onToggle={() => handleToggle(acc.id)}
                  onVerify={() => handleVerify(acc.id)}
                  onDelete={() => handleDelete(acc.id)}
                  onEdit={() => openEdit(acc)}
                  onMoveUp={() => handleReorder(acc.id, 'up')}
                  onMoveDown={() => handleReorder(acc.id, 'down')}
                  isFirst={i === 0}
                  isLast={i === accounts.length - 1}
                  isOnlyOne={accounts.length === 1}
                />
                {i < accounts.length - 1 && (
                  <div className="mx-4 border-b border-white/[0.05]" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Broker info cards */}
        {brokers.length > 0 && (
          <div>
            <p className="text-xs text-white/30 font-medium uppercase tracking-widest mb-3">지원 증권사</p>
            <div className="grid grid-cols-2 gap-3">
              {brokers.map(b => (
                <div
                  key={b.code}
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  className="rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <BrokerAvatar brokerType={b.code} />
                    <div>
                      <p className="text-sm font-semibold text-white">{b.name}</p>
                      <p className="text-[10px] text-white/30">{b.code}</p>
                    </div>
                  </div>
                  <a
                    href={b.guide_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                  >
                    API 포털 →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help */}
        <div
          style={{ backgroundColor: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}
          className="rounded-xl p-4 space-y-1.5"
        >
          <p className="text-xs font-semibold text-white">API 키 발급 방법</p>
          <p className="text-xs text-white/50">• KIS: 한국투자증권 MTS → KIS Developers → 앱 신청</p>
          <p className="text-xs text-white/50">• 키움: 키움증권 HTS → OpenAPI+ → REST API 신청</p>
          <p className="text-xs text-white/50">• App Key / App Secret 발급 후 위 폼에 입력</p>
          <p className="text-xs text-white/50">
            • 계좌번호 형식:{' '}
            <span className="font-mono text-white/70">XXXXXXXXXX-XX</span>
          </p>
        </div>

      </div>

      {showModal && (
        <AccountFormModal
          initial={editTarget}
          brokers={brokers}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </AppLayout>
  );
}
