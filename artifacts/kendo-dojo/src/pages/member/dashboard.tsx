import { useAuth } from "@/contexts/auth-context";
import { useListUpcomingCourses, getListUpcomingCoursesQueryKey, useListMyBookings, getListMyBookingsQueryKey, useListAnnouncements, getListAnnouncementsQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function MemberDashboard() {
  const { member } = useAuth();
  const { data: upcomingCourses } = useListUpcomingCourses({ query: { queryKey: getListUpcomingCoursesQueryKey() } });
  const { data: myBookings } = useListMyBookings({ query: { queryKey: getListMyBookingsQueryKey() } });
  const { data: announcements } = useListAnnouncements({ query: { queryKey: getListAnnouncementsQueryKey() } });

  const activeBookings = myBookings?.filter(b => b.status === "confirmed") || [];
  const pinnedAnnouncements = announcements?.filter(a => a.isPinned) || [];
  const recentAnnouncements = announcements?.filter(a => !a.isPinned).slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">我的道场</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="tracking-widest">近期预约课程</CardTitle>
          </CardHeader>
          <CardContent>
            {activeBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无预约课程</p>
                <Button asChild variant="outline" className="mt-4 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Link href="/courses">浏览课程</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBookings.slice(0, 5).map(booking => (
                  <div key={booking.id} className="flex justify-between items-center p-4 bg-background border border-border">
                    <div>
                      <p className="font-bold">{booking.course?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.course?.scheduledAt ? format(new Date(booking.course.scheduledAt), "yyyy-MM-dd HH:mm") : ""} · 指导: {booking.course?.instructor}
                      </p>
                    </div>
                  </div>
                ))}
                {activeBookings.length > 5 && (
                  <div className="text-center">
                    <Button asChild variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                      <Link href="/bookings">查看全部</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="tracking-widest">道场公告</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pinnedAnnouncements.map(announcement => (
              <div key={announcement.id} className="p-3 border-l-2 border-secondary bg-secondary/5">
                <p className="font-bold text-sm">{announcement.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{announcement.content}</p>
              </div>
            ))}
            {recentAnnouncements.map(announcement => (
              <div key={announcement.id} className="p-3 border-l-2 border-border bg-background">
                <p className="font-bold text-sm">{announcement.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{announcement.content}</p>
              </div>
            ))}
            <div className="text-center pt-2">
              <Button asChild variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 w-full">
                <Link href="/announcements">查看更多</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
