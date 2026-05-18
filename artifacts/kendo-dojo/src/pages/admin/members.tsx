import { useState } from "react";
import {
  useListMembers, getListMembersQueryKey,
  useCreateMember, useDeleteMember, useUpdateMemberStatus, useUpdateMember,
} from "@workspace/api-client-react";
import type { Member } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Shield, Users, Pencil } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  admin: "超级管理员",
  course_admin: "课程管理员",
  member: "会员",
};

function RoleSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 pt-1">
      {(["member", "course_admin", "admin"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`p-2.5 border text-left transition-colors ${
            value === r ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center shrink-0 ${value === r ? "border-primary" : "border-muted-foreground"}`}>
              {value === r && <div className="w-1 h-1 rounded-full bg-primary" />}
            </div>
            <span className="text-xs font-medium">{ROLE_LABEL[r]}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-primary/20 text-primary border border-primary/30",
  course_admin: "bg-blue-900/40 text-blue-300 border border-blue-700/40",
  member: "bg-muted text-muted-foreground border border-border",
};

const baseMemberSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  email: z.string().email("请输入有效的电子邮箱"),
  password: z.string().min(6, "密码至少6位"),
  phone: z.string().optional(),
});

const adminSchema = baseMemberSchema.extend({
  role: z.enum(["admin", "course_admin"]),
});

const editSchema = z.object({
  name: z.string().min(1, "请输入姓名"),
  email: z.string().email("请输入有效的电子邮箱"),
  phone: z.string().optional(),
  role: z.enum(["admin", "course_admin", "member"]),
  password: z.string().optional(),
}).refine((d) => !d.password || d.password.length >= 6, {
  message: "新密码至少6位",
  path: ["password"],
});

type MemberFormValues = z.infer<typeof baseMemberSchema>;
type AdminFormValues = z.infer<typeof adminSchema>;
type EditFormValues = z.infer<typeof editSchema>;

export default function AdminMembers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: members, isLoading } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);

  const createMember = useCreateMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: "添加成功", description: "新账户已创建" });
        setMemberDialogOpen(false);
        setAdminDialogOpen(false);
        memberForm.reset();
        adminForm.reset();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "添加失败", description: err?.response?.data?.error || "无法添加" });
      },
    },
  });

  const updateMember = useUpdateMember({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: "修改成功", description: `${data.name} 的信息已更新` });
        setEditTarget(null);
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "修改失败", description: err?.response?.data?.error || "无法修改" });
      },
    },
  });

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: "删除成功", description: "账户已移除" });
      },
    },
  });

  const updateStatus = useUpdateMemberStatus({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: "状态已更新", description: `${data.name} 已${data.status === "active" ? "启用" : "停用"}` });
      },
      onError: () => {
        toast({ variant: "destructive", title: "更新失败", description: "无法修改状态" });
      },
    },
  });

  const memberForm = useForm<MemberFormValues>({
    resolver: zodResolver(baseMemberSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const adminForm = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: { name: "", email: "", password: "", phone: "", role: "course_admin" },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", phone: "", role: "member", password: "" },
  });

  const onMemberSubmit = (data: MemberFormValues) => {
    createMember.mutate({ data: { ...data, role: "member" } });
  };

  const onAdminSubmit = (data: AdminFormValues) => {
    createMember.mutate({ data });
  };

  const openEdit = (m: Member) => {
    setEditTarget(m);
    editForm.reset({
      name: m.name,
      email: m.email,
      phone: m.phone ?? "",
      role: m.role as "admin" | "course_admin" | "member",
      password: "",
    });
  };

  const onEditSubmit = (data: EditFormValues) => {
    if (!editTarget) return;
    updateMember.mutate({
      id: editTarget.id,
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        password: data.password || undefined,
      },
    });
  };

  if (isLoading) return <div className="text-muted-foreground p-8">加载中...</div>;

  const admins = members?.filter((m) => m.role !== "member") ?? [];
  const regularMembers = members?.filter((m) => m.role === "member") ?? [];

  const RoleSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="grid grid-cols-3 gap-2 pt-1">
      {(["member", "course_admin", "admin"] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`p-2.5 border text-left transition-colors ${
            value === r ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className={`w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center shrink-0 ${value === r ? "border-primary" : "border-muted-foreground"}`}>
              {value === r && <div className="w-1 h-1 rounded-full bg-primary" />}
            </div>
            <span className="text-xs font-medium">{ROLE_LABEL[r]}</span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest text-primary border-l-4 border-primary pl-4">会员管理</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-none border-primary/50 text-primary hover:bg-primary/10 tracking-widest gap-2"
            onClick={() => setAdminDialogOpen(true)}
          >
            <Shield className="w-4 h-4" />
            添加管理员
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 rounded-none tracking-widest gap-2"
            onClick={() => setMemberDialogOpen(true)}
          >
            <Users className="w-4 h-4" />
            添加会员
          </Button>
        </div>
      </div>

      {/* Admin section */}
      {admins.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-3 tracking-widest text-muted-foreground flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            管理员账户
          </h2>
          <div className="border border-border bg-card overflow-hidden mb-6">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">姓名</TableHead>
                  <TableHead className="text-muted-foreground">邮箱</TableHead>
                  <TableHead className="text-muted-foreground">权限</TableHead>
                  <TableHead className="text-muted-foreground">状态</TableHead>
                  <TableHead className="text-muted-foreground">加入日期</TableHead>
                  <TableHead className="text-right text-muted-foreground">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((m) => (
                  <TableRow key={m.id} className="border-border hover:bg-accent/50">
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-sm">{m.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs ${ROLE_BADGE[m.role]}`}>
                        {ROLE_LABEL[m.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => updateStatus.mutate({ id: m.id, data: { status: m.status === "active" ? "inactive" : "active" } })}
                        disabled={updateStatus.isPending}
                        className={`px-2 py-1 text-xs cursor-pointer transition-opacity hover:opacity-70 disabled:cursor-not-allowed ${m.status === "active" ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border"}`}
                        title={m.status === "active" ? "点击停用" : "点击启用"}
                      >
                        {m.status === "active" ? "活跃" : "停用"}
                      </button>
                    </TableCell>
                    <TableCell>{format(new Date(m.joinedAt), "yyyy-MM-dd")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-none h-8 px-2 gap-1"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none h-8 px-2"
                          onClick={() => { if (confirm(`确定要移除管理员 ${m.name} 吗？`)) deleteMember.mutate({ id: m.id }); }}
                          disabled={deleteMember.isPending}
                        >
                          移除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Member section */}
      <div>
        <h2 className="text-sm font-bold mb-3 tracking-widest text-muted-foreground flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          会员账户
        </h2>
        <div className="border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">姓名</TableHead>
                <TableHead className="text-muted-foreground">邮箱/电话</TableHead>
                <TableHead className="text-muted-foreground">状态</TableHead>
                <TableHead className="text-muted-foreground">加入日期</TableHead>
                <TableHead className="text-right text-muted-foreground">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regularMembers.map((m) => (
                <TableRow key={m.id} className="border-border hover:bg-accent/50">
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">{m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.phone}</div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => updateStatus.mutate({ id: m.id, data: { status: m.status === "active" ? "inactive" : "active" } })}
                      disabled={updateStatus.isPending}
                      className={`px-2 py-1 text-xs cursor-pointer transition-opacity hover:opacity-70 disabled:cursor-not-allowed ${m.status === "active" ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground border border-border"}`}
                      title={m.status === "active" ? "点击停用" : "点击启用"}
                    >
                      {m.status === "active" ? "活跃" : "停用"}
                    </button>
                  </TableCell>
                  <TableCell>{format(new Date(m.joinedAt), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-none h-8 px-2 gap-1"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-none h-8 px-2"
                        onClick={() => { if (confirm(`确定要移除会员 ${m.name} 吗？`)) deleteMember.mutate({ id: m.id }); }}
                        disabled={deleteMember.isPending}
                      >
                        移除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {regularMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">暂无会员</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="bg-card border-border rounded-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="tracking-widest flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              编辑账户信息
              {editTarget && (
                <span className="text-muted-foreground font-normal text-sm ml-1">— {editTarget.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <FormField control={editForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>账户角色</FormLabel>
                  <RoleSelector value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名</FormLabel>
                    <FormControl><Input placeholder="输入姓名" {...field} className="rounded-none border-border bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>电话（可选）</FormLabel>
                    <FormControl><Input placeholder="输入电话" {...field} className="rounded-none border-border bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl><Input placeholder="输入邮箱" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>新密码（留空则不修改）</FormLabel>
                  <FormControl><Input type="password" placeholder="输入新密码（最少6位）" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-none border-border" onClick={() => setEditTarget(null)}>取消</Button>
                <Button type="submit" disabled={updateMember.isPending} className="flex-1 bg-primary hover:bg-primary/90 rounded-none tracking-widest">
                  {updateMember.isPending ? "保存中..." : "保存修改"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="bg-card border-border rounded-none sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" />
              添加新会员
            </DialogTitle>
          </DialogHeader>
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(onMemberSubmit)} className="space-y-4 pt-2">
              <FormField control={memberForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl><Input placeholder="输入姓名" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={memberForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl><Input placeholder="输入邮箱" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={memberForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl><Input type="password" placeholder="设置密码（最少6位）" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={memberForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>电话（可选）</FormLabel>
                  <FormControl><Input placeholder="输入电话" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="pt-4 flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-none border-border" onClick={() => setMemberDialogOpen(false)}>取消</Button>
                <Button type="submit" disabled={createMember.isPending} className="flex-1 bg-primary hover:bg-primary/90 rounded-none tracking-widest">
                  {createMember.isPending ? "提交中..." : "确认添加"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add admin dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="bg-card border-border rounded-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              添加管理员
            </DialogTitle>
          </DialogHeader>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4 pt-2">
              <FormField
                control={adminForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>管理权限</FormLabel>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => field.onChange("course_admin")}
                        className={`p-3 border text-left transition-colors ${field.value === "course_admin" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${field.value === "course_admin" ? "border-primary" : "border-muted-foreground"}`}>
                            {field.value === "course_admin" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </div>
                          <span className="text-sm font-medium">课程管理员</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">仅可管理课程排班</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("admin")}
                        className={`p-3 border text-left transition-colors ${field.value === "admin" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${field.value === "admin" ? "border-primary" : "border-muted-foreground"}`}>
                            {field.value === "admin" && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </div>
                          <span className="text-sm font-medium">超级管理员</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">拥有全部权限</p>
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={adminForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl><Input placeholder="输入姓名" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl><Input placeholder="输入邮箱" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl><Input type="password" placeholder="设置密码（最少6位）" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>电话（可选）</FormLabel>
                  <FormControl><Input placeholder="输入电话" {...field} className="rounded-none border-border bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="pt-4 flex gap-2">
                <Button type="button" variant="outline" className="flex-1 rounded-none border-border" onClick={() => setAdminDialogOpen(false)}>取消</Button>
                <Button type="submit" disabled={createMember.isPending} className="flex-1 bg-primary hover:bg-primary/90 rounded-none tracking-widest">
                  {createMember.isPending ? "提交中..." : "确认添加"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
