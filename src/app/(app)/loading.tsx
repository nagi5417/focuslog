export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="w-[32px] h-[32px] rounded-full border-[2px] border-t-transparent animate-spin"
        style={{
          borderColor: "var(--fl-brand)",
          borderTopColor: "transparent",
        }}
      />
    </div>
  );
}
