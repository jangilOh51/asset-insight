import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import axios from 'axios';

interface Account {
  id: string;
  broker: string;
  account_no: string;
  account_name: string;
  is_active: boolean;
  is_verified: boolean;
}

const fetcher = (url: string) => axios.get(url).then(r => r.data);

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
      verified
        ? 'bg-apple-green/10 text-apple-green'
        : 'bg-white/[0.06] text-apple-label3'
    }`}>
      {verified ? '검증됨' : '미검증'}
    </span>
  );
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useSWR<Account[]>('/api/v1/accounts', fetcher);
  const [accountNo,   setAccountNo]   = useState('');
  const [accountName, setAccountName] = useState('');
  const [adding,  setAdding]  = useState(false);
  const [error,   setError]   = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNo.trim()) return;
    setAdding(true);
    setError('');
    try {
      await axios.post('/api/v1/accounts', {
        account_no:   accountNo.trim(),
        account_name: accountName.trim(),
      });
      setAccountNo('');
      setAccountName('');
      mutate('/api/v1/accounts');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '계좌 추가 실패');
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    await axios.post(`/api/v1/accounts/${id}/verify`);
    mutate('/api/v1/accounts');
  }

  async function handleToggle(id: string) {
    await axios.patch(`/api/v1/accounts/${id}/toggle`);
    mutate('/api/v1/accounts');
  }

  async function handleDelete(id: string) {
    if (!confirm('계좌를 삭제할까요?')) return;
    await axios.delete(`/api/v1/accounts/${id}`);
    mutate('/api/v1/accounts');
  }

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">증권 계좌</h1>
          <p className="text-apple-label3 text-sm mt-1">
            KIS API로 연동할 계좌를 등록하세요. 매일 자동으로 스냅샷이 저장됩니다.
          </p>
        </div>

        {/* 추가 폼 */}
        <div className="bg-apple-surface rounded-apple-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">계좌 추가</p>
          </div>
          <form onSubmit={handleAdd} className="p-4 space-y-3">
            <div className="space-y-2">
              <input
                value={accountNo}
                onChange={e => setAccountNo(e.target.value)}
                placeholder="계좌번호 (예: 50123456-01)"
                className="w-full bg-apple-elevated border border-white/[0.08] rounded-apple px-3.5 py-2.5 text-sm text-white placeholder-apple-label3 focus:outline-none focus:ring-1 focus:ring-apple-blue/60 transition"
              />
              <input
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="계좌 별칭 (선택)"
                className="w-full bg-apple-elevated border border-white/[0.08] rounded-apple px-3.5 py-2.5 text-sm text-white placeholder-apple-label3 focus:outline-none focus:ring-1 focus:ring-apple-blue/60 transition"
              />
            </div>
            {error && <p className="text-xs text-apple-red">{error}</p>}
            <button
              type="submit"
              disabled={adding || !accountNo.trim()}
              className="w-full py-2.5 bg-apple-blue hover:bg-apple-blue/90 disabled:opacity-40 text-white font-semibold rounded-apple text-sm transition-all"
            >
              {adding ? '추가 중...' : '계좌 추가'}
            </button>
            <p className="text-[11px] text-apple-label3 text-center">
              한국투자증권 MTS → 계좌 → 계좌번호 확인에서 형식을 확인하세요
            </p>
          </form>
        </div>

        {/* 계좌 목록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-apple-label3 text-xs font-medium uppercase tracking-widest">
              등록된 계좌 <span className="text-white">{accounts.length}</span>
            </p>
            <button
              onClick={() => mutate('/api/v1/accounts')}
              className="text-apple-blue text-xs font-medium"
            >
              새로고침
            </button>
          </div>

          <div className="bg-apple-surface rounded-apple-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-apple-label3 text-sm">불러오는 중...</div>
            ) : accounts.length === 0 ? (
              <div className="p-10 text-center space-y-1">
                <p className="text-apple-label2 text-sm">등록된 계좌가 없습니다</p>
                <p className="text-apple-label3 text-xs">위 폼에서 계좌번호를 추가해 주세요</p>
              </div>
            ) : (
              accounts.map((acc, i) => (
                <div key={acc.id}>
                  <div className="flex items-center gap-3.5 px-4 py-4">
                    {/* Broker avatar */}
                    <div className="w-9 h-9 rounded-full bg-apple-blue/20 flex items-center justify-center text-apple-blue text-sm font-bold flex-shrink-0">
                      {acc.broker[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white tabular-nums">{acc.account_no}</span>
                        <VerifiedBadge verified={acc.is_verified} />
                      </div>
                      <p className="text-xs text-apple-label3 mt-0.5">
                        {acc.account_name || acc.broker}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {!acc.is_verified && (
                        <button
                          onClick={() => handleVerify(acc.id)}
                          className="text-xs text-apple-blue font-medium"
                        >
                          검증
                        </button>
                      )}
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(acc.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          acc.is_active ? 'bg-apple-green' : 'bg-apple-fill'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          acc.is_active ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="text-apple-label3 hover:text-apple-red transition-colors p-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {i < accounts.length - 1 && (
                    <div className="ml-[3.75rem] border-b border-white/[0.06]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 안내 */}
        <div className="bg-apple-blue/[0.08] border border-apple-blue/20 rounded-apple-lg p-4 space-y-1.5">
          <p className="text-xs font-semibold text-white">계좌번호 확인 방법</p>
          <p className="text-xs text-apple-label2">• 한국투자증권 MTS → 전체메뉴 → 계좌 → 계좌 정보</p>
          <p className="text-xs text-apple-label2">• KIS Developers 포털 → 앱 관리 → 등록된 계좌 확인</p>
          <p className="text-xs text-apple-label2">
            • 형식: <span className="font-mono text-white">XXXXXXXX-XX</span>
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
