"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { updateTimeEntry } from "@/lib/actions/log";
import { parseJstTimeToUtc, toJstHM } from "@/lib/jst";
import type { TimeEntryBlock } from "@/types/report";

const POP_W = 280;
const GAP = 8;
const PAD = 12;

type Props = {
  block: TimeEntryBlock;
  anchor: HTMLDivElement;
  onClose: () => void;
  onSave: (updated: TimeEntryBlock) => void;
};

export function EditPopover({ block, anchor, onClose, onSave }: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });
  const [startVal, setStartVal] = useState(() => toJstHM(block.startedAtMs));
  const [endVal, setEndVal] = useState(() => toJstHM(block.endedAtMs));
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    const popH = popRef.current?.getBoundingClientRect().height ?? 240;
    const rect = anchor.getBoundingClientRect();

    let left: number;
    if (rect.right + GAP + POP_W <= window.innerWidth - PAD) {
      left = rect.right + GAP;
    } else if (rect.left - GAP - POP_W >= PAD) {
      left = rect.left - GAP - POP_W;
    } else {
      left = Math.max(
        PAD,
        Math.min(window.innerWidth - POP_W - PAD, rect.left),
      );
    }

    let top = rect.top;
    if (top + popH > window.innerHeight - PAD)
      top = window.innerHeight - popH - PAD;
    if (top < PAD) top = PAD;

    setPos({ top, left, ready: true });
  }, [anchor]);

  async function handleSave() {
    const newStart = parseJstTimeToUtc(startVal, block.startedAtMs);
    const newEnd = parseJstTimeToUtc(endVal, block.startedAtMs);

    setSaving(true);
    const result = await updateTimeEntry(block.id, newStart, newEnd);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onSave(result.data);
    onClose();
  }

  return (
    <div
      ref={popRef}
      className="edit-pop"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        visibility: pos.ready ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>時刻を編集</h4>
      <div
        style={{
          fontSize: 13,
          color: "var(--fl-text)",
          fontWeight: 500,
          marginTop: -4,
        }}
      >
        {block.title}
      </div>

      <div className="edit-pop-time-grid">
        <div className="field">
          <label>開始</label>
          <input
            className="mono"
            type="time"
            value={startVal}
            onChange={(e) => setStartVal(e.target.value)}
          />
        </div>
        <div className="field">
          <label>終了</label>
          <input
            className="mono"
            type="time"
            value={endVal}
            onChange={(e) => setEndVal(e.target.value)}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 4,
        }}
      >
        <button
          onClick={onClose}
          disabled={saving}
          className="flex items-center h-[28px] px-3 rounded-[6px] border text-[12px] font-[500] cursor-pointer transition-colors duration-[80ms] hover:bg-[var(--fl-hover)]"
          style={{
            borderColor: "var(--fl-border)",
            color: "var(--fl-text-muted)",
            background: "transparent",
          }}
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center h-[28px] px-3 rounded-[6px] text-[12px] font-[500] cursor-pointer transition-opacity duration-[80ms] disabled:opacity-50"
          style={{
            background: "var(--fl-brand)",
            color: "var(--fl-on-brand)",
          }}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
