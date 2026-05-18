import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
// Member
import Dashboard from "@/pages/member/dashboard";
import MemberAnnouncements from "@/pages/member/announcements";
import MemberCourses from "@/pages/member/courses";
import MemberBookings from "@/pages/member/bookings";

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminMembers from "@/pages/admin/members";
import AdminAnnouncements from "@/pages/admin/announcements";
import AdminCourses from "@/pages/admin/courses";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/sign-in" component={Login} />
      <Route path="/sign-up" component={Login} />
      
      {/* Member Routes */}
      <Route path="/dashboard">
        <ProtectedRoute role="member"><Layout><Dashboard /></Layout></ProtectedRoute>
      </Route>
      <Route path="/announcements">
        <ProtectedRoute role="member"><Layout><MemberAnnouncements /></Layout></ProtectedRoute>
      </Route>
      <Route path="/courses">
        <ProtectedRoute role="member"><Layout><MemberCourses /></Layout></ProtectedRoute>
      </Route>
      <Route path="/bookings">
        <ProtectedRoute role="member"><Layout><MemberBookings /></Layout></ProtectedRoute>
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute role="admin"><Layout><AdminDashboard /></Layout></ProtectedRoute>
      </Route>
      <Route path="/admin/members">
        <ProtectedRoute role="admin"><Layout><AdminMembers /></Layout></ProtectedRoute>
      </Route>
      <Route path="/admin/announcements">
        <ProtectedRoute role="admin"><Layout><AdminAnnouncements /></Layout></ProtectedRoute>
      </Route>
      <Route path="/admin/courses">
        <ProtectedRoute role="course_admin"><Layout><AdminCourses /></Layout></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
