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
import ConnectGmail from "./pages/ConnectGmail";
import ConnectGmailCallback from "./pages/ConnectGmailCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyPolicyEn from "./pages/PrivacyPolicyEn";
import TermsOfService from "./pages/TermsOfService";
import TermsOfServiceEn from "./pages/TermsOfServiceEn";
import LegalNotice from "./pages/LegalNotice";
import LegalNoticeEn from "./pages/LegalNoticeEn";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/connect-gmail" element={<ProtectedRoute><ConnectGmail /></ProtectedRoute>} />
          <Route path="/connect-gmail/callback" element={<ConnectGmailCallback />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy-en" element={<PrivacyPolicyEn />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/terms-of-service-en" element={<TermsOfServiceEn />} />
          <Route path="/mentions-legales" element={<LegalNotice />} />
          <Route path="/legal-notice" element={<LegalNoticeEn />} />
          <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
