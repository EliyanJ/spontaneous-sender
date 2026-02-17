import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, MessageSquare, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
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

const STATUS_CONFIG = {
  open: { label: "Ouvert", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-800", icon: RefreshCw },
  closed: { label: "Fermé", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "bg-red-100 text-red-800", icon: XCircle },
};

const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-500/20 text-red-400" },
  evolution: { label: "Évolution", className: "bg-purple-500/20 text-purple-400" },
  support: { label: "Support", className: "bg-blue-500/20 text-blue-400" },
  question: { label: "Question", className: "bg-cyan-500/20 text-cyan-400" },
  other: { label: "Autre", className: "bg-gray-500/20 text-gray-400" },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Faible", className: "bg-green-500/20 text-green-400" },
  medium: { label: "Moyen", className: "bg-yellow-500/20 text-yellow-400" },
  high: { label: "Élevé", className: "bg-orange-500/20 text-orange-400" },
  critical: { label: "Critique", className: "bg-red-500/20 text-red-400" },
};

const AdminTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchTickets = async () => {
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== "all") {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast.error("Erreur lors du chargement des tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string | null) => {
    const config = CATEGORY_CONFIG[category || 'support'] || CATEGORY_CONFIG.support;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getUrgencyBadge = (urgency: string | null) => {
    const config = URGENCY_CONFIG[urgency || 'medium'] || URGENCY_CONFIG.medium;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets Support</h1>
          <p className="text-muted-foreground">Gérez les demandes d'aide des utilisateurs</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="open">Ouverts</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="closed">Fermés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchTickets} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {tickets.length} ticket(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun ticket trouvé</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Thématique</TableHead>
                  <TableHead>Urgence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(ticket.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>{getCategoryBadge(ticket.category)}</TableCell>
                    <TableCell>{getUrgencyBadge(ticket.urgency)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => navigate(`/admin/tickets/${ticket.id}`)}>
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTickets;