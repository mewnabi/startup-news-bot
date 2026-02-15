import { getCategoryCounts, getRecentArticles, getLatestCrawlRun } from '@/lib/db/queries';
import SummaryCards from '@/components/dashboard/SummaryCards';
import RecentArticles from '@/components/dashboard/RecentArticles';
import CrawlStatus from '@/components/dashboard/CrawlStatus';
import CrawlButton from '@/components/dashboard/CrawlButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let counts: Record<string, number> = {};
  let total = 0;
  let recentArticles: Awaited<ReturnType<typeof getRecentArticles>> = [];
  let crawlLogs: Awaited<ReturnType<typeof getLatestCrawlRun>> = [];

  try {
    [counts, recentArticles, crawlLogs] = await Promise.all([
      getCategoryCounts(),
      getRecentArticles(10),
      getLatestCrawlRun(),
    ]);
    total = Object.values(counts).reduce((s, n) => s + n, 0);
  } catch {
    // DB 미연결 시 빈 데이터로 표시
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <CrawlButton />
      </div>

      <SummaryCards counts={counts} total={total} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentArticles articles={recentArticles} />
        </div>
        <div>
          <CrawlStatus logs={crawlLogs} />
        </div>
      </div>
    </div>
  );
}
