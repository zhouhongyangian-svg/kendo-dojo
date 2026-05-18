import { useState } from "react";
import { useListAnnouncements, getListAnnouncementsQueryKey, useCreateAnnouncement, useDeleteAnnouncement, useUpdateAnnouncement } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const announcementSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  content: z.string().min(1, "请输入内容"),
  isPinned: z.boolean().default(false),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

export default function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: announcements, isLoading } = useListAnnouncements({ query: { queryKey: getListAnnouncementsQueryKey() } });
  const [isOpen, setIsOpen] = useState(false);

  const createAnnouncement = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
        toast({ title: "发布成功", description: "公告已发布" });
        setIsOpen(false);
        form.reset();
      }
    }
  });

  const updateAnnouncement = useUpdateAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
      }
    }
  });

  const deleteAnnouncement = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
        toast({ title: "删除成功", description: "公告已移除" });
      }
    }
  });

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", content: "", isPinned: false },
  });

  const onSubmit = (data: AnnouncementFormValues) => {
    createAnnouncement.mutate({ data });
  };

  const togglePin = (id: number, isPinned: boolean) => {
    updateAnnouncement.mutate({ id, data: { isPinned } });
  };

  const togglePublish = (id: number, isPublished: boolean) => {
    updateAnnouncement.mutate(
      { id, data: { isPublished } },
      {
        onSuccess: () => {
          toast({
            title: isPublished ? "已展示" : "已取消展示",
            description: isPublished ? "会员现在可以看到此公告" : "会员将看不到此公告",
          });
        },
      }
    );
  };

  if (isLoading) return <div>加载中...</div>;

  const published = announcements?.filter(a => a.isPublished) ?? [];
  const hidden = announcements?.filter(a => !a.isPublished) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">公告管理</h1>
          <p className="text-xs text-muted-foreground mt-1 pl-5">
            展示中 {published.length} 条 · 已隐藏 {hidden.length} 条
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-none tracking-widest">发布公告</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border rounded-none sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="tracking-widest">新公告</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标题</FormLabel>
                      <FormControl>
                        <Input placeholder="输入标题" {...field} className="rounded-none border-border bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>内容</FormLabel>
                      <FormControl>
                        <Textarea rows={6} placeholder="输入正文" {...field} className="rounded-none border-border bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPinned"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-none border border-border bg-background p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">置顶公告</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="pt-4">
                  <Button type="submit" disabled={createAnnouncement.isPending} className="w-full bg-primary hover:bg-primary/90 rounded-none tracking-widest">
                    确认发布
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {announcements?.map(a => (
          <div
            key={a.id}
            className={`border bg-card transition-opacity ${
              a.isPinned ? "border-secondary" : "border-border"
            } ${!a.isPublished ? "opacity-50" : ""}`}
          >
            <div className="flex justify-between items-start p-4">
              {/* Left: title + badges */}
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                <h3 className="font-bold text-base truncate">{a.title}</h3>
                {a.isPinned && (
                  <Badge variant="secondary" className="shrink-0 rounded-sm text-xs">置顶</Badge>
                )}
                {!a.isPublished && (
                  <Badge variant="outline" className="shrink-0 rounded-sm text-xs text-muted-foreground border-muted-foreground/40">
                    已隐藏
                  </Badge>
                )}
              </div>

              {/* Right: controls */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {format(new Date(a.createdAt), "yyyy-MM-dd")}
                </span>

                {/* Pin toggle */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground hidden md:block">置顶</span>
                  <Switch
                    checked={a.isPinned}
                    onCheckedChange={(c) => togglePin(a.id, c)}
                    disabled={updateAnnouncement.isPending}
                  />
                </div>

                {/* Publish toggle button */}
                <Button
                  variant={a.isPublished ? "outline" : "default"}
                  size="sm"
                  className={`rounded-none h-8 px-3 gap-1.5 text-xs tracking-wide ${
                    a.isPublished
                      ? "border-muted-foreground/30 text-muted-foreground hover:border-destructive hover:text-destructive"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  onClick={() => togglePublish(a.id, !a.isPublished)}
                  disabled={updateAnnouncement.isPending}
                >
                  {a.isPublished ? (
                    <><EyeOff className="w-3.5 h-3.5" /> 取消展示</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" /> 展示</>
                  )}
                </Button>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 rounded-none"
                  onClick={() => {
                    if (confirm("确定删除此公告？")) deleteAnnouncement.mutate({ id: a.id });
                  }}
                >
                  删除
                </Button>
              </div>
            </div>

            <div className="px-4 pb-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">{a.content}</p>
              <span className="text-xs text-muted-foreground mt-1 block sm:hidden">
                {format(new Date(a.createdAt), "yyyy-MM-dd")}
              </span>
            </div>
          </div>
        ))}

        {(!announcements || announcements.length === 0) && (
          <div className="text-center py-12 text-muted-foreground border border-border">
            暂无公告记录
          </div>
        )}
      </div>
    </div>
  );
}
