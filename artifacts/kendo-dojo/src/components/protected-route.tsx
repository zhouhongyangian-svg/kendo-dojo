import React from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";

interface ProtectedRouteProps {
  role?: "admin" | "member" | "course_admin";
  children: React.ReactNode;
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const { member, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!member) {
    return <Redirect to="/sign-in" />;
  }

  if (role === "member" && member.role !== "member" && member.role !== "admin" && member.role !== "course_admin") {
    return <Redirect to="/" />;
  }

  if (role === "admin" && member.role !== "admin") {
    return <Redirect to="/" />;
  }

  if (role === "course_admin" && member.role !== "admin" && member.role !== "course_admin") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
