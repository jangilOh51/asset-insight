import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import { fmt, fmtPct } from '@/lib/format';
import {
  createCustomAsset,
  deleteCustomAsset,
  fetchCustomAssets,
  toggleCustomAsset,
  updateCustomAsset,
} from '@/lib/api';
import type { CustomAsset, CustomAssetType } from '@/types';

const ASSET_TYPES: { code: CustomAssetType; label: string; emoji: string }[] = [
  { code: 'real_estate', label: '부동산', emoji: '🏠' },
  { code: 'deposit', label: '예금/적금', emoji: '🏦' },
  { code: 'crypto', label: '가상화폐', emoji: '₿' },
  { code: 'private_equity', label: '비상장주식', emoji: '📈' },
  { code: 'pension', label: '연금/퇴직금', emoji: '🏛️' },
  { code: 'other', label: '기타', emoji: '💼' },
];

const ASSETS_KEY = '/api/v1/assets';

interface FormState {
  name: string;
  asset_type: CustomAssetType;
  current_value_krw: string;
  purchase_value_krw: string;
  memo: string;
}

const emptyForm = (): FormState => ({
  name: '',
  asset_type: 'other',
  current_value_krw: '',
  purchase_value_krw: '',
  memo: '',
});

function assetFromForm(f: FormState) {
  return {
    name: f.name.trim(),
    asset_type: f.asset_type,
    current_value_krw: Number(f.current_value_krw) || 0,
    purchase_value_krw: Number(f.purchase_value_krw) || 0,
    memo: f.memo.trim(),
  };
}

function AssetModal({
  editing,
  onClose,
}: {
  editing: CustomAsset | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name: editing.name,
          asset_type: editing.asset_type as CustomAssetType,
          current_value_krw: String(editing.current_value_krw),
          purchase_value_krw: String(editing.purchase_value_krw),
          memo: editing.memo,
        }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('자산명을 입력해 주세요.'); return; }
    if (!form.current_value_krw || Number(form.current_value_krw) < 0) {
      setError('현재 가치를 올바르게 입력해 주세요.'); return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCustomAsset(editing.id, assetFromForm(form));
      } else {
        await createCustomAsset(assetFromForm(form));
      }
      await mutate(ASSETS_KEY);
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
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-lg font-semibold text-white mb-5">
          {editing ? '자산 수정' : '자산 추가'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 자산 유형 */}
          <div>
            <label className="text-xs text-white/50 mb-2 block">자산 유형</label>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map(t => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => set('asset_type', t.code)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    backgroundColor:
                      form.asset_type === t.code
                        ? 'rgba(6,182,212,0.2)'
                        : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.asset_type === t.code ? '#06B6D4' : 'rgba(255,255,255,0.08)'}`,
                    color: form.asset_type === t.code ? '#06B6D4' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 자산명 */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">자산명 *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              maxLength={100}
              placeholder="예: 강남 아파트"
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* 현재 가치 / 매입 가격 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">현재 가치 (₩) *</label>
              <input
                type="number"
                value={form.current_value_krw}
                onChange={e => set('current_value_krw', e.target.value)}
                min={0}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">매입 가격 (₩)</label>
              <input
                type="number"
                value={form.purchase_value_krw}
                onChange={e => set('purchase_value_krw', e.target.value)}
                min={0}
                placeholder="0"
                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">메모</label>
            <textarea
              value={form.memo}
              onChange={e => set('memo', e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="선택 사항"
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none resize-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}

          <div className="flex justify-end gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ backgroundColor: '#1A2332', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-white font-medium mb-2">자산을 삭제할까요?</p>
        <p className="text-sm text-white/50 mb-5">"{name}"이(가) 영구적으로 삭제됩니다.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm text-white/60"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#EF4444', color: '#fff' }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  onEdit,
  onDelete,
  onToggle,
}: {
  asset: CustomAsset;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const hasPnl = asset.purchase_value_krw > 0;
  const isProfit = asset.profit_loss_krw >= 0;
  const pnlColor = isProfit ? '#EF4444' : '#60A5FA';

  return (
    <div
      className="rounded-xl p-4 flex items-start gap-4 transition-opacity"
      style={{
        backgroundColor: '#1A2332',
        border: '1px solid rgba(255,255,255,0.06)',
        opacity: asset.is_active ? 1 : 0.5,
      }}
    >
      {/* 이모지 아바타 */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        {asset.emoji}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white truncate">{asset.name}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'rgba(6,182,212,0.12)', color: '#06B6D4' }}
          >
            {asset.asset_type_label}
          </span>
        </div>
        <p className="text-base font-semibold text-white font-mono">{fmt(asset.current_value_krw)}</p>
        {hasPnl && (
          <p className="text-xs font-mono mt-0.5" style={{ color: pnlColor }}>
            {isProfit ? '+' : ''}{fmt(asset.profit_loss_krw)} ({fmtPct(asset.return_pct)})
          </p>
        )}
        {asset.memo && <p className="text-xs text-white/40 mt-1 truncate">{asset.memo}</p>}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* 활성/비활성 토글 */}
        <button
          onClick={onToggle}
          title={asset.is_active ? '비활성화' : '활성화'}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: asset.is_active ? '#06B6D4' : 'rgba(255,255,255,0.3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {asset.is_active
              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
            }
          </svg>
        </button>
        {/* 수정 */}
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        {/* 삭제 */}
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const { data: assets, error, isLoading } = useSWR<CustomAsset[]>(ASSETS_KEY, fetchCustomAssets);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomAsset | null>(null);
  const [deleting, setDeleting] = useState<CustomAsset | null>(null);

  const totalValue = assets?.filter(a => a.is_active).reduce((s, a) => s + a.current_value_krw, 0) ?? 0;
  const totalPnl = assets?.filter(a => a.is_active && a.purchase_value_krw > 0).reduce((s, a) => s + a.profit_loss_krw, 0) ?? 0;
  const count = assets?.length ?? 0;

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteCustomAsset(deleting.id);
    await mutate(ASSETS_KEY);
    setDeleting(null);
  };

  const handleToggle = async (id: string) => {
    await toggleCustomAsset(id);
    await mutate(ASSETS_KEY);
  };

  const openAdd = () => { setEditing(null); setShowModal(true); };
  const openEdit = (a: CustomAsset) => { setEditing(a); setShowModal(true); };

  return (
    <AppLayout title="수동 자산" right={
      <button
        onClick={openAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
        style={{ backgroundColor: '#06B6D4', color: '#0B111B' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        자산 추가
      </button>
    }>
      <div className="max-w-2xl mx-auto py-4 px-4 flex flex-col gap-4">

        {/* 통계 요약 */}
        <div
          className="grid grid-cols-3 gap-3 rounded-xl p-4"
          style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-xs text-white/40 mb-1">수동 자산 총액</p>
            <p className="text-base font-semibold text-white font-mono">{fmt(totalValue)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-1">자산 수</p>
            <p className="text-base font-semibold text-white font-mono">{count}개</p>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-1">총 손익</p>
            <p
              className="text-base font-semibold font-mono"
              style={{ color: totalPnl >= 0 ? '#EF4444' : '#60A5FA' }}
            >
              {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
            </p>
          </div>
        </div>

        {/* 목록 */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <p className="text-sm text-white/40">데이터를 불러오지 못했습니다.</p>
          </div>
        )}

        {!isLoading && !error && assets?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-4xl">💼</div>
            <p className="text-sm text-white/40">등록된 수동 자산이 없습니다.</p>
            <button
              onClick={openAdd}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#06B6D4', color: '#0B111B' }}
            >
              자산 추가하기
            </button>
          </div>
        )}

        {assets && assets.length > 0 && (
          <div className="flex flex-col gap-3">
            {assets.map(a => (
              <AssetCard
                key={a.id}
                asset={a}
                onEdit={() => openEdit(a)}
                onDelete={() => setDeleting(a)}
                onToggle={() => handleToggle(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AssetModal
          editing={editing}
          onClose={() => setShowModal(false)}
        />
      )}

      {deleting && (
        <DeleteConfirm
          name={deleting.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </AppLayout>
  );
}
