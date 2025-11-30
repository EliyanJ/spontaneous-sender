import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Mail, 
  MapPin, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Search,
  Clock,
  Save,
  X,
  FileText,
  Trash2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Company {
  id: string;
  nom: string;
  ville: string | null;
  code_postal: string | null;
  selected_email: string | null;
  status: string | null;
  pipeline_stage: string | null;
  website_url: string | null;
  libelle_ape: string | null;
  notes: string | null;
  siren: string;
  siret: string;
  adresse: string | null;
  code_ape: string | null;
}

interface Stats {
  totalSent: number;
  successful: number;
  bounces: number;
  pending: number;
  successRate: number;
  totalCompanies: number;
}

type TabType = "saved" | "history";

interface EntreprisesProps {
  onNavigateToTab?: (tab: string) => void;
}

export const Entreprises = ({ onNavigateToTab }: EntreprisesProps) => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("saved");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalSent: 0,
    successful: 0,
    bounces: 0,
    pending: 0,
    successRate: 0,
    totalCompanies: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      setNotes(selectedCompany.notes || "");
    }
  }, [selectedCompany]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Load statistics
      const { data: campaigns, error: statsError } = await supabase
        .from("email_campaigns")
        .select("status")
        .eq("user_id", user.id);

      if (statsError) throw statsError;

      if (campaigns) {
        const totalSent = campaigns.filter(c => c.status === 'sent' || c.status === 'bounce').length;
        const successful = campaigns.filter(c => c.status === 'sent').length;
        const bounces = campaigns.filter(c => c.status === 'bounce').length;
        const pending = campaigns.filter(c => c.status === 'pending').length;
        const successRate = totalSent > 0 ? (successful / totalSent) * 100 : 0;

        setStats({
          totalSent,
          successful,
          bounces,
          pending,
          successRate,
          totalCompanies: companiesData?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedCompany) return;
    
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ notes })
        .eq("id", selectedCompany.id);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany.id ? { ...c, notes } : c
      ));
      setSelectedCompany(prev => prev ? { ...prev, notes } : null);

      toast({
        title: "Notes sauvegardées",
        description: "Les notes ont été mises à jour",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les notes",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const deleteCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);

      if (error) throw error;

      setCompanies(prev => prev.filter(c => c.id !== companyId));
      setSelectedCompany(null);

      toast({
        title: "Entreprise supprimée",
        description: "L'entreprise a été retirée de votre liste",
      });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entreprise",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "not sent": { label: "Non envoyé", variant: "secondary" },
      "sent": { label: "Envoyé", variant: "default" },
      "replied": { label: "Répondu", variant: "outline" },
      "bounce": { label: "Bounce", variant: "destructive" },
    };
    const cfg = config[status || "not sent"] || { label: status || "Non défini", variant: "secondary" };
    return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
  };

  // Filter companies based on tab and search
  const filteredCompanies = companies.filter(company => {
    // Tab filter
    const isSaved = company.status === "not sent" || !company.status;
    const isHistory = company.status === "sent" || company.status === "replied" || company.status === "bounce";
    
    if (activeTab === "saved" && !isSaved) return false;
    if (activeTab === "history" && !isHistory) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        company.nom.toLowerCase().includes(query) ||
        company.ville?.toLowerCase().includes(query) ||
        company.libelle_ape?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const savedCount = companies.filter(c => c.status === "not sent" || !c.status).length;
  const historyCount = companies.filter(c => c.status === "sent" || c.status === "replied" || c.status === "bounce").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-foreground">Entreprises</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {companies.length} entreprise{companies.length > 1 ? 's' : ''} au total
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Stats Panel Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistiques
              </Button>
            </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Statistiques d'envoi
              </SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalSent}</p>
                        <p className="text-xs text-muted-foreground">Emails envoyés</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">{stats.successful}</p>
                        <p className="text-xs text-muted-foreground">Réussis</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{stats.bounces}</p>
                        <p className="text-xs text-muted-foreground">Bounces</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.successRate.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Taux de succès</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress bar */}
              <Card className="bg-card/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{stats.successful} / {stats.totalSent}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${stats.successRate}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-card/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total entreprises</span>
                    <span className="font-semibold">{stats.totalCompanies}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">En attente</span>
                    <span className="font-semibold">{stats.pending}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Next Step Button */}
        {onNavigateToTab && (
          <Button onClick={() => onNavigateToTab('emails')} className="gap-2">
            Rechercher des emails
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "saved" ? "default" : "outline"}
          onClick={() => setActiveTab("saved")}
          className="gap-2"
        >
          <Building2 className="h-4 w-4" />
          Sauvegardées
          <Badge variant="secondary" className="ml-1">{savedCount}</Badge>
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "outline"}
          onClick={() => setActiveTab("history")}
          className="gap-2"
        >
          <Clock className="h-4 w-4" />
          Historique
          <Badge variant="secondary" className="ml-1">{historyCount}</Badge>
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une entreprise par nom, ville ou secteur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Companies List */}
      {filteredCompanies.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery 
                ? "Aucune entreprise trouvée pour cette recherche"
                : activeTab === "saved" 
                  ? "Aucune entreprise sauvegardée" 
                  : "Aucune entreprise dans l'historique"
              }
            </p>
            {!searchQuery && activeTab === "saved" && (
              <p className="text-sm text-muted-foreground mt-1">
                Utilisez l'onglet Recherche pour trouver des entreprises
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredCompanies.map((company) => (
            <Card 
              key={company.id} 
              className="bg-card/50 hover:bg-card/70 transition-colors group cursor-pointer"
              onClick={() => setSelectedCompany(company)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">{company.nom}</h3>
                        {company.website_url && (
                          <a 
                            href={company.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                        {company.notes && (
                          <FileText className="h-3 w-3 text-primary/60" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {company.ville && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {company.ville}
                          </span>
                        )}
                        {company.selected_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {company.selected_email}
                          </span>
                        )}
                      </div>
                      {company.libelle_ape && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {company.libelle_ape}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-4">
                    {getStatusBadge(company.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Company Details Sheet */}
      <Sheet open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {selectedCompany.nom}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Company Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    {getStatusBadge(selectedCompany.status)}
                  </div>
                  
                  {selectedCompany.ville && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ville</span>
                      <span className="text-sm font-medium">
                        {selectedCompany.ville} {selectedCompany.code_postal && `(${selectedCompany.code_postal})`}
                      </span>
                    </div>
                  )}
                  
                  {selectedCompany.adresse && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-muted-foreground shrink-0">Adresse</span>
                      <span className="text-sm font-medium text-right">{selectedCompany.adresse}</span>
                    </div>
                  )}
                  
                  {selectedCompany.selected_email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-medium">{selectedCompany.selected_email}</span>
                    </div>
                  )}
                  
                  {selectedCompany.website_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Site web</span>
                      <a 
                        href={selectedCompany.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        Visiter <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  
                  {selectedCompany.libelle_ape && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-muted-foreground shrink-0">Secteur</span>
                      <span className="text-sm font-medium text-right">{selectedCompany.libelle_ape}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SIREN</span>
                    <span className="text-sm font-medium font-mono">{selectedCompany.siren}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SIRET</span>
                    <span className="text-sm font-medium font-mono">{selectedCompany.siret}</span>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Notes personnelles</label>
                  <Textarea
                    placeholder="Ajoutez vos notes sur cette entreprise..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <Button 
                    onClick={saveNotes} 
                    disabled={savingNotes}
                    className="w-full gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {savingNotes ? "Sauvegarde..." : "Sauvegarder les notes"}
                  </Button>
                </div>

                {/* Delete Action */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Supprimer de ma liste
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette entreprise ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. L'entreprise sera retirée de votre liste.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteCompany(selectedCompany.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
