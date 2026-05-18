import { useState } from "react";
import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("请输入有效的电子邮箱"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { member, login, isLoading } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isLoading) return null;

  if (member) {
    const dest = member.role === "admin"
      ? "/admin/announcements"
      : member.role === "course_admin"
      ? "/admin/courses"
      : "/announcements";
    return <Redirect to={dest} />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoggingIn(true);
    try {
      await login(data);
      toast({ title: "登录成功", description: "欢迎回到长安剑士会" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: error?.message || "账号或密码错误",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,188,0.12)_0,transparent_70%)]" />
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        {/* Logo block */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/logo-transparent.png"
            alt="长安剑士会"
            className="w-36 h-auto object-contain mb-2 drop-shadow-[0_0_18px_rgba(37,99,188,0.45)]"
          />
          <p className="text-xs text-muted-foreground tracking-[0.3em] uppercase">Chang'an Kendo</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border shadow-2xl p-8">
          <p className="text-center text-sm text-muted-foreground tracking-widest mb-8">系 统 登 录</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground tracking-wider">电子邮箱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin@dojo.com"
                        {...field}
                        className="bg-background border-border focus-visible:ring-primary rounded-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground tracking-wider">密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="bg-background border-border focus-visible:ring-primary rounded-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-none tracking-widest mt-4"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "登 录 中..." : "登 录"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
