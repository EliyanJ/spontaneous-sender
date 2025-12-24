import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActivityLog {
  id: string;
  user_id: string;
  session_id: string;
  action_type: string;
  action_data: any;
  created_at: string;
  duration_ms: number | null;
}

export const AdminActivity = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq('action_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const getActionStyle = (actionType: string) => {
    const styles: Record<string, { label: string; color: string; emoji: string }> = {
      'session_start': { label: 'Session', emoji: '🟢', color: 'bg-green-500/20 text-green-400' },
      'session_end': { label: 'Fin session', emoji: '🔴', color: 'bg-red-500/20 text-red-400' },
      'tab_change': { label: 'Navigation', emoji: '📑', color: 'bg-blue-500/20 text-blue-400' },
      'search_mode_selected': { label: 'Mode recherche', emoji: '🔀', color: 'bg-indigo-500/20 text-indigo-400' },
      'search_started': { label: 'Recherche', emoji: '🔍', color: 'bg-yellow-500/20 text-yellow-400' },
      'search_completed': { label: 'Résultats', emoji: '✅', color: 'bg-green-500/20 text-green-400' },
      'company_added': { label: 'Entreprise', emoji: '🏢', color: 'bg-cyan-500/20 text-cyan-400' },
      'email_compose_started': { label: 'Rédaction', emoji: '✏️', color: 'bg-orange-500/20 text-orange-400' },
      'email_sent': { label: 'Email envoyé', emoji: '📧', color: 'bg-purple-500/20 text-purple-400' },
      'email_scheduled': { label: 'Email planifié', emoji: '📅', color: 'bg-pink-500/20 text-pink-400' },
      'error': { label: 'Erreur', emoji: '❌', color: 'bg-red-500/20 text-red-400' },
    };
    return styles[actionType] || { label: actionType, emoji: '📌', color: 'bg-gray-500/20 text-gray-400' };
  };

  const actionTypes = [
    "all",
    "session_start",
    "session_end",
    "tab_change",
    "search_started",
    "search_completed",
    "email_sent",
    "company_added",
    "error"
  ];

  // Group activities by session
  const groupedBySession = activities.reduce((acc, activity) => {
    if (!acc[activity.session_id]) {
      acc[activity.session_id] = [];
    }
    acc[activity.session_id].push(activity);
    return acc;
  }, {} as Record<string, ActivityLog[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activité globale</h1>
          <p className="text-muted-foreground mt-1">Timeline des actions utilisateurs</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              {actionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "Tous" : getActionStyle(type).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchActivities}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Timeline ({activities.length} actions)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Aucune activité enregistrée. Le tracking commencera automatiquement.
            </p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {activities.map((activity) => {
                const style = getActionStyle(activity.action_type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/30 transition-colors"
                  >
                    <span className="text-lg">{style.emoji}</span>
                    <Badge className={style.color}>{style.label}</Badge>
                    <span className="text-xs text-muted-foreground font-mono flex-1 truncate">
                      {activity.user_id.slice(0, 8)}...
                    </span>
                    {activity.action_data && (
                      <span className="text-xs text-muted-foreground max-w-48 truncate hidden md:block">
                        {JSON.stringify(activity.action_data)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(activity.created_at), "dd/MM HH:mm:ss", { locale: fr })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
