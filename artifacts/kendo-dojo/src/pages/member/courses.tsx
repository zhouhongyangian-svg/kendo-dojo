import { useState } from "react";
import {
  useListCourses,
  getListCoursesQueryKey,
  useCreateBooking,
  useCancelBooking,
  useListMyBookings,
  getListMyBookingsQueryKey,
  useListCourseLevels,
  getListCourseLevelsQueryKey,
} from "@workspace/api-client-react";
import type { CourseLevel } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  isSameMonth,
  differenceInHours,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function levelBadgeStyle(color: string) {
  return {
    backgroundColor: hexWithAlpha(color, 0.18),
    color,
    border: `1px solid ${hexWithAlpha(color, 0.4)}`,
  };
}

function levelChipStyle(color: string) {
  return {
    backgroundColor: hexWithAlpha(color, 0.22),
    color,
    border: `1px solid ${hexWithAlpha(color, 0.5)}`,
  };
}

function getLevelColor(levels: CourseLevel[], name: string): string {
  return levels.find((l) => l.name === name)?.color ?? "#6b7280";
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const CANCEL_DEADLINE_HOURS = 6;

function getCancelDeadline(scheduledAt: string): Date {
  return new Date(new Date(scheduledAt).getTime() - CANCEL_DEADLINE_HOURS * 60 * 60 * 1000);
}

function canCancel(scheduledAt: string): boolean {
  return differenceInHours(new Date(scheduledAt), new Date()) >= CANCEL_DEADLINE_HOURS;
}

export default function MemberCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: courses, isLoading } = useListCourses({ query: { queryKey: getListCoursesQueryKey() } });
  const { data: bookings } = useListMyBookings({ query: { queryKey: getListMyBookingsQueryKey() } });
  const { data: levelsData } = useListCourseLevels({ query: { queryKey: getListCourseLevelsQueryKey() } });
  const levels: CourseLevel[] = levelsData ?? [];

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
        toast({ title: "预约成功", description: "已成功预约该课程" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "预约失败", description: err?.response?.data?.error || "无法预约该课程" });
      },
    },
  });

  const cancelBooking = useCancelBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
        toast({ title: "取消成功", description: "预约已取消" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "无法取消", description: err?.response?.data?.error || "取消预约失败" });
      },
    },
  });

  if (isLoading) return <div className="text-muted-foreground p-8">加载中...</div>;

  const now = new Date();
  const upcomingCourses = courses
    ?.filter((c) => new Date(c.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()) || [];

  const confirmedBookingIds = new Set(
    bookings?.filter((b) => b.status === "confirmed").map((b) => b.courseId) ?? []
  );

  const getBookingForCourse = (courseId: number) =>
    bookings?.find((b) => b.courseId === courseId && b.status === "confirmed");

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const paddedDays: (Date | null)[] = [...Array(startPadding).fill(null), ...daysInMonth];

  const coursesOnDay = (day: Date) =>
    upcomingCourses.filter((c) => isSameDay(new Date(c.scheduledAt), day));

  const selectedDayCourses = selectedDate ? coursesOnDay(selectedDate) : [];

  const CourseCard = ({ course }: { course: (typeof upcomingCourses)[0] }) => {
    const booking = getBookingForCourse(course.id);
    const isFull = course.enrolledCount >= course.maxCapacity;
    const deadline = getCancelDeadline(course.scheduledAt);
    const cancelAllowed = canCancel(course.scheduledAt);

    return (
      <div
        data-testid={`card-course-${course.id}`}
        className={`bg-card border p-4 flex flex-col gap-3 ${booking ? "border-primary/50" : "border-border"}`}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {booking && (
              <span className="shrink-0 text-[10px] bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 font-medium">
                已预约
              </span>
            )}
            <h3 className="font-bold text-base leading-tight truncate">{course.title}</h3>
          </div>
          <span className="text-xs px-2 py-0.5 shrink-0" style={levelBadgeStyle(getLevelColor(levels, course.level ?? ""))}>
            {course.level || "—"}
          </span>
        </div>

        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        )}

        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>时间</span>
            <span className="text-foreground">
              {format(new Date(course.scheduledAt), "MM月dd日 HH:mm")}（{course.durationMinutes}分钟）
            </span>
          </div>
          <div className="flex justify-between">
            <span>指导</span>
            <span className="text-foreground">{course.instructor}</span>
          </div>
          <div className="flex justify-between">
            <span>名额</span>
            <span className={isFull ? "text-destructive" : "text-foreground"}>
              {course.enrolledCount} / {course.maxCapacity}{isFull && "（已满）"}
            </span>
          </div>
          {booking && (
            <div className="flex justify-between pt-1 border-t border-border/50">
              <span>最迟取消</span>
              <span className={cancelAllowed ? "text-amber-400" : "text-destructive"}>
                {format(deadline, "MM月dd日 HH:mm")}
                {!cancelAllowed && "（已过期）"}
              </span>
            </div>
          )}
        </div>

        {booking ? (
          cancelAllowed ? (
            <Button
              data-testid={`button-cancel-booking-${course.id}`}
              variant="outline"
              size="sm"
              className="w-full rounded-none border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive text-muted-foreground"
              onClick={() => cancelBooking.mutate({ id: booking.id })}
              disabled={cancelBooking.isPending}
            >
              取消预约
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              size="sm"
              className="w-full rounded-none border-border/40 text-muted-foreground/50 cursor-not-allowed"
            >
              距开课不足6小时，无法取消
            </Button>
          )
        ) : isFull ? (
          <Button disabled variant="outline" size="sm" className="w-full rounded-none bg-muted text-muted-foreground">
            已满员
          </Button>
        ) : (
          <Button
            data-testid={`button-book-course-${course.id}`}
            size="sm"
            onClick={() => createBooking.mutate({ data: { courseId: course.id } })}
            disabled={createBooking.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-none tracking-widest"
          >
            预约修习
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">
          课程预约
        </h1>
        <div className="flex border border-border rounded-none overflow-hidden">
          <Button
            data-testid="button-view-calendar"
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 h-8 gap-1.5 ${view === "calendar" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="size-3.5" />
            日历
          </Button>
          <Button
            data-testid="button-view-list"
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 h-8 gap-1.5 border-l border-border ${view === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setView("list")}
          >
            <List className="size-3.5" />
            列表
          </Button>
        </div>
      </div>

      {/* Cancel policy notice */}
      <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 px-4 py-3 text-sm text-amber-300">
        <span className="shrink-0 mt-0.5">提示</span>
        <span>课程预约须在开课前 <strong>6小时</strong> 前取消，逾期无法退订。</span>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <div className="space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button
              data-testid="button-prev-month"
              variant="ghost"
              size="icon"
              className="rounded-none hover:bg-muted h-8 w-8"
              onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDate(null); }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="font-bold tracking-widest text-lg">
              {format(currentMonth, "yyyy年 M月", { locale: zhCN })}
            </span>
            <Button
              data-testid="button-next-month"
              variant="ghost"
              size="icon"
              className="rounded-none hover:bg-muted h-8 w-8"
              onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDate(null); }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="border border-border">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {paddedDays.map((day, idx) => {
                if (!day) {
                  return <div key={`pad-${idx}`} className="min-h-[84px] border-r border-b border-border last:border-r-0 [&:nth-child(7n)]:border-r-0 bg-background/30" />;
                }
                const dayCourses = coursesOnDay(day);
                const bookedOnDay = dayCourses.filter((c) => confirmedBookingIds.has(c.id));
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={day.toISOString()}
                    data-testid={`cell-day-${format(day, "yyyy-MM-dd")}`}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`min-h-[84px] border-r border-b border-border [&:nth-child(7n)]:border-r-0 p-1 cursor-pointer transition-colors
                      ${isSelected ? "bg-primary/10" : "hover:bg-muted/40"}
                      ${!isCurrentMonth ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center
                        ${isToday ? "bg-primary text-primary-foreground rounded-full" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </div>
                      {/* Booking dot indicator */}
                      {bookedOnDay.length > 0 && (
                        <div className="flex gap-0.5 pr-0.5">
                          {bookedOnDay.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayCourses.slice(0, 2).map((c) => {
                        const isBooked = confirmedBookingIds.has(c.id);
                        return (
                          <div
                            key={c.id}
                            className="text-[10px] px-1 py-0.5 truncate leading-tight"
                            style={levelChipStyle(getLevelColor(levels, c.level ?? ""))}
                          >
                            {isBooked && "✓ "}{c.title}
                          </div>
                        );
                      })}
                      {dayCourses.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayCourses.length - 2} 更多
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold tracking-widest text-muted-foreground border-l-2 border-primary pl-3">
                {format(selectedDate, "M月d日", { locale: zhCN })} 的课程
              </h2>
              {selectedDayCourses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border border-border border-dashed">
                  当日无课程安排
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDayCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">已预约课程</span>
            </div>
            {levels.map((lvl) => (
              <div key={lvl.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3" style={{ backgroundColor: hexWithAlpha(lvl.color, 0.35), border: `1px solid ${hexWithAlpha(lvl.color, 0.7)}` }} />
                <span className="text-xs text-muted-foreground">{lvl.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
          {upcomingCourses.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              暂无可预约课程
            </div>
          )}
        </div>
      )}
    </div>
  );
}
