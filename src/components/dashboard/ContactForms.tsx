import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  nom: string;
  ville: string | null;
  code_postal: string | null;
  website_url: string | null;
}

export const ContactForms = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, nom, ville, code_postal, website_url")
        .eq("has_contact_form", true)
        .order("nom");

      if (error) throw error;

      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading contact forms:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les entreprises avec formulaire",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Aucune entreprise avec formulaire
        </h3>
        <p className="text-muted-foreground">
          Les entreprises avec formulaire de contact apparaîtront ici après vos recherches d'emails
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {companies.length} entreprise{companies.length > 1 ? 's' : ''} avec formulaire de contact
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map((company) => (
          <Card
            key={company.id}
            className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {company.nom}
                  </h4>
                  {(company.ville || company.code_postal) && (
                    <p className="text-sm text-muted-foreground mb-3">
                      📍 {company.code_postal} {company.ville}
                    </p>
                  )}
                </div>
              </div>

              {company.website_url && (
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Accéder au formulaire
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
