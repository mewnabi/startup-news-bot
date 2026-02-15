import type { CrawlLog } from '@/types';

interface Props {
  logs: CrawlLog[];
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  timeout: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function CrawlStatus({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 text-center text-muted">
        크롤 실행 이력이 없습니다.
      </div>
    );
  }

  const runTime = logs[0]?.startedAt;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold">마지막 크롤 상태</h2>
        {runTime && (
          <span className="text-xs text-muted">
            {new Date(runTime).toLocaleString('ko-KR')}
          </span>
        )}
      </div>
      <div className="divide-y divide-border">
        {logs.map((log) => (
          <div key={`${log.runId}-${log.source}`} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm">{log.source}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[log.status] ?? ''}`}>
                {log.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span>{log.articlesFound}건</span>
              <span>{log.durationMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
