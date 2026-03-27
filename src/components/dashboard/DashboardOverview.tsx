import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Mail, FileText, PenLine, Zap, TrendingUp, TrendingDown, Minus,
  ArrowRight, Building2, Search, Send, Briefcase, Target, ChevronRight,
  Sparkles, Globe
} from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardOverviewProps {
  onNavigateToTab: (tab: string, section?: string) => void;
}

interface Stats {
  emailsSent: number;
  emailsFound: number;
  cvsGenerated: number;
  coverLetters: number;
  creditsRemaining: number;
  sendsRemaining: number;
  sendsLimit: number;
  totalCompanies: number;
  campaignsSent: number;
  cvScore: number | null;
}

interface RecentCompany {
  id: string;
  nom: string;
  status: string | null;
  emails: any;
  created_at: string | null;
}

interface ActivityItem {
  id: string;
  action_type: string;
  action_data: any;
  created_at: string | null;
}

// Chart placeholder — will be replaced by real data in a future feature
const performanceData: any[] = [];

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  contacted: { label: "Contacté", color: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-600" },
  optimized: { label: "Optimisé", color: "bg-green-50 text-[hsl(var(--chart-2))] border-green-100", dot: "bg-[hsl(var(--chart-2))]" },
  pending: { label: "En attente", color: "bg-orange-50 text-orange-600 border-orange-100", dot: "bg-orange-600" },
  default: { label: "Nouveau", color: "bg-accent text-primary border-primary/20", dot: "bg-primary" },
};

const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  search_completed: { icon: <Search className="h-3 w-3" />, color: "bg-primary/10 text-primary" },
  email_sent: { icon: <Mail className="h-3 w-3" />, color: "bg-blue-100 text-blue-600" },
  session_start: { icon: <Sparkles className="h-3 w-3" />, color: "bg-green-100 text-green-600" },
  tab_change: { icon: <ChevronRight className="h-3 w-3" />, color: "bg-muted text-muted-foreground" },
};

const activityLabels: Record<string, string> = {
  search_completed: "Recherche d'entreprises terminée",
  email_sent: "Email envoyé",
  session_start: "Session démarrée",
  tab_change: "Navigation",
  search_started: "Recherche lancée",
  company_added: "Entreprise ajoutée",
};

function CircularProgress({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Bien" : "À améliorer";

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
        <circle
          cx="80" cy="80" r={radius}
          stroke={color} strokeWidth="12" fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}

export const DashboardOverview = ({ onNavigateToTab }: DashboardOverviewProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    emailsSent: 0, emailsFound: 0, cvsGenerated: 0, coverLetters: 0,
    creditsRemaining: 0, sendsRemaining: 0, sendsLimit: 0,
    totalCompanies: 0, campaignsSent: 0, cvScore: null,
  });
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [
          profileRes, subscriptionRes, companiesRecentRes, companiesCountRes,
          emailsSentRes, emailsFoundRes, campaignsRes, activityRes, cvsRes, cvScoreRes
        ] = await Promise.all([
          supabase.from("profiles").select("first_name").eq("id", user.id).single(),
          supabase.from("subscriptions").select("tokens_remaining, sends_remaining, sends_limit").eq("user_id", user.id).single(),
          supabase.from("companies").select("id, nom, status, emails, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("companies").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("email_campaigns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("companies").select("id", { count: "exact", head: true }).eq("user_id", user.id).not("selected_email", "is", null),
          supabase.from("campaigns").select("id, sent_emails").eq("user_id", user.id),
          supabase.from("user_activity_logs").select("id, action_type, action_data, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("user_generated_cvs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("cv_analyses").select("total_score").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        ]);

        if (profileRes.data?.first_name) setFirstName(profileRes.data.first_name);

        const tokensRemaining = subscriptionRes.data?.tokens_remaining ?? 0;
        const sendsRemaining = subscriptionRes.data?.sends_remaining ?? 0;
        const sendsLimit = subscriptionRes.data?.sends_limit ?? 0;

        const totalEmailsSent = emailsSentRes.count ?? 0;
        const totalEmailsFound = emailsFoundRes.count ?? 0;
        const totalCVs = cvsRes.count ?? 0;
        const totalCompanies = companiesCountRes.count ?? 0;
        const lastCvScore = cvScoreRes.data && cvScoreRes.data.length > 0 ? Number(cvScoreRes.data[0].total_score) : null;

        setStats({
          emailsSent: totalEmailsSent,
          emailsFound: totalEmailsFound,
          cvsGenerated: totalCVs,
          coverLetters: 0,
          creditsRemaining: tokensRemaining,
          sendsRemaining,
          sendsLimit,
          totalCompanies,
          campaignsSent: campaignsRes.data?.reduce((sum, c) => sum + (c.sent_emails ?? 0), 0) ?? 0,
          cvScore: lastCvScore,
        });

        setRecentCompanies(companiesRecentRes.data ?? []);
        setActivity(activityRes.data ?? []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const metricCards = [
    {
      label: "Emails trouvés",
      value: stats.emailsFound,
      icon: <Mail className="h-5 w-5" />,
      iconBg: "bg-blue-50 text-blue-600",
      bar: "bg-blue-500",
      onClick: () => onNavigateToTab("emails"),
    },
    {
      label: "CV générés",
      value: stats.cvsGenerated,
      icon: <FileText className="h-5 w-5" />,
      iconBg: "bg-primary/10 text-primary",
      bar: "bg-primary",
      onClick: () => onNavigateToTab("cv-score"),
    },
    {
      label: "Candidatures envoyées",
      value: stats.emailsSent,
      icon: <PenLine className="h-5 w-5" />,
      iconBg: "bg-orange-50 text-orange-500",
      bar: "bg-orange-500",
      onClick: () => onNavigateToTab("campaigns"),
    },
    {
      label: "Crédits restants",
      value: stats.sendsRemaining + stats.creditsRemaining,
      subtitle: `${stats.sendsRemaining} envois + ${stats.creditsRemaining} tokens`,
      icon: <Zap className="h-5 w-5" />,
      iconBg: "bg-green-50 text-green-600",
      bar: "bg-green-500",
      onClick: () => onNavigateToTab("settings"),
    },
  ];

  const quickActions = [
    { label: "Rechercher des entreprises", icon: <Search className="h-4 w-4" />, tab: "search", color: "text-primary" },
    { label: "Lancer une campagne", icon: <Send className="h-4 w-4" />, tab: "campaigns", color: "text-blue-600" },
    { label: "Voir les offres d'emploi", icon: <Briefcase className="h-4 w-4" />, tab: "jobs", color: "text-orange-500" },
    { label: "Analyser mon CV", icon: <Target className="h-4 w-4" />, tab: "cv-score", color: "text-green-600" },
  ];

  const getCompanyInitial = (nom: string) => nom.charAt(0).toUpperCase();
  const getCompanyColor = (nom: string) => {
    const colors = ["bg-gray-900", "bg-blue-600", "bg-orange-500", "bg-primary", "bg-green-700"];
    return colors[nom.charCodeAt(0) % colors.length];
  };

  const getStatusDisplay = (status: string | null) => {
    if (!status) return statusConfig.default;
    return statusConfig[status] ?? statusConfig.default;
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffH = Math.floor(diffMs / 3600000);
      const diffD = Math.floor(diffMs / 86400000);
      if (diffH < 1) return "À l'instant";
      if (diffH < 24) return `Il y a ${diffH}h`;
      if (diffD === 1) return "Hier";
      return format(date, "dd MMM", { locale: fr });
    } catch { return ""; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Bonjour{firstName ? `, ${firstName}` : ""} 👋
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Votre recherche d'emploi est en bonne voie.{" "}
            <span className="text-green-600 dark:text-green-400 font-medium">Continuez comme ça !</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-sm"
            onClick={() => onNavigateToTab("entreprises")}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Mes entreprises
          </Button>
          <Button
            size="sm"
            className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            onClick={() => onNavigateToTab("campaigns")}
          >
            <Send className="h-4 w-4 mr-2" />
            Nouvelle campagne
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            onClick={card.onClick}
            className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
             <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", card.iconBg)}>
                {card.icon}
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{card.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {card.value.toLocaleString("fr-FR")}
            </p>
            {'subtitle' in card && card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Main Grid: Chart + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chart + Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Performance de recherche</h3>
                <p className="text-sm text-muted-foreground">Fonctionnalité à venir</p>
              </div>
            </div>
            <div className="flex items-center justify-center h-[280px] text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Les statistiques de performance seront disponibles prochainement</p>
              </div>
            </div>
          </div>

          {/* Recent Companies Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-foreground">Entreprises récentes</h3>
              <button
                onClick={() => onNavigateToTab("entreprises")}
                className="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Voir tout <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {recentCompanies.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucune entreprise pour l'instant</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => onNavigateToTab("search")}>
                  Lancer une recherche
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3">Entreprise</th>
                      <th className="px-5 py-3">Statut</th>
                      <th className="px-5 py-3">Emails</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {recentCompanies.map((company) => {
                      const status = getStatusDisplay(company.status);
                      const emails = Array.isArray(company.emails) ? company.emails.length : 0;
                      return (
                        <tr
                          key={company.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => onNavigateToTab("entreprises")}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded text-white flex items-center justify-center font-bold text-xs", getCompanyColor(company.nom))}>
                                {getCompanyInitial(company.nom)}
                              </div>
                              <span className="font-medium text-foreground truncate max-w-[120px]">{company.nom}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", status.color)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">{emails} contact{emails > 1 ? "s" : ""}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">{formatRelativeTime(company.created_at)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button className="text-muted-foreground hover:text-primary transition-colors">
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* CV Score */}
          <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
            <h3 className="text-base font-bold text-foreground mb-4 relative z-10">Score d'optimisation CV</h3>
            <CircularProgress score={stats.cvScore ?? 72} />
            <p className="text-sm text-center text-muted-foreground mt-4 px-2">
              Votre CV est dans le <span className="font-bold text-green-600 dark:text-green-400">top 28%</span> des candidats.
            </p>
            <Button
              variant="outline"
              className="w-full mt-4 text-sm"
              onClick={() => onNavigateToTab("cv-score")}
            >
              Voir l'analyse complète
            </Button>
          </div>

          {/* Quick Navigation */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-base font-bold text-foreground mb-4">Accès rapide</h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.tab}
                  onClick={() => onNavigateToTab(action.tab)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("transition-colors", action.color)}>{action.icon}</span>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
