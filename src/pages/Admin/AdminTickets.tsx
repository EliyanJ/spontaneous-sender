import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, MessageSquare, Clock, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
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

const AdminTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
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

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResponse(ticket.admin_response || "");
    setNewStatus(ticket.status);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    setUpdating(true);
    try {
      const updates: Partial<SupportTicket> = {
        status: newStatus,
      };

      if (response.trim()) {
        updates.admin_response = response.trim();
        updates.responded_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success("Ticket mis à jour avec succès");
      setSelectedTicket(null);
      fetchTickets();
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

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
                  <TableHead>Page</TableHead>
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
                    <TableCell className="max-w-[300px] truncate font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      <code className="text-xs">{ticket.current_page}</code>
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleOpenTicket(ticket)}>
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

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket: {selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Créé le {selectedTicket && format(new Date(selectedTicket.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Description:</h4>
                <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.current_page && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Page:</span>
                  <code className="bg-muted px-2 py-1 rounded">{selectedTicket.current_page}</code>
                  <a 
                    href={`https://getcronos.fr${selectedTicket.current_page}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir
                  </a>
                </div>
              )}

              <div className="space-y-2">
                <label className="font-medium">Statut:</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="font-medium">Réponse admin:</label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Votre réponse..."
                  rows={4}
                />
              </div>

              {selectedTicket.responded_at && (
                <p className="text-sm text-muted-foreground">
                  Dernière réponse: {format(new Date(selectedTicket.responded_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                  Annuler
                </Button>
                <Button onClick={handleUpdateTicket} disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    "Mettre à jour"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTickets;