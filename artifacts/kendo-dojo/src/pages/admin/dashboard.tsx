import { useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CalendarDays, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });

  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">道场控制台</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-widest">总会员数</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-widest">活跃会员</CardTitle>
            <Activity className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeMembers || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-widest">近期排课</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingCourses || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-widest">总预约数</CardTitle>
            <CalendarDays className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border rounded-none mt-8">
        <CardHeader>
          <CardTitle className="tracking-widest">新入会员</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recentMembers?.map(member => (
              <div key={member.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">加入时间</p>
                  <p className="text-sm">{format(new Date(member.joinedAt), "yyyy-MM-dd")}</p>
                </div>
              </div>
            ))}
            {(!stats?.recentMembers || stats.recentMembers.length === 0) && (
              <p className="text-muted-foreground text-sm text-center py-4">近期无新会员加入</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
