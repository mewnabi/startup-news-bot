import { getCrawlLogs } from '@/lib/db/queries';
import type { CrawlLog } from '@/types';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  timeout: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default async function CrawlLogsPage() {
  let logs: CrawlLog[] = [];

  try {
    logs = await getCrawlLogs(100);
  } catch {
    // DB 미연결 시 빈 데이터
  }

  // run_id별 그룹화
  const grouped = new Map<string, CrawlLog[]>();
  for (const log of logs) {
    const existing = grouped.get(log.runId) ?? [];
    existing.push(log);
    grouped.set(log.runId, existing);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">크롤 이력</h1>

      {grouped.size === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted">
          크롤 실행 이력이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([runId, runLogs]) => {
            const totalFound = runLogs.reduce((s, l) => s + l.articlesFound, 0);
            const totalNew = runLogs.reduce((s, l) => s + l.articlesNew, 0);
            const startTime = runLogs[0]?.startedAt;

            return (
              <div key={runId} className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted">{runId.slice(0, 8)}</span>
                    <span className="text-sm">
                      {totalFound}건 수집 / {totalNew}건 신규
                    </span>
                  </div>
                  {startTime && (
                    <span className="text-xs text-muted">
                      {new Date(startTime).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {runLogs.map((log) => (
                    <div key={`${log.runId}-${log.source}`} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium w-24">{log.source}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[log.status] ?? ''}`}>
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <span className="text-xs text-red-500 truncate max-w-xs">
                            {log.errorMessage}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-muted">
                        <span>{log.articlesFound}건</span>
                        <span>{log.durationMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
