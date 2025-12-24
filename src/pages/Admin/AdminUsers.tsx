import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Mail, Building2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  companies_count: number;
  emails_count: number;
  last_activity: string | null;
}

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Get profiles with stats
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, created_at');

        if (error) throw error;

        // For each profile, get their stats
        const usersWithStats = await Promise.all(
          (profiles || []).map(async (profile) => {
            // Get companies count
            const { count: companiesCount } = await supabase
              .from('companies')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            // Get emails count
            const { count: emailsCount } = await supabase
              .from('email_campaigns')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id);

            // Get last activity
            const { data: lastActivity } = await supabase
              .from('user_activity_logs')
              .select('created_at')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              id: profile.id,
              email: profile.id, // We'll show the ID since we can't access auth.users
              created_at: profile.created_at,
              full_name: profile.full_name,
              companies_count: companiesCount || 0,
              emails_count: emailsCount || 0,
              last_activity: lastActivity?.created_at || null
            };
          })
        );

        setUsers(usersWithStats);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground mt-1">{users.length} utilisateurs inscrits</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-foreground">
                      {user.full_name || 'Sans nom'}
                    </span>
                    {user.companies_count > 100 && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
                        Power User
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {user.companies_count} entreprises
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {user.emails_count} emails
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Inscrit le {format(new Date(user.created_at), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="shrink-0"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
