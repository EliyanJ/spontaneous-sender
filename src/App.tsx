import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Help from "./pages/Help";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConnectGmail from "./pages/ConnectGmail";
import ConnectGmailCallback from "./pages/ConnectGmailCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyPolicyEn from "./pages/PrivacyPolicyEn";
import TermsOfService from "./pages/TermsOfService";
import TermsOfServiceEn from "./pages/TermsOfServiceEn";
import LegalNotice from "./pages/LegalNotice";
import LegalNoticeEn from "./pages/LegalNoticeEn";
import Pricing from "./pages/Pricing";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { HelpBubble } from "./components/HelpBubble";
import { 
  AdminLayout, 
  AdminDashboard, 
  AdminUsers, 
  AdminUserDetail, 
  AdminTeam,
  AdminTickets,
  AdminDataCenter,
  AdminCMS,
  AdminPageEditor,
  AdminSEO,
  AdminBlockEditor,
} from "./pages/Admin";
import AdminTicketDetail from "./pages/Admin/AdminTicketDetail";
import BlogPost from "./pages/BlogPost";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/help" element={<Help />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/connect-gmail" element={<ProtectedRoute><ConnectGmail /></ProtectedRoute>} />
          <Route path="/connect-gmail/callback" element={<ConnectGmailCallback />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy-en" element={<PrivacyPolicyEn />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/terms-of-service-en" element={<TermsOfServiceEn />} />
          <Route path="/mentions-legales" element={<LegalNotice />} />
          <Route path="/legal-notice" element={<LegalNoticeEn />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:userId" element={<AdminUserDetail />} />
            <Route path="data" element={<AdminDataCenter />} />
            <Route path="team" element={<AdminTeam />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="tickets/:ticketId" element={<AdminTicketDetail />} />
            <Route path="cms" element={<AdminCMS />} />
            <Route path="seo" element={<AdminSEO />} />
          </Route>
          
          {/* CMS Editor — fullscreen, outside AdminLayout */}
          <Route path="/admin/cms/:pageId" element={<AdminRoute><AdminPageEditor /></AdminRoute>} />
          <Route path="/admin/cms/blocks/:blockId" element={<AdminRoute><AdminBlockEditor /></AdminRoute>} />
          
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/p/:slug" element={<BlogPost />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <HelpBubble />
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
