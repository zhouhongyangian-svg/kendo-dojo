import { useListAnnouncements, getListAnnouncementsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function MemberAnnouncements() {
  const { data: announcements, isLoading } = useListAnnouncements({ query: { queryKey: getListAnnouncementsQueryKey() } });

  if (isLoading) return <div>加载中...</div>;

  const published = announcements?.filter(a => a.isPublished) || [];
  const pinned = published.filter(a => a.isPinned);
  const regular = published.filter(a => !a.isPinned);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">道场公告</h1>
      </div>

      <div className="space-y-6">
        {pinned.map(a => (
          <div key={a.id} className="bg-card border border-secondary p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-sm">置顶</span>
                {a.title}
              </h2>
              <span className="text-sm text-muted-foreground">{format(new Date(a.createdAt), "yyyy-MM-dd")}</span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}

        {regular.map(a => (
          <div key={a.id} className="bg-background border border-border p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{a.title}</h2>
              <span className="text-sm text-muted-foreground">{format(new Date(a.createdAt), "yyyy-MM-dd")}</span>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{a.content}</p>
          </div>
        ))}

        {(!announcements || announcements.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            暂无公告
          </div>
        )}
      </div>
    </div>
  );
}
