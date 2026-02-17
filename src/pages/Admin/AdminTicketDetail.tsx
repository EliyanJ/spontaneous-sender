import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Clock, CheckCircle, XCircle, RefreshCw, ExternalLink, AlertTriangle, User, Tag, Flame } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  screenshot_url: string | null;
  current_page: string | null;
  status: string;
  category: string | null;
  urgency: string | null;
  assigned_to: string | null;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  user_id: string;
  role: string;
  full_name: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  open: { label: "Non traité", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  in_progress: { label: "En cours", className: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: RefreshCw },
  closed: { label: "Traité", className: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  rejected: { label: "Rejeté", className: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  evolution: { label: "Évolution", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  support: { label: "Demande de support", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  question: { label: "Question", className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  other: { label: "Autre", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Faible", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  medium: { label: "Moyen", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  high: { label: "Élevé", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  critical: { label: "Critique", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const AdminTicketDetail = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUrgency, setNewUrgency] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!ticketId) return;

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (error) throw error;
        const t = data as SupportTicket;
        setTicket(t);
        setResponse(t.admin_response || "");
        setNewStatus(t.status);
        setNewCategory(t.category || "support");
        setNewUrgency(t.urgency || "medium");
        setNewAssignee(t.assigned_to || "");

        // Fetch team members (admins/support)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['admin', 'support']);

        if (roles && roles.length > 0) {
          const userIds = roles.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          setTeamMembers(roles.map(r => ({
            user_id: r.user_id,
            role: r.role,
            full_name: profiles?.find(p => p.id === r.user_id)?.full_name || null,
          })));
        }
      } catch (error) {
        console.error('Error fetching ticket:', error);
        toast.error("Erreur lors du chargement du ticket");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticketId]);

  const handleUpdate = async () => {
    if (!ticket) return;
    setUpdating(true);
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        category: newCategory,
        urgency: newUrgency,
        assigned_to: newAssignee || null,
      };

      if (response.trim()) {
        updates.admin_response = response.trim();
        updates.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticket.id);

      if (error) throw error;
      toast.success("Ticket mis à jour");

      // Refresh
      const { data } = await supabase.from('support_tickets').select('*').eq('id', ticket.id).single();
      if (data) setTicket(data as SupportTicket);
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket non trouvé</p>
        <Button onClick={() => navigate('/admin/tickets')} className="mt-4">Retour</Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tickets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            Créé le {format(new Date(ticket.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
            {' · '}
            <span className="font-mono text-xs">{ticket.user_id.slice(0, 8)}...</span>
          </p>
        </div>
        <Badge variant="outline" className={statusConfig.className}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Screenshot */}
          {ticket.screenshot_url && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Capture d'écran</CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={ticket.screenshot_url} 
                  alt="Screenshot" 
                  className="rounded-lg border border-border max-w-full"
                />
              </CardContent>
            </Card>
          )}

          {/* Response */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Réponse admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Votre réponse..."
                rows={6}
              />
              {ticket.responded_at && (
                <p className="text-xs text-muted-foreground">
                  Dernière réponse : {format(new Date(ticket.responded_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Page */}
          {ticket.current_page && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Page concernée</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{ticket.current_page}</code>
                  <a
                    href={`https://getcronos.fr${ticket.current_page}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Statut
                </label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Non traité</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="closed">Traité</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> Thématique
                </label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="evolution">Évolution</SelectItem>
                    <SelectItem value="support">Demande de support</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" /> Urgence
                </label>
                <Select value={newUrgency} onValueChange={setNewUrgency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Assigné à
                </label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Non assigné</SelectItem>
                    {teamMembers.map(m => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name || m.user_id.slice(0, 8)} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <Button onClick={handleUpdate} disabled={updating} className="w-full">
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminTicketDetail;
