export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[6px] font-bold text-[12px] tracking-[-0.02em] shrink-0"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, var(--fl-brand) 0%, var(--fl-brand-2) 100%)",
        boxShadow:
          "0 0 0 1px var(--fl-brand-glow), 0 0 12px -2px var(--fl-brand-glow)",
        color: "var(--fl-on-brand)",
      }}
    >
      f
    </div>
  );
}
