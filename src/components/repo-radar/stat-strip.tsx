import { MetricPill } from "./ui";

export type StatStripItem = {
  label: string;
  value: string | number;
};

export function StatStrip({ items }: { items: StatStripItem[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.slice(0, 6).map((item) => (
        <MetricPill key={item.label} label={item.label} value={item.value} className="bg-background" />
      ))}
    </div>
  );
}
