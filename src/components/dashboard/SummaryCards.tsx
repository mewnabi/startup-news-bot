import { CAT_URGENT, CAT_NEW, CAT_NEWS } from '@/types';

interface Props {
  counts: Record<string, number>;
  total: number;
}

const CARDS = [
  { category: CAT_URGENT, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  { category: CAT_NEW, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { category: CAT_NEWS, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
];

export default function SummaryCards({ counts, total }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ category, color, bg }) => (
        <div
          key={category}
          className={`${bg} rounded-lg p-4 border border-border`}
        >
          <p className="text-sm text-muted">{category}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>
            {counts[category] ?? 0}
          </p>
        </div>
      ))}
      <div className="bg-card rounded-lg p-4 border border-border">
        <p className="text-sm text-muted">전체 기사</p>
        <p className="text-3xl font-bold mt-1">{total}</p>
      </div>
    </div>
  );
}
