import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommuneSearch } from "@/components/ui/commune-search";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JobOffer {
  id: string;
  intitule: string;
  description?: string;
  lieuTravail?: {
    libelle?: string;
    commune?: string;
  };
  entreprise?: {
    nom?: string;
    description?: string;
  };
  typeContrat?: string;
  typeContratLibelle?: string;
  dureeTravailLibelle?: string;
  salaire?: {
    libelle?: string;
  };
  dateCreation?: string;
  origineOffre?: {
    urlOrigine?: string;
  };
  competences?: Array<{
    libelle: string;
  }>;
  formations?: Array<{
    niveauLibelle: string;
  }>;
}

interface SearchResponse {
  resultats?: JobOffer[];
  filtresPossibles?: any;
}

export const JobOffers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const [searchParams, setSearchParams] = useState({
    motsCles: "",
    commune: "",
    codePostal: "",
    typeContrat: "all",
    distance: "10",
  });

  // Note: Chargement automatique désactivé pour éviter les erreurs si l'API n'est pas configurée

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour rechercher des offres');
      }

      const params: Record<string, string> = {
        action: 'search',
        distance: searchParams.distance,
      };
      
      // Only add parameters if they have values
      if (searchParams.motsCles.trim()) {
        params.motsCles = searchParams.motsCles.trim();
      }
      
      // Utiliser le code postal si disponible, sinon utiliser commune
      if (searchParams.codePostal.trim()) {
        params.location = searchParams.codePostal.trim();
      } else if (searchParams.commune.trim()) {
        // Extraire le code postal du format "Ville (code)"
        const match = searchParams.commune.match(/\((\d{5})\)/);
        if (match) {
          params.location = match[1];
        } else {
          params.location = searchParams.commune.trim();
        }
      }
      
      // Only add typeContrat if it's not "all"
      if (searchParams.typeContrat && searchParams.typeContrat !== 'all') {
        params.typeContrat = searchParams.typeContrat;
      }

      const queryString = new URLSearchParams(params).toString();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/france-travail?${queryString}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la recherche');
      }

      const data: SearchResponse = await response.json();
      setOffers(data.resultats || []);
      
      if (!data.resultats?.length) {
        toast({
          title: "Aucun résultat",
          description: "Essayez de modifier vos critères de recherche",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les offres d'emploi",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOfferDetails = async (offerId: string) => {
    try {
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour voir les détails');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/france-travail?action=details&id=${offerId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails');
      }

      const data: JobOffer = await response.json();
      setSelectedOffer(data);
    } catch (error) {
      console.error('Details error:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails de l'offre",
      });
    }
  };

  const handleOfferClick = (offer: JobOffer) => {
    loadOfferDetails(offer.id);
  };

  return (
      <div className="space-y-6">
      <div>
          <h2 className="font-display text-3xl font-bold mb-2">Offres d'emploi</h2>
          <p className="text-muted-foreground">
            {offers.length > 0 && !loading
              ? `${offers.length} offre${offers.length > 1 ? 's' : ''} disponible${offers.length > 1 ? 's' : ''}`
              : "Recherchez des offres d'emploi parmi les opportunités disponibles"}
          </p>
        </div>

        {/* Removed configuration warning section */}

      {/* Formulaire de recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Rechercher des offres</CardTitle>
          <CardDescription>
            Utilisez les filtres ci-dessous pour affiner votre recherche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mots-clés</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Développeur, Commercial..."
                  className="pl-10"
                  value={searchParams.motsCles}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, motsCles: e.target.value })
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Localisation</label>
              <CommuneSearch
                value={searchParams.commune}
                onChange={(value, codePostal) => {
                  setSearchParams({ 
                    ...searchParams, 
                    commune: value,
                    codePostal: codePostal || "",
                  });
                }}
                placeholder="Paris, Lyon, 75001..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <p className="text-xs text-muted-foreground">
                Recherchez par ville ou code postal
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type de contrat</label>
              <Select
                value={searchParams.typeContrat}
                onValueChange={(value) =>
                  setSearchParams({ ...searchParams, typeContrat: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les contrats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les contrats</SelectItem>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="MIS">Mission intérimaire</SelectItem>
                  <SelectItem value="SAI">Saisonnier</SelectItem>
                  <SelectItem value="LIB">Libéral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Distance (km)</label>
              <Select
                value={searchParams.distance}
                onValueChange={(value) =>
                  setSearchParams({ ...searchParams, distance: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="20">20 km</SelectItem>
                  <SelectItem value="30">30 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Liste des offres */}
      <div className="space-y-4">
        {offers.map((offer) => (
          <Card
            key={offer.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleOfferClick(offer)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-xl">{offer.intitule}</CardTitle>
                  {offer.entreprise?.nom && (
                    <p className="text-sm text-muted-foreground font-medium">
                      {offer.entreprise.nom}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {offer.lieuTravail?.libelle && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {offer.lieuTravail.libelle}
                  </div>
                )}
                {offer.typeContratLibelle && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {offer.typeContratLibelle}
                  </div>
                )}
                {offer.dureeTravailLibelle && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {offer.dureeTravailLibelle}
                  </div>
                )}
              </div>
              {offer.description && (
                <p className="mt-4 text-sm line-clamp-2">{offer.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog pour les détails */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedOffer?.intitule}</DialogTitle>
            {selectedOffer?.entreprise?.nom && (
              <DialogDescription className="text-base">
                {selectedOffer.entreprise.nom}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Informations principales */}
            <div className="flex flex-wrap gap-4 text-sm">
              {selectedOffer?.lieuTravail?.libelle && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedOffer.lieuTravail.libelle}</span>
                </div>
              )}
              {selectedOffer?.typeContratLibelle && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedOffer.typeContratLibelle}</span>
                </div>
              )}
              {selectedOffer?.salaire?.libelle && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedOffer.salaire.libelle}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {selectedOffer?.description && (
              <div>
                <h3 className="font-semibold mb-2">Description du poste</h3>
                <p className="text-sm whitespace-pre-line">{selectedOffer.description}</p>
              </div>
            )}

            {/* Compétences */}
            {selectedOffer?.competences && selectedOffer.competences.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Compétences recherchées</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedOffer.competences.map((comp, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {comp.libelle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Formations */}
            {selectedOffer?.formations && selectedOffer.formations.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Formation souhaitée</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedOffer.formations.map((form, idx) => (
                    <li key={idx}>{form.niveauLibelle}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description entreprise */}
            {selectedOffer?.entreprise?.description && (
              <div>
                <h3 className="font-semibold mb-2">À propos de l'entreprise</h3>
                <p className="text-sm whitespace-pre-line">
                  {selectedOffer.entreprise.description}
                </p>
              </div>
            )}

            {/* Lien vers l'offre */}
            {selectedOffer?.origineOffre?.urlOrigine && (
              <Button
                className="w-full"
                onClick={() => window.open(selectedOffer.origineOffre?.urlOrigine, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Postuler sur le site
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
