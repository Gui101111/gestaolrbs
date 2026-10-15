import { JusticeScale } from "@/components/landing/justice-scale";

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink p-8">
      <JusticeScale className="w-[min(92vw,640px)]" />
    </main>
  );
}
