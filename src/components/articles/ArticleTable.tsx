import Link from 'next/link';
import type { Article } from '@/types';

interface Props {
  articles: Article[];
  page: number;
  totalPages: number;
  total: number;
}

export default function ArticleTable({ articles, page, totalPages, total }: Props) {
  if (articles.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center text-muted">
        조건에 맞는 기사가 없습니다.
      </div>
    );
  }

  return (
    <div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background">
              <tr>
                <th className="text-left px-4 py-2 text-muted font-medium">제목</th>
                <th className="text-left px-4 py-2 text-muted font-medium w-24">출처</th>
                <th className="text-left px-4 py-2 text-muted font-medium w-28">카테고리</th>
                <th className="text-left px-4 py-2 text-muted font-medium w-24">등록일</th>
                <th className="text-left px-4 py-2 text-muted font-medium w-24">마감일</th>
                <th className="text-left px-4 py-2 text-muted font-medium w-16">알림</th>
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
                  <td className="px-4 py-2 whitespace-nowrap text-xs">{article.category}</td>
                  <td className="px-4 py-2 text-muted whitespace-nowrap">{article.date}</td>
                  <td className="px-4 py-2 text-muted whitespace-nowrap">{article.deadline || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${article.notified ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted">
          총 {total}건 (페이지 {page}/{totalPages})
        </p>
        <div className="flex gap-1">
          {page > 1 && (
            <PaginationLink page={page - 1} label="이전" />
          )}
          {page < totalPages && (
            <PaginationLink page={page + 1} label="다음" />
          )}
        </div>
      </div>
    </div>
  );
}

function PaginationLink({ page, label }: { page: number; label: string }) {
  return (
    <Link
      href={`?page=${page}`}
      className="px-3 py-1 text-sm rounded border border-border bg-card hover:bg-accent/5 text-muted"
    >
      {label}
    </Link>
  );
}
