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
  emailsFound: number;
  cvsGenerated: number;
  coverLetters: number;
  creditsUsed: number;
  creditsRemaining: number;
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

const performanceData = [
  { day: "Lun", applications: 8, responses: 2 },
  { day: "Mar", applications: 14, responses: 5 },
  { day: "Mer", applications: 11, responses: 7 },
  { day: "Jeu", applications: 19, responses: 9 },
  { day: "Ven", applications: 16, responses: 11 },
  { day: "Sam", applications: 23, responses: 14 },
  { day: "Dim", applications: 28, responses: 18 },
];

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
    emailsFound: 0, cvsGenerated: 0, coverLetters: 0, creditsUsed: 0,
    creditsRemaining: 0, totalCompanies: 0, campaignsSent: 0, cvScore: null,
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
          profileRes, subscriptionRes, companiesRes, emailsRes, campaignsRes, activityRes, cvsRes
        ] = await Promise.all([
          supabase.from("profiles").select("first_name").eq("id", user.id).single(),
          supabase.from("subscriptions").select("tokens_remaining, sends_remaining, sends_limit").eq("user_id", user.id).single(),
          supabase.from("companies").select("id, nom, status, emails, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("email_campaigns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("campaigns").select("id, sent_emails").eq("user_id", user.id),
          supabase.from("user_activity_logs").select("id, action_type, action_data, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
          supabase.from("user_generated_cvs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        if (profileRes.data?.first_name) setFirstName(profileRes.data.first_name);

        const tokensRemaining = subscriptionRes.data?.tokens_remaining ?? 0;
        const sendsRemaining = subscriptionRes.data?.sends_remaining ?? 0;

        const totalEmailsSent = emailsRes.count ?? 0;
        const totalCVs = cvsRes.count ?? 0;

        setStats({
          emailsFound: totalEmailsSent,
          cvsGenerated: totalCVs,
          coverLetters: 0,
          creditsUsed: 0,
          creditsRemaining: tokensRemaining,
          totalCompanies: companiesRes.data?.length ?? 0,
          campaignsSent: campaignsRes.data?.reduce((sum, c) => sum + (c.sent_emails ?? 0), 0) ?? 0,
          cvScore: null,
        });

        setRecentCompanies(companiesRes.data ?? []);
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
      barWidth: "75%",
      trend: { value: "8.2%", up: true },
      onClick: () => onNavigateToTab("emails"),
    },
    {
      label: "CV générés",
      value: stats.cvsGenerated,
      icon: <FileText className="h-5 w-5" />,
      iconBg: "bg-primary/10 text-primary",
      bar: "bg-primary",
      barWidth: "60%",
      trend: { value: "12.5%", up: true },
      onClick: () => onNavigateToTab("cv-score"),
    },
    {
      label: "Emails de candidature",
      value: stats.emailsFound,
      icon: <PenLine className="h-5 w-5" />,
      iconBg: "bg-orange-50 text-orange-500",
      bar: "bg-orange-500",
      barWidth: "45%",
      trend: { value: "0.0%", neutral: true },
      onClick: () => onNavigateToTab("campaigns"),
    },
    {
      label: "Crédits restants",
      value: stats.creditsRemaining,
      icon: <Zap className="h-5 w-5" />,
      iconBg: "bg-red-50 text-red-500",
      bar: "bg-red-500",
      barWidth: "85%",
      trend: { value: "2.1%", up: false },
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
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                card.trend.up ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" :
                card.trend.neutral ? "bg-muted text-muted-foreground" :
                "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
              )}>
                {card.trend.up ? <TrendingUp className="h-2.5 w-2.5" /> :
                 card.trend.neutral ? <Minus className="h-2.5 w-2.5" /> :
                 <TrendingDown className="h-2.5 w-2.5" />}
                {card.trend.value}
              </span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{card.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
              {card.value.toLocaleString("fr-FR")}
            </p>
            <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
              <div className={cn("h-1.5 rounded-full transition-all duration-700", card.bar)} style={{ width: card.barWidth }} />
            </div>
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
                <p className="text-sm text-muted-foreground">Applications vs. réponses sur 7 jours</p>
              </div>
              <div className="flex bg-muted p-1 rounded-lg border border-border">
                <button className="px-3 py-1 text-xs font-medium rounded-md bg-card text-foreground shadow-sm">Semaine</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">Mois</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-foreground">Année</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={performanceData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(263 75% 58%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(263 75% 58%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="applications" name="Candidatures" stroke="hsl(263 75% 58%)" strokeWidth={3} fill="url(#colorApps)" />
                <Area type="monotone" dataKey="responses" name="Réponses" stroke="#22C55E" strokeWidth={3} fill="url(#colorResp)" />
              </AreaChart>
            </ResponsiveContainer>
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

          {/* Quick Finder */}
          <div
            className="rounded-xl p-6 relative overflow-hidden cursor-pointer"
            style={{ background: "linear-gradient(135deg, hsl(263 75% 58%), hsl(263 75% 42%))" }}
            onClick={() => onNavigateToTab("emails", "search")}
          >
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-lg text-white">Quick Finder</h3>
              </div>
              <p className="text-white/80 text-sm mb-4">Trouvez instantanément des emails vérifiés pour n'importe quel domaine.</p>
              <div className="space-y-2">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="entreprise.fr"
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg text-foreground text-sm border-0 bg-white focus:ring-2 focus:ring-white/50 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <button
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                  onClick={() => onNavigateToTab("emails", "search")}
                >
                  Trouver des emails <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
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

          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-base font-bold text-foreground mb-4">Activité récente</h3>
            {activity.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Aucune activité enregistrée</p>
            ) : (
              <div className="space-y-4">
                {activity.map((item, idx) => {
                  const cfg = activityIcons[item.action_type] ?? activityIcons.tab_change;
                  const label = activityLabels[item.action_type] ?? item.action_type;
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", cfg.color)}>
                          {cfg.icon}
                        </div>
                        {idx < activity.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                      </div>
                      <div className="pb-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
