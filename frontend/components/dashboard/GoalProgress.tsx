import { useState } from 'react';
import { mutate } from 'swr';
import { deleteActiveGoal, upsertActiveGoal } from '@/lib/api';
import { fmt } from '@/lib/format';
import type { InvestmentGoal } from '@/types';

const GOAL_KEY = '/api/v1/goals/active';

interface Props {
  goal: InvestmentGoal | null;
  totalAsset: number;
}

function GoalModal({ goal, onClose }: { goal: InvestmentGoal | null; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? '');
  const [amount, setAmount] = useState(goal ? String(goal.target_amount_krw) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('목표명을 입력해 주세요.'); return; }
    const num = Number(amount);
    if (!num || num <= 0) { setError('목표 금액을 올바르게 입력해 주세요.'); return; }
    setSaving(true);
    try {
      await upsertActiveGoal({ name: name.trim(), target_amount_krw: num });
      await mutate(GOAL_KEY);
      onClose();
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-base font-semibold text-white mb-4">
          {goal ? '목표 수정' : '투자 목표 설정'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">목표명</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              placeholder="예: 1억 달성"
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">목표 금액 (₩)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min={1}
              placeholder="100000000"
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none font-mono"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button" onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm text-white/60"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              취소
            </button>
            <button
              type="submit" disabled={saving}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#06B6D4', color: '#0B111B', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GoalProgress({ goal, totalAsset }: Props) {
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async () => {
    await deleteActiveGoal();
    await mutate(GOAL_KEY);
  };

  if (!goal) {
    return (
      <>
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ backgroundColor: '#1A2332', border: '1px solid #2A3F55' }}
        >
          <div>
            <p className="text-xs text-white/40 mb-0.5">투자 목표</p>
            <p className="text-sm text-white/60">설정된 목표가 없습니다.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
            style={{ backgroundColor: 'rgba(6,182,212,0.12)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)' }}
          >
            목표 설정
          </button>
        </div>
        {showModal && <GoalModal goal={null} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const pct = Math.min((totalAsset / goal.target_amount_krw) * 100, 100);
  const remaining = Math.max(goal.target_amount_krw - totalAsset, 0);
  const done = totalAsset >= goal.target_amount_krw;

  return (
    <>
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: '#1A2332', border: '1px solid #2A3F55' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-white/40 mb-0.5">투자 목표</p>
            <p className="text-sm font-medium text-white">{goal.name}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowModal(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-mono text-white/60">{fmt(totalAsset)}</span>
            <span className="font-mono text-white/40">{fmt(goal.target_amount_krw)}</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: done ? '#06B6D4' : '#EF4444',
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-lg font-semibold font-mono"
            style={{ color: done ? '#06B6D4' : '#F9FAFB' }}
          >
            {pct.toFixed(1)}%
          </span>
          {done ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: '#06B6D4' }}>
              목표 달성 🎉
            </span>
          ) : (
            <span className="text-xs text-white/40 font-mono">
              {fmt(remaining)} 남음
            </span>
          )}
        </div>
      </div>

      {showModal && <GoalModal goal={goal} onClose={() => setShowModal(false)} />}
    </>
  );
}
