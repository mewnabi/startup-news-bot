import type { Article } from '@/types';

interface Props {
  articles: Article[];
}

export default function RecentArticles({ articles }: Props) {
  if (articles.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 text-center text-muted">
        수집된 기사가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold">최근 기사</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background">
            <tr>
              <th className="text-left px-4 py-2 text-muted font-medium">제목</th>
              <th className="text-left px-4 py-2 text-muted font-medium w-24">출처</th>
              <th className="text-left px-4 py-2 text-muted font-medium w-24">카테고리</th>
              <th className="text-left px-4 py-2 text-muted font-medium w-24">날짜</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.url} className="border-t border-border hover:bg-accent/5">
                <td className="px-4 py-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline line-clamp-1"
                  >
                    {article.title}
                  </a>
                </td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">{article.source}</td>
                <td className="px-4 py-2 whitespace-nowrap">{article.category}</td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">{article.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
