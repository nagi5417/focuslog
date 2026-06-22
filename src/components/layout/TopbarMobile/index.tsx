import { BrandMark } from "@/components/layout/BrandMark";

export function TopbarMobile() {
  return (
    <header
      className="flex items-center gap-[12px] px-[16px] py-[12px] border-b"
      style={{ background: "var(--fl-panel)", borderColor: "var(--fl-border)" }}
    >
      <BrandMark size={24} />
      <span
        className="text-[15px] font-semibold"
        style={{ color: "var(--fl-text)" }}
      >
        focuslog
      </span>
      <span
        className="ml-auto font-mono text-[9.5px] tracking-[0.08em] uppercase px-[6px] py-[2px] rounded-[4px] border"
        style={{
          color: "var(--fl-text-subtle)",
          borderColor: "var(--fl-border)",
        }}
      >
        v1.0
      </span>
    </header>
  );
}
