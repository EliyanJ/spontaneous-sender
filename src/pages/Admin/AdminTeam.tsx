import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCog, Plus, Trash2, Shield, HeadphonesIcon, BarChart } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'support' | 'analyst' | 'user';
  created_at: string;
  granted_by: string | null;
  user_name?: string;
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-red-500/20 text-red-400' },
  support: { label: 'Support', icon: HeadphonesIcon, color: 'bg-blue-500/20 text-blue-400' },
  analyst: { label: 'Analyst', icon: BarChart, color: 'bg-green-500/20 text-green-400' },
  user: { label: 'User', icon: UserCog, color: 'bg-gray-500/20 text-gray-400' },
};

export const AdminTeam = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<'admin' | 'support' | 'analyst'>('support');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names for each user
      const membersWithNames = await Promise.all(
        (data || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', member.user_id)
            .single();
          
          return {
            ...member,
            user_name: profile?.full_name || null
          };
        })
      );

      setMembers(membersWithNames);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const addMember = async () => {
    if (!newUserId.trim()) {
      toast.error('Veuillez entrer un User ID');
      return;
    }

    setAdding(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUserId.trim(),
          role: newRole,
          granted_by: user?.id
        });

      if (error) throw error;

      toast.success('Membre ajouté avec succès');
      setNewUserId("");
      setDialogOpen(false);
      fetchTeam();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Membre retiré');
      fetchTeam();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const updateRole = async (id: string, newRole: 'admin' | 'support' | 'analyst' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', id);

      if (error) throw error;

      toast.success('Rôle mis à jour');
      fetchTeam();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

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
          <h1 className="text-3xl font-bold text-foreground">Équipe</h1>
          <p className="text-muted-foreground mt-1">Gérer les accès et rôles de l'équipe</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un membre à l'équipe</DialogTitle>
              <DialogDescription>
                Entrez le User ID de l'utilisateur et sélectionnez son rôle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground">User ID</label>
                <Input
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Rôle</label>
                <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Accès complet</SelectItem>
                    <SelectItem value="support">Support - Gestion utilisateurs</SelectItem>
                    <SelectItem value="analyst">Analyst - Analytics seulement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addMember} disabled={adding} className="w-full">
                {adding ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Membres de l'équipe ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun membre dans l'équipe. Ajoutez-en un !
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => {
                const config = ROLE_CONFIG[member.role];
                const RoleIcon = config.icon;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <RoleIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.user_name || 'Sans nom'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {member.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select 
                        value={member.role} 
                        onValueChange={(v: any) => updateRole(member.id, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground hidden md:block">
                        Depuis {format(new Date(member.created_at), "dd MMM yyyy", { locale: fr })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles explanation */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Permissions par rôle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="font-semibold">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Accès complet au dashboard</li>
                <li>• Gestion des utilisateurs</li>
                <li>• Gestion de l'équipe</li>
                <li>• Voir toutes les analytics</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <HeadphonesIcon className="h-4 w-4 text-blue-400" />
                <span className="font-semibold">Support</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Voir les utilisateurs</li>
                <li>• Voir l'activité</li>
                <li>• Pas de gestion équipe</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <BarChart className="h-4 w-4 text-green-400" />
                <span className="font-semibold">Analyst</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Voir les analytics</li>
                <li>• Pas d'accès utilisateurs</li>
                <li>• Lecture seule</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
