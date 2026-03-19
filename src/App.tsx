import React, { Suspense, lazy } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GlobalErrorBoundary, ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eagerly loaded — critical path (public marketing + auth)
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyPolicyEn from "./pages/PrivacyPolicyEn";
import TermsOfService from "./pages/TermsOfService";
import TermsOfServiceEn from "./pages/TermsOfServiceEn";
import LegalNotice from "./pages/LegalNotice";
import LegalNoticeEn from "./pages/LegalNoticeEn";
import NotFound from "./pages/NotFound";

// Lazily loaded — reduces initial bundle size
const Index           = lazy(() => import("./pages/Index"));
const CVBuilder       = lazy(() => import("./pages/CVBuilder"));
const CVScorePage     = lazy(() => import("./pages/CVScorePage").then(m => ({ default: m.CVScorePage })));
const JobOffersPublic = lazy(() => import("./pages/JobOffersPublic"));
const Blog            = lazy(() => import("./pages/Blog"));
const BlogPost        = lazy(() => import("./pages/BlogPost"));
const Pricing         = lazy(() => import("./pages/Pricing"));
const Help            = lazy(() => import("./pages/Help"));
const Onboarding      = lazy(() => import("./pages/Onboarding"));
const ConnectGmail    = lazy(() => import("./pages/ConnectGmail"));
const ConnectGmailCallback = lazy(() => import("./pages/ConnectGmailCallback"));

// Admin (rarely visited — largest savings)
const AdminLayout            = lazy(() => import("./pages/Admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard         = lazy(() => import("./pages/Admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminUsers             = lazy(() => import("./pages/Admin/AdminUsers").then(m => ({ default: m.AdminUsers })));
const AdminUserDetail        = lazy(() => import("./pages/Admin/AdminUserDetail").then(m => ({ default: m.AdminUserDetail })));
const AdminTeam              = lazy(() => import("./pages/Admin/AdminTeam").then(m => ({ default: m.AdminTeam })));
const AdminTickets           = lazy(() => import("./pages/Admin/AdminTickets"));
const AdminTicketDetail      = lazy(() => import("./pages/Admin/AdminTicketDetail"));
const AdminDataCenter        = lazy(() => import("./pages/Admin/AdminDataCenter").then(m => ({ default: m.AdminDataCenter })));
const AdminCMS               = lazy(() => import("./pages/Admin/AdminCMS").then(m => ({ default: m.AdminCMS })));
const AdminPageEditor        = lazy(() => import("./pages/Admin/AdminPageEditor").then(m => ({ default: m.AdminPageEditor })));
const AdminBlockEditor       = lazy(() => import("./pages/Admin/AdminBlockEditor").then(m => ({ default: m.AdminBlockEditor })));
const AdminSEO               = lazy(() => import("./pages/Admin/AdminSEO").then(m => ({ default: m.AdminSEO })));
const AdminPromos            = lazy(() => import("./pages/Admin/AdminPromos").then(m => ({ default: m.AdminPromos })));
const AdminATSTraining       = lazy(() => import("./pages/Admin/AdminATSTraining").then(m => ({ default: m.AdminATSTraining })));
const AdminChatbot           = lazy(() => import("./pages/Admin/AdminChatbot").then(m => ({ default: m.AdminChatbot })));
const AdminCVTemplates       = lazy(() => import("./pages/Admin/AdminCVTemplates").then(m => ({ default: m.AdminCVTemplates })));
const AdminCVTemplateBuilder = lazy(() => import("./pages/Admin/AdminCVTemplateBuilder").then(m => ({ default: m.AdminCVTemplateBuilder })));
const AdminEmailQuality      = lazy(() => import("./pages/Admin/AdminEmailQuality").then(m => ({ default: m.AdminEmailQuality })));

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { ChatbotWidget } from "./components/ChatbotWidget";
import { CookieBanner } from "./components/CookieBanner";

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
      gcTime: 1000 * 60 * 10, // 10 min
    },
  },
});

const App = () => (
  <GlobalErrorBoundary>
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="cronos-theme-v2">
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public — eagerly loaded */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy-en" element={<PrivacyPolicyEn />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/terms-of-service-en" element={<TermsOfServiceEn />} />
            <Route path="/mentions-legales" element={<LegalNotice />} />
            <Route path="/legal-notice" element={<LegalNoticeEn />} />

            {/* Public tools — lazy */}
            <Route path="/score-cv" element={<CVScorePage />} />
            <Route path="/createur-de-cv" element={<ErrorBoundary context="CV Builder"><CVBuilder /></ErrorBoundary>} />
            <Route path="/offres-emploi" element={<JobOffersPublic />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/p/:slug" element={<BlogPost />} />
            <Route path="/prix" element={<Pricing />} />
            <Route path="/help" element={<Help />} />

            {/* Redirects from old URLs */}
            <Route path="/pricing" element={<Navigate to="/prix" replace />} />
            <Route path="/cv-builder" element={<Navigate to="/createur-de-cv" replace />} />

            {/* Auth-required */}
            <Route path="/connect-gmail" element={<ProtectedRoute><ConnectGmail /></ProtectedRoute>} />
            <Route path="/connect-gmail/callback" element={<ConnectGmailCallback />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary context="Dashboard"><Index /></ErrorBoundary></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><ErrorBoundary context="Administration"><AdminLayout /></ErrorBoundary></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="users/:userId" element={<AdminUserDetail />} />
              <Route path="data" element={<AdminDataCenter />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="tickets" element={<AdminTickets />} />
              <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
              <Route path="promos" element={<AdminPromos />} />
              <Route path="ats" element={<AdminATSTraining />} />
              <Route path="cms" element={<AdminCMS />} />
              <Route path="seo" element={<AdminSEO />} />
              <Route path="chatbot" element={<AdminChatbot />} />
              <Route path="cv-templates" element={<AdminCVTemplates />} />
              <Route path="email-quality" element={<AdminEmailQuality />} />
            </Route>

            {/* CMS / CV-builder editors — fullscreen, outside AdminLayout */}
            <Route path="/admin/cms/:pageId" element={<AdminRoute><AdminPageEditor /></AdminRoute>} />
            <Route path="/admin/cms/blocks/:blockId" element={<AdminRoute><AdminBlockEditor /></AdminRoute>} />
            <Route path="/admin/cv-templates/new" element={<AdminRoute><AdminCVTemplateBuilder /></AdminRoute>} />
            <Route path="/admin/cv-templates/:templateId" element={<AdminRoute><AdminCVTemplateBuilder /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <ChatbotWidget />
        <CookieBanner />
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
  </ThemeProvider>
  </GlobalErrorBoundary>
);

export default App;
