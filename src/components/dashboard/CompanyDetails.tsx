import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Building2, Mail, MapPin, Users, Globe, FileText, Save } from 'lucide-react';

interface Company {
  id: string;
  siren: string;
  siret: string;
  nom: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  code_ape: string | null;
  libelle_ape: string | null;
  nature_juridique: string | null;
  tranche_effectif: string | null;
  website_url: string | null;
  emails: any;
  selected_email: string | null;
  status: string;
  pipeline_stage: string;
  notes: string | null;
  created_at: string;
}

export default function CompanyDetails() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      setNotes(selectedCompany.notes || '');
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
      
      if (data && data.length > 0 && !selectedCompany) {
        setSelectedCompany(data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
      toast.error('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedCompany) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ notes })
        .eq('id', selectedCompany.id);

      if (error) throw error;

      toast.success('Notes sauvegardées');
      
      // Mettre à jour la liste locale
      setCompanies(companies.map(c => 
        c.id === selectedCompany.id ? { ...c, notes } : c
      ));
      setSelectedCompany({ ...selectedCompany, notes });
    } catch (error) {
      console.error('Erreur sauvegarde notes:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'not sent': 'secondary',
      'sent': 'default',
      'responded': 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPipelineBadge = (stage: string) => {
    const colors: Record<string, string> = {
      'nouveau': 'bg-blue-500',
      'contacté': 'bg-yellow-500',
      'en discussion': 'bg-orange-500',
      'offre reçue': 'bg-green-500',
      'refusé': 'bg-red-500',
    };
    return (
      <Badge className={colors[stage] || 'bg-gray-500'}>
        {stage}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Liste des entreprises */}
      <div className="w-1/3 overflow-y-auto space-y-2">
        {companies.map((company) => (
          <Card
            key={company.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedCompany?.id === company.id ? 'border-primary shadow-md' : ''
            }`}
            onClick={() => setSelectedCompany(company)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{company.nom}</h3>
                <p className="text-sm text-muted-foreground">
                  {company.ville || 'Ville non renseignée'}
                </p>
              </div>
              {getStatusBadge(company.status)}
            </div>
            <div className="mt-2 flex gap-2">
              {getPipelineBadge(company.pipeline_stage)}
              {company.notes && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Notes
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Détails de l'entreprise */}
      <div className="flex-1 overflow-y-auto">
        {selectedCompany ? (
          <Card className="p-6">
            <div className="space-y-6">
              {/* En-tête */}
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedCompany.nom}</h2>
                <div className="flex gap-2 mb-4">
                  {getStatusBadge(selectedCompany.status)}
                  {getPipelineBadge(selectedCompany.pipeline_stage)}
                </div>
              </div>

              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">SIREN / SIRET</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.siren} / {selectedCompany.siret}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Adresse</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.adresse || 'Non renseignée'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.code_postal} {selectedCompany.ville}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Effectif</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.tranche_effectif || 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Activité (APE)</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.code_ape} - {selectedCompany.libelle_ape || 'Non renseignée'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Nature juridique</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCompany.nature_juridique || 'Non renseignée'}
                      </p>
                    </div>
                  </div>

                  {selectedCompany.website_url && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Site web</p>
                        <a
                          href={selectedCompany.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedCompany.website_url}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedCompany.selected_email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Email sélectionné</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCompany.selected_email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section Notes */}
              <div className="pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">
                  Notes et commentaires
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez vos notes sur cette entreprise..."
                  className="min-h-[200px] mb-3"
                />
                <Button
                  onClick={saveNotes}
                  disabled={saving || notes === selectedCompany.notes}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sélectionnez une entreprise pour voir les détails
          </div>
        )}
      </div>
    </div>
  );
}
