import { useState } from "react";
import {
  useListMyBookings,
  getListMyBookingsQueryKey,
  useCancelBooking,
  getListCoursesQueryKey,
  useListCourseLevels,
  getListCourseLevelsQueryKey,
  type CourseLevel,
} from "@workspace/api-client-react";
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

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const CANCEL_HOURS = 6;

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getLevelColor(levels: CourseLevel[], name: string): string {
  return levels.find((l) => l.name === name)?.color ?? "#3b5bdb";
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

function canCancel(scheduledAt: string) {
  return differenceInHours(new Date(scheduledAt), new Date()) >= CANCEL_HOURS;
}

export default function MemberBookings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: bookings, isLoading } = useListMyBookings({
    query: { queryKey: getListMyBookingsQueryKey() },
  });
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: levelsData } = useListCourseLevels({ query: { queryKey: getListCourseLevelsQueryKey() } });
  const levels: CourseLevel[] = levelsData ?? [];

  const cancelBooking = useCancelBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "取消成功", description: "预约已取消" });
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "无法取消",
          description: err?.response?.data?.error || "取消预约失败",
        });
      },
    },
  });

  if (isLoading) return <div className="text-muted-foreground p-8">加载中...</div>;

  const now = new Date();
  const confirmed = bookings?.filter((b) => b.status === "confirmed" && b.course) ?? [];
  const upcoming = confirmed.filter((b) => new Date(b.course!.scheduledAt) > now);
  const past = bookings?.filter((b) => b.course && new Date(b.course.scheduledAt) <= now) ?? [];
  const cancelled = bookings?.filter((b) => b.status === "cancelled") ?? [];

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const paddedDays: (Date | null)[] = [...Array(startPadding).fill(null), ...daysInMonth];

  const bookingsOnDay = (day: Date) =>
    (bookings ?? []).filter(
      (b) => b.course && b.status === "confirmed" && isSameDay(new Date(b.course.scheduledAt), day)
    );

  const selectedDayBookings = selectedDate ? bookingsOnDay(selectedDate) : [];

  const CancelButton = ({ booking }: { booking: NonNullable<typeof bookings>[0] }) => {
    if (!booking.course) return null;
    const ok = canCancel(booking.course.scheduledAt);
    return ok ? (
      <Button
        variant="outline"
        size="sm"
        className="rounded-none border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive text-muted-foreground shrink-0"
        onClick={() => cancelBooking.mutate({ id: booking.id })}
        disabled={cancelBooking.isPending}
      >
        取消预约
      </Button>
    ) : (
      <span className="text-xs text-muted-foreground/60 shrink-0">开课前6小时内不可取消</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">
          我的预约
        </h1>
        <div className="flex border border-border rounded-none overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 h-8 gap-1.5 ${
              view === "calendar"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="size-3.5" />
            日历
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none px-3 h-8 gap-1.5 border-l border-border ${
              view === "list"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setView("list")}
          >
            <List className="size-3.5" />
            列表
          </Button>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-8">
          {/* Upcoming confirmed */}
          <div>
            <h2 className="text-lg font-bold mb-4 tracking-widest text-muted-foreground">
              即将到来
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 border border-border border-dashed text-center">
                暂无即将到来的预约
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming
                  .sort(
                    (a, b) =>
                      new Date(a.course!.scheduledAt).getTime() -
                      new Date(b.course!.scheduledAt).getTime()
                  )
                  .map((booking) => {
                    const color = getLevelColor(levels, booking.course?.level ?? "");
                    return (
                    <div
                      key={booking.id}
                      className="bg-card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                      style={{ border: `1px solid ${hexWithAlpha(color, 0.35)}` }}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5" style={levelBadgeStyle(color)}>
                            {booking.course?.level || "已预约"}
                          </span>
                          <h3 className="font-bold truncate">{booking.course?.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.course?.scheduledAt
                            ? format(new Date(booking.course.scheduledAt), "yyyy年MM月dd日 HH:mm", {
                                locale: zhCN,
                              })
                            : ""}
                          {booking.course?.durationMinutes
                            ? `（${booking.course.durationMinutes}分钟）`
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          指导: {booking.course?.instructor}
                          {booking.course?.scheduledAt && (
                            <span className="ml-3 text-amber-400/80">
                              最迟{" "}
                              {format(
                                new Date(
                                  new Date(booking.course.scheduledAt).getTime() -
                                    CANCEL_HOURS * 3600000
                                ),
                                "MM月dd日 HH:mm"
                              )}{" "}
                              前可取消
                            </span>
                          )}
                        </p>
                      </div>
                      <CancelButton booking={booking} />
                    </div>
                  );
                  })}
              </div>
            )}
          </div>

          {/* Past */}
          <div>
            <h2 className="text-lg font-bold mb-4 tracking-widest text-muted-foreground">
              历史记录
            </h2>
            {past.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无历史记录</p>
            ) : (
              <div className="space-y-2 opacity-70">
                {past
                  .sort(
                    (a, b) =>
                      new Date(b.course!.scheduledAt).getTime() -
                      new Date(a.course!.scheduledAt).getTime()
                  )
                  .map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-background border border-border p-3 flex justify-between items-center"
                    >
                      <div>
                        <h3 className="font-bold text-sm">{booking.course?.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {booking.course?.scheduledAt
                            ? format(new Date(booking.course.scheduledAt), "yyyy-MM-dd HH:mm")
                            : ""}
                          {" · "}
                          {booking.course?.instructor}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 ${
                          booking.status === "confirmed"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {booking.status === "confirmed" ? "已参加" : "已取消"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Cancelled */}
          {cancelled.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4 tracking-widest text-muted-foreground">
                已取消
              </h2>
              <div className="space-y-2 opacity-50">
                {cancelled.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-background border border-border p-3 flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-sm line-through text-muted-foreground">
                        {booking.course?.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {booking.course?.scheduledAt
                          ? format(new Date(booking.course.scheduledAt), "yyyy-MM-dd HH:mm")
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs text-destructive/70">已取消</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR VIEW ─────────────────────────────────────── */}
      {view === "calendar" && (
        <div className="space-y-4">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none hover:bg-muted h-8 w-8"
              onClick={() => {
                setCurrentMonth(subMonths(currentMonth, 1));
                setSelectedDate(null);
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="font-bold tracking-widest text-lg">
              {format(currentMonth, "yyyy年 M月", { locale: zhCN })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none hover:bg-muted h-8 w-8"
              onClick={() => {
                setCurrentMonth(addMonths(currentMonth, 1));
                setSelectedDate(null);
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Grid */}
          <div className="border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/20">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {paddedDays.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`pad-${idx}`}
                      className="min-h-[84px] border-r border-b border-border [&:nth-child(7n)]:border-r-0 bg-background/20"
                    />
                  );
                }
                const dayBookings = bookingsOnDay(day);
                const isToday = isSameDay(day, now);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const inMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`min-h-[84px] border-r border-b border-border [&:nth-child(7n)]:border-r-0 p-1 cursor-pointer transition-colors
                      ${isSelected ? "bg-primary/10 ring-1 ring-primary/30 ring-inset" : "hover:bg-muted/40"}
                      ${!inMonth ? "opacity-30" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center ${
                          isToday
                            ? "bg-primary text-primary-foreground rounded-full"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                      {dayBookings.length > 0 && (
                        <div className="flex gap-0.5 pr-0.5">
                          {dayBookings.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 2).map((b) => {
                        const c = getLevelColor(levels, b.course?.level ?? "");
                        return (
                        <div
                          key={b.id}
                          className="text-[10px] px-1 py-0.5 truncate leading-tight"
                          style={levelChipStyle(c)}
                        >
                          ✓ {format(new Date(b.course!.scheduledAt), "HH:mm")} {b.course?.title}
                        </div>
                        );
                      })}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayBookings.length - 2} 更多
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 text-sm text-muted-foreground pt-1">
            <span>
              本月预约:{" "}
              <strong className="text-foreground">
                {
                  (bookings ?? []).filter(
                    (b) =>
                      b.status === "confirmed" &&
                      b.course &&
                      isSameMonth(new Date(b.course.scheduledAt), currentMonth)
                  ).length
                }
              </strong>{" "}
              节
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs">已预约课程</span>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div className="space-y-3 border-t border-border pt-4">
              <h2 className="text-sm font-bold tracking-widest text-muted-foreground border-l-2 border-primary pl-3">
                {format(selectedDate, "M月d日 (EEEE)", { locale: zhCN })}
              </h2>
              {selectedDayBookings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border border-border border-dashed">
                  当日无预约课程
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings
                    .sort(
                      (a, b) =>
                        new Date(a.course!.scheduledAt).getTime() -
                        new Date(b.course!.scheduledAt).getTime()
                    )
                    .map((booking) => {
                      const color = getLevelColor(levels, booking.course?.level ?? "");
                      return (
                      <div
                        key={booking.id}
                        className="bg-card p-4 flex justify-between items-center gap-3"
                        style={{ border: `1px solid ${hexWithAlpha(color, 0.35)}` }}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold shrink-0" style={{ color }}>
                              {format(new Date(booking.course!.scheduledAt), "HH:mm")}
                            </span>
                            <h3 className="font-bold truncate">{booking.course?.title}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {booking.course?.durationMinutes}分钟 · 指导: {booking.course?.instructor}
                          </p>
                          {booking.course?.scheduledAt && (
                            <p className="text-xs text-amber-400/80">
                              最迟{" "}
                              {format(
                                new Date(
                                  new Date(booking.course.scheduledAt).getTime() -
                                    CANCEL_HOURS * 3600000
                                ),
                                "HH:mm"
                              )}{" "}
                              前可取消
                            </p>
                          )}
                        </div>
                        <CancelButton booking={booking} />
                      </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
