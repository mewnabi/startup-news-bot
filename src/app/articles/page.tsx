import { Suspense } from 'react';
import { getArticles, getSourceList } from '@/lib/db/queries';
import ArticleTable from '@/components/articles/ArticleTable';
import CategoryFilter from '@/components/articles/CategoryFilter';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{
    category?: string;
    source?: string;
    notified?: string;
    page?: string;
  }>;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category;
  const source = params.source;
  const notifiedParam = params.notified;
  const page = Math.max(1, Number(params.page ?? '1'));

  let notified: boolean | undefined;
  if (notifiedParam === 'true') notified = true;
  if (notifiedParam === 'false') notified = false;

  let result = { articles: [] as Awaited<ReturnType<typeof getArticles>>['articles'], total: 0, page: 1, totalPages: 1 };
  let sources: string[] = [];

  try {
    [result, sources] = await Promise.all([
      getArticles({ category, source, notified, page, limit: 20 }),
      getSourceList(),
    ]);
  } catch {
    // DB 미연결 시 빈 데이터
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">기사 목록</h1>

      <Suspense fallback={null}>
        <CategoryFilter sources={sources} />
      </Suspense>

      <ArticleTable
        articles={result.articles}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
      />
    </div>
  );
}
