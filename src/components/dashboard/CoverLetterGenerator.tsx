import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, FileText, Copy, Download, Sparkles, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface Company {
  id: string;
  nom: string;
  ville: string | null;
  libelle_ape: string | null;
  website_url: string | null;
  selected_email: string | null;
}

const CoverLetterGenerator = () => {
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch user's companies
  const { data: companies = [] } = useQuery({
    queryKey: ['companies-for-cover-letter', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('id, nom, ville, libelle_ape, website_url, selected_email')
        .eq('user_id', user.id)
        .order('nom');
      
      if (error) throw error;
      return data as Company[];
    },
    enabled: !!user,
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile-for-cover-letter', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, education, linkedin_url, cv_content')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleGenerate = async () => {
    if (!selectedCompanyId) {
      toast.error("Veuillez sélectionner une entreprise");
      return;
    }

    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;

    setLoading(true);
    setCoverLetter("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: {
          company,
          cvContent: profile?.cv_content,
          userProfile: profile ? {
            fullName: profile.full_name,
            education: profile.education,
            linkedinUrl: profile.linkedin_url,
          } : null,
        },
      });

      if (error) throw error;

      if (data.success && data.coverLetter) {
        setCoverLetter(data.coverLetter);
        toast.success("Lettre de motivation générée !");
      } else {
        throw new Error(data.error || "Erreur lors de la génération");
      }
    } catch (error: any) {
      console.error('Error generating cover letter:', error);
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter);
    toast.success("Copié dans le presse-papiers !");
  };

  const handleDownload = () => {
    const company = companies.find(c => c.id === selectedCompanyId);
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lettre-motivation-${company?.nom || 'entreprise'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Lettre téléchargée !");
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Générateur de Lettres de Motivation
          </CardTitle>
          <CardDescription>
            Créez une lettre de motivation personnalisée basée sur votre profil et l'entreprise cible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sélectionner une entreprise</label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une entreprise..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{company.nom}</span>
                      {company.ville && (
                        <span className="text-muted-foreground text-xs">({company.ville})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCompany && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p><strong>{selectedCompany.nom}</strong></p>
              {selectedCompany.ville && <p className="text-muted-foreground">📍 {selectedCompany.ville}</p>}
              {selectedCompany.libelle_ape && <p className="text-muted-foreground">🏭 {selectedCompany.libelle_ape}</p>}
              {selectedCompany.website_url && (
                <p className="text-muted-foreground">
                  🌐 <a href={selectedCompany.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {selectedCompany.website_url}
                  </a>
                </p>
              )}
            </div>
          )}

          {!profile?.cv_content && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
              ⚠️ Ajoutez votre CV dans les paramètres pour une meilleure personnalisation
            </div>
          )}

          <Button 
            onClick={handleGenerate} 
            disabled={loading || !selectedCompanyId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer la lettre de motivation
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {coverLetter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Lettre générée</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copier
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CoverLetterGenerator;