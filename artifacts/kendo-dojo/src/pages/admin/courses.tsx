import { useState } from "react";
import {
  useListCourses,
  getListCoursesQueryKey,
  useCreateCourse,
  useDeleteCourse,
  useListCourseLevels,
  getListCourseLevelsQueryKey,
  useCreateCourseLevel,
  useUpdateCourseLevel,
  useDeleteCourseLevel,
} from "@workspace/api-client-react";
import type { CourseLevel } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, List, Settings2, Pencil, Trash2, Plus, Check, X } from "lucide-react";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#a8a29e", "#e2e8f0",
];

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function hexWithAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
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
    borderColor: hexWithAlpha(color, 0.5),
    border: `1px solid ${hexWithAlpha(color, 0.5)}`,
  };
}

function getLevelColor(levels: CourseLevel[], name: string): string {
  return levels.find((l) => l.name === name)?.color ?? "#6b7280";
}

const courseSchema = z.object({
  title: z.string().min(1, "请输入课程名称"),
  description: z.string().optional(),
  instructor: z.string().min(1, "请输入指导老师"),
  scheduledAt: z.string().min(1, "请选择时间"),
  durationMinutes: z.coerce.number().min(15, "最少15分钟"),
  maxCapacity: z.coerce.number().min(1, "最少1人"),
  level: z.string().default("全部"),
});

type CourseFormValues = z.infer<typeof courseSchema>;

function EnrollmentBar({ enrolled, max }: { enrolled: number; max: number }) {
  const pct = max > 0 ? Math.min((enrolled / max) * 100, 100) : 0;
  const color =
    pct >= 100 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">预约人数</span>
        <span className={pct >= 100 ? "text-destructive font-medium" : pct >= 75 ? "text-amber-400 font-medium" : "text-foreground"}>
          {enrolled} / {max}{pct >= 100 && " 已满"}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-none overflow-hidden">
        <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110"
          style={{ backgroundColor: c, borderColor: value === c ? "white" : "transparent", boxShadow: value === c ? `0 0 0 2px ${c}` : "none" }}
          title={c}
        >
          {value === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
        </button>
      ))}
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent p-0"
          title="自定义颜色"
        />
        <span className="text-xs text-muted-foreground">自定义</span>
      </div>
    </div>
  );
}

function LevelManageDialog({
  open,
  onClose,
  levels,
}: {
  open: boolean;
  onClose: () => void;
  levels: CourseLevel[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const createLevel = useCreateCourseLevel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCourseLevelsQueryKey() });
        toast({ title: "已添加", description: `种类「${newName}」已创建` });
        setNewName("");
        setNewColor("#6366f1");
        setShowAddForm(false);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "添加失败", description: err?.response?.data?.error || "操作失败" });
      },
    },
  });

  const updateLevel = useUpdateCourseLevel({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCourseLevelsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "已更新" });
        setEditingId(null);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "更新失败", description: err?.response?.data?.error || "操作失败" });
      },
    },
  });

  const deleteLevel = useDeleteCourseLevel({
    mutation: {
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: getListCourseLevelsQueryKey() });
        toast({ title: "已删除" });
        setDeletingId(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "删除失败" });
        setDeletingId(null);
      },
    },
  });

  const startEdit = (level: CourseLevel) => {
    setEditingId(level.id);
    setEditName(level.name);
    setEditColor(level.color);
  };

  const confirmEdit = (id: number) => {
    if (!editName.trim()) return;
    updateLevel.mutate({ id, data: { name: editName.trim(), color: editColor } });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="bg-card border-border rounded-none sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="tracking-widest flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              课程种类管理
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {levels.map((level) => (
              <div key={level.id} className="border border-border bg-background p-3 space-y-2">
                {editingId === level.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-none border-border bg-card h-8 text-sm flex-1"
                        placeholder="种类名称"
                        onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(level.id); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                      />
                      <Button size="icon" className="h-8 w-8 rounded-none bg-primary hover:bg-primary/90" onClick={() => confirmEdit(level.id)} disabled={updateLevel.isPending}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: level.color }} />
                    <span
                      className="text-sm px-2 py-0.5 font-medium"
                      style={levelBadgeStyle(level.color)}
                    >
                      {level.name}
                    </span>
                    <span className="text-xs text-muted-foreground/60 font-mono ml-1">{level.color}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none text-muted-foreground hover:text-foreground" onClick={() => startEdit(level)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-none text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(level.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add new */}
            {showAddForm ? (
              <div className="border border-primary/30 bg-primary/5 p-3 space-y-3">
                <p className="text-xs text-muted-foreground font-medium tracking-wider">新增种类</p>
                <div className="flex gap-2 items-center">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: newColor }} />
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-none border-border bg-card h-8 text-sm flex-1"
                    placeholder="输入种类名称，如：三段"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowAddForm(false); setNewName(""); } }}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-none bg-primary hover:bg-primary/90"
                    onClick={() => { if (newName.trim()) createLevel.mutate({ data: { name: newName.trim(), color: newColor } }); }}
                    disabled={!newName.trim() || createLevel.isPending}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-none" onClick={() => { setShowAddForm(false); setNewName(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
            ) : (
              <button
                className="w-full border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors py-2.5 text-sm flex items-center justify-center gap-2"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4" />
                添加种类
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent className="bg-card border-border rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-widest">确认删除种类？</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              此操作不会删除已有课程，现有课程的种类标签将保留原名称文字。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-border bg-transparent hover:bg-muted" onClick={() => setDeletingId(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deletingId) deleteLevel.mutate({ id: deletingId }); }}
            >
              {deleteLevel.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: courses, isLoading } = useListCourses({
    query: { queryKey: getListCoursesQueryKey() },
  });
  const { data: levelsData } = useListCourseLevels({
    query: { queryKey: getListCourseLevelsQueryKey() },
  });
  const levels: CourseLevel[] = levelsData ?? [];

  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [isOpen, setIsOpen] = useState(false);
  const [levelMgmtOpen, setLevelMgmtOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const createCourse = useCreateCourse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "排课成功", description: "新课程已发布" });
        setIsOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ variant: "destructive", title: "排课失败", description: "请检查填写内容" });
      },
    },
  });

  const deleteCourse = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        toast({ title: "删除成功", description: "课程已移除" });
        setDeleteTarget(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "删除失败", description: "无法删除该课程" });
        setDeleteTarget(null);
      },
    },
  });

  const defaultLevel = levels[0]?.name ?? "全部";

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      instructor: "",
      scheduledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      durationMinutes: 90,
      maxCapacity: 20,
      level: defaultLevel,
    },
  });

  const openAddDialog = (date?: Date) => {
    if (date) {
      const localStr = format(date, "yyyy-MM-dd") + "T09:00";
      form.setValue("scheduledAt", localStr);
    }
    form.setValue("level", levels[0]?.name ?? "全部");
    setIsOpen(true);
  };

  const onSubmit = (data: CourseFormValues) => {
    const isoDate = new Date(data.scheduledAt).toISOString();
    createCourse.mutate({ data: { ...data, scheduledAt: isoDate } });
  };

  if (isLoading) return <div className="text-muted-foreground p-8">加载中...</div>;

  const allCourses = courses ?? [];
  const now = new Date();
  const upcomingCourses = allCourses
    .filter((c) => new Date(c.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const pastCourses = allCourses
    .filter((c) => new Date(c.scheduledAt) <= now)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const paddedDays: (Date | null)[] = [...Array(startPadding).fill(null), ...daysInMonth];

  const coursesOnDay = (day: Date) =>
    allCourses.filter((c) => isSameDay(new Date(c.scheduledAt), day));

  const selectedDayCourses = selectedDate ? coursesOnDay(selectedDate) : [];

  const CourseFormDialog = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-card border-border rounded-none sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-widest">新课程安排</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>课程名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: 剑道基础班" {...field} className="rounded-none border-border bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>指导老师</FormLabel>
                  <FormControl>
                    <Input placeholder="输入老师姓名" {...field} className="rounded-none border-border bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>开课时间</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="rounded-none border-border bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>时长（分钟）</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-none border-border bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名额限制</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-none border-border bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>课程种类</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none border-border bg-background">
                          <SelectValue placeholder="选择种类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border-border bg-card">
                        {levels.map((l) => (
                          <SelectItem key={l.id} value={l.name}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                              {l.name}
                            </div>
                          </SelectItem>
                        ))}
                        {levels.length === 0 && (
                          <SelectItem value="全部">全部</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>课程说明（可选）</FormLabel>
                  <FormControl>
                    <Textarea placeholder="输入说明..." {...field} className="rounded-none border-border bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-4">
              <Button
                type="submit"
                disabled={createCourse.isPending}
                className="w-full bg-primary hover:bg-primary/90 rounded-none tracking-widest"
              >
                {createCourse.isPending ? "提交中..." : "确认排课"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">排课管理</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-border rounded-none overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none px-3 h-8 gap-1.5 ${view === "calendar" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="size-3.5" />
              日历
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none px-3 h-8 gap-1.5 border-l border-border ${view === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setView("list")}
            >
              <List className="size-3.5" />
              列表
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none border-border gap-1.5 text-muted-foreground hover:text-foreground h-8 px-3"
            onClick={() => setLevelMgmtOpen(true)}
          >
            <Settings2 className="size-3.5" />
            种类管理
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 rounded-none tracking-widest h-8"
            onClick={() => openAddDialog()}
          >
            新增排课
          </Button>
        </div>
      </div>

      {/* ── LIST VIEW ─────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold mb-4 tracking-widest text-muted-foreground">即将开课</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingCourses.map((course) => {
                const pct = course.maxCapacity > 0 ? (course.enrolledCount / course.maxCapacity) * 100 : 0;
                const color = getLevelColor(levels, course.level ?? "");
                return (
                  <div
                    key={course.id}
                    data-testid={`card-course-${course.id}`}
                    className={`border bg-card p-4 flex flex-col gap-3 ${pct >= 100 ? "border-destructive/50" : pct >= 75 ? "border-amber-700/50" : "border-border"}`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-base flex-1 pr-3 leading-tight">{course.title}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-none" style={levelBadgeStyle(color)}>
                          {course.level}
                        </span>
                        <Button
                          data-testid={`button-delete-course-${course.id}`}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 rounded-none text-base"
                          onClick={() => setDeleteTarget({ id: course.id, title: course.title })}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{course.description}</p>
                    )}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>时间</span>
                        <span className="text-foreground">{format(new Date(course.scheduledAt), "yyyy-MM-dd HH:mm")}（{course.durationMinutes}分钟）</span>
                      </div>
                      <div className="flex justify-between">
                        <span>指导</span>
                        <span className="text-foreground">{course.instructor}</span>
                      </div>
                    </div>
                    <EnrollmentBar enrolled={course.enrolledCount} max={course.maxCapacity} />
                  </div>
                );
              })}
              {upcomingCourses.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground border border-border border-dashed">无即将开课的安排</div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 tracking-widest text-muted-foreground">历史排课</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-70">
              {pastCourses.map((course) => (
                <div key={course.id} className="border border-border bg-background p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold">{course.title}</h3>
                    <span className="text-xs text-muted-foreground">{format(new Date(course.scheduledAt), "yyyy-MM-dd")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">指导: {course.instructor}</div>
                  <EnrollmentBar enrolled={course.enrolledCount} max={course.maxCapacity} />
                </div>
              ))}
              {pastCourses.length === 0 && (
                <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">暂无历史记录</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ─────────────────────────────────────── */}
      {view === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="rounded-none hover:bg-muted h-8 w-8" onClick={() => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDate(null); }}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="font-bold tracking-widest text-lg">{format(currentMonth, "yyyy年 M月", { locale: zhCN })}</span>
            <Button variant="ghost" size="icon" className="rounded-none hover:bg-muted h-8 w-8" onClick={() => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDate(null); }}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {paddedDays.map((day, idx) => {
                if (!day) {
                  return <div key={`pad-${idx}`} className="min-h-[96px] border-r border-b border-border [&:nth-child(7n)]:border-r-0 bg-background/20" />;
                }
                const dayCourses = coursesOnDay(day);
                const isToday = isSameDay(day, now);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isPast = day < new Date(now.toDateString());

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`min-h-[96px] border-r border-b border-border [&:nth-child(7n)]:border-r-0 p-1 cursor-pointer transition-colors
                      ${isSelected ? "bg-primary/10 ring-1 ring-primary/30 ring-inset" : "hover:bg-muted/40"}
                      ${!isCurrentMonth ? "opacity-30" : ""}
                      ${isPast && isCurrentMonth ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center ${isToday ? "bg-primary text-primary-foreground rounded-full" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </div>
                      {!isPast && isCurrentMonth && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openAddDialog(day); }}
                          className="text-[10px] text-muted-foreground/50 hover:text-primary hover:bg-primary/10 px-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="在此日排课"
                        >
                          +
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayCourses.slice(0, 3).map((c) => {
                        const full = c.enrolledCount >= c.maxCapacity;
                        const color = getLevelColor(levels, c.level ?? "");
                        return (
                          <div
                            key={c.id}
                            className="text-[10px] px-1 py-0.5 truncate leading-tight"
                            style={full ? { backgroundColor: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" } : levelChipStyle(color)}
                          >
                            {format(new Date(c.scheduledAt), "HH:mm")} {c.title}
                          </div>
                        );
                      })}
                      {dayCourses.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{dayCourses.length - 3} 更多</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {levels.map((l) => (
              <div key={l.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 border" style={{ backgroundColor: hexWithAlpha(l.color, 0.3), borderColor: hexWithAlpha(l.color, 0.6) }} />
                <span className="text-xs text-muted-foreground">{l.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 border bg-destructive/20 border-destructive/40" />
              <span className="text-xs text-muted-foreground">已满员</span>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-widest text-muted-foreground border-l-2 border-primary pl-3">
                  {format(selectedDate, "M月d日 (EEEE)", { locale: zhCN })} 的课程
                </h2>
                <Button size="sm" className="bg-primary hover:bg-primary/90 rounded-none text-xs tracking-widest h-7 px-3" onClick={() => openAddDialog(selectedDate)}>
                  + 在此日排课
                </Button>
              </div>
              {selectedDayCourses.length === 0 ? (
                <div
                  className="text-center py-8 text-muted-foreground border border-border border-dashed cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => openAddDialog(selectedDate)}
                >
                  当日无课程 — 点击添加排课
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDayCourses
                    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                    .map((course) => {
                      const isPastCourse = new Date(course.scheduledAt) <= now;
                      const color = getLevelColor(levels, course.level ?? "");
                      return (
                        <div
                          key={course.id}
                          data-testid={`card-course-${course.id}`}
                          className={`border bg-card p-4 flex flex-col gap-3 ${isPastCourse ? "opacity-60 border-border" : "border-border"}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-bold text-primary shrink-0">{format(new Date(course.scheduledAt), "HH:mm")}</span>
                              <h3 className="font-bold text-sm leading-tight truncate">{course.title}</h3>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs px-2 py-0.5" style={levelBadgeStyle(color)}>
                                {course.level}
                              </span>
                              {!isPastCourse && (
                                <Button
                                  data-testid={`button-delete-course-${course.id}`}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 h-6 w-6 p-0 rounded-none text-sm"
                                  onClick={() => setDeleteTarget({ id: course.id, title: course.title })}
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>指导: {course.instructor} · {course.durationMinutes}分钟</div>
                          </div>
                          <EnrollmentBar enrolled={course.enrolledCount} max={course.maxCapacity} />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {CourseFormDialog}

      {/* Level management dialog */}
      <LevelManageDialog open={levelMgmtOpen} onClose={() => setLevelMgmtOpen(false)} levels={levels} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-card border-border rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-widest">确认删除排课？</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              即将删除课程「{deleteTarget?.title}」。已预约的会员将受到影响，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-border bg-transparent hover:bg-muted" onClick={() => setDeleteTarget(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-course"
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteCourse.mutate({ id: deleteTarget.id }); }}
            >
              {deleteCourse.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
