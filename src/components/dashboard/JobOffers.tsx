import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, Clock, ExternalLink, Euro, Bookmark, Building2, X, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CommuneSearch } from "@/components/ui/commune-search";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const PAGE_SIZE = 10;

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

const getContractBadgeClasses = (type?: string) => {
  switch (type) {
    case "CDI": return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    case "CDD": return "bg-purple-500/20 text-purple-300 border border-purple-500/30";
    case "MIS": return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    case "SAI": return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
    case "LIB": return "bg-teal-500/20 text-teal-300 border border-teal-500/30";
    default: return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
  }
};

export const JobOffers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const initialLoadDone = useRef(false);
  
  const [searchParams, setSearchParams] = useState({
    motsCles: "",
    commune: "",
    codePostal: "",
    typeContrat: "all",
    distance: "10",
  });

  // Auto-load offers on mount
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Vous devez être connecté pour rechercher des offres');
      }

      const params: Record<string, string> = {
        action: 'search',
        distance: searchParams.distance,
      };
      
      if (searchParams.motsCles.trim()) {
        params.motsCles = searchParams.motsCles.trim();
      }
      
      if (searchParams.codePostal.trim()) {
        params.location = searchParams.codePostal.trim();
      } else if (searchParams.commune.trim()) {
        const match = searchParams.commune.match(/\((\d{5})\)/);
        if (match) {
          params.location = match[1];
        } else {
          params.location = searchParams.commune.trim();
        }
      }
      
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
      setCurrentPage(1);
      
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

  const totalPages = Math.ceil(offers.length / PAGE_SIZE);
  const paginatedOffers = offers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Offres d'emploi</h2>
          <p className="text-sm text-gray-400 mt-1">
            Recherchez des offres via{" "}
            <span className="inline-flex items-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded px-2 py-0.5 text-xs font-medium">
              France Travail
            </span>
          </p>
        </div>
        {offers.length > 0 && !loading && (
          <div className="flex items-center gap-2 bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-full px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm text-gray-300">
              {offers.length} offre{offers.length > 1 ? "s" : ""} trouvée{offers.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Search Card */}
      <div className="relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Keywords */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mots-clés</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Développeur, Commercial..."
                  className="w-full bg-[#121215]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                  value={searchParams.motsCles}
                  onChange={(e) => setSearchParams({ ...searchParams, motsCles: e.target.value })}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>

            {/* Location */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Localisation</label>
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
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>

            {/* Contract type */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Contrat</label>
              <Select
                value={searchParams.typeContrat}
                onValueChange={(value) => setSearchParams({ ...searchParams, typeContrat: value })}
              >
                <SelectTrigger className="bg-[#121215]/60 border-white/10 rounded-xl h-[46px] text-sm text-white focus:border-indigo-500 focus:ring-indigo-500/20">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="MIS">Intérim</SelectItem>
                  <SelectItem value="SAI">Saisonnier</SelectItem>
                  <SelectItem value="LIB">Libéral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Distance */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Distance</label>
              <Select
                value={searchParams.distance}
                onValueChange={(value) => setSearchParams({ ...searchParams, distance: value })}
              >
                <SelectTrigger className="bg-[#121215]/60 border-white/10 rounded-xl h-[46px] text-sm text-white focus:border-indigo-500 focus:ring-indigo-500/20">
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

          {/* Search button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Rechercher
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse text-sm">Recherche des meilleures offres en cours...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && offers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 rounded-full bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">Lancez une recherche</h3>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            Utilisez les filtres ci-dessus pour trouver des offres d'emploi correspondant à votre profil
          </p>
        </div>
      )}

      {/* Results list */}
      {!loading && offers.length > 0 && (
        <div className="space-y-3">
          {paginatedOffers.map((offer) => (
            <div
              key={offer.id}
              onClick={() => handleOfferClick(offer)}
              className="group relative bg-[#18181b]/60 backdrop-blur-xl border border-white/[0.08] rounded-xl p-5 cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-500 hover:bg-indigo-500/5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title + contract badge */}
                  <div className="flex items-start gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {offer.intitule}
                    </h3>
                    {offer.typeContratLibelle && (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getContractBadgeClasses(offer.typeContrat)}`}>
                        {offer.typeContratLibelle}
                      </span>
                    )}
                  </div>

                  {/* Company name */}
                  {offer.entreprise?.nom && (
                    <p className="text-indigo-400 font-medium text-sm">{offer.entreprise.nom}</p>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4">
                    {offer.lieuTravail?.libelle && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {offer.lieuTravail.libelle}
                      </span>
                    )}
                    {offer.dureeTravailLibelle && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {offer.dureeTravailLibelle}
                      </span>
                    )}
                    {offer.salaire?.libelle && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Euro className="h-3.5 w-3.5" />
                        {offer.salaire.libelle}
                      </span>
                    )}
                    {offer.dateCreation && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        Publié {formatDistanceToNow(new Date(offer.dateCreation), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {offer.description && (
                    <p className="text-sm text-gray-300/80 line-clamp-2">{offer.description}</p>
                  )}

                  {/* Competences */}
                  {offer.competences && offer.competences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {offer.competences.slice(0, 5).map((comp, idx) => (
                        <span key={idx} className="bg-[#27272a]/80 text-gray-300 text-xs border border-white/5 rounded-full px-2.5 py-0.5">
                          {comp.libelle}
                        </span>
                      ))}
                      {offer.competences.length > 5 && (
                        <span className="text-xs text-gray-500">+{offer.competences.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Hover CTA */}
                  <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Voir les détails →
                  </span>
                </div>

                {/* Bookmark button (desktop) */}
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-[#18181b] border border-white/10 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors shrink-0"
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#18181b] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    page === currentPage
                      ? "bg-indigo-600 text-white border border-indigo-500"
                      : "bg-[#18181b] border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#18181b] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-center text-xs text-gray-500 pb-1">
            {offers.length} offre{offers.length > 1 ? "s" : ""} · page {currentPage}/{totalPages}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOffer(null)}>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#121215]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-[#121215]/95 backdrop-blur-2xl border-b border-white/[0.08] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedOffer.intitule}</h2>
                {selectedOffer.entreprise?.nom && (
                  <div className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4 text-indigo-400" />
                    <span className="text-indigo-400 font-medium text-sm">{selectedOffer.entreprise.nom}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#18181b] border border-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Metadata badges */}
              <div className="flex flex-wrap gap-3">
                {selectedOffer.lieuTravail?.libelle && (
                  <div className="flex items-center gap-2 bg-[#18181b]/60 border border-white/10 rounded-lg px-3 py-2">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm text-gray-300">{selectedOffer.lieuTravail.libelle}</span>
                  </div>
                )}
                {selectedOffer.typeContratLibelle && (
                  <div className="flex items-center gap-2 bg-[#18181b]/60 border border-white/10 rounded-lg px-3 py-2">
                    <Briefcase className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm text-gray-300">{selectedOffer.typeContratLibelle}</span>
                  </div>
                )}
                {selectedOffer.dureeTravailLibelle && (
                  <div className="flex items-center gap-2 bg-[#18181b]/60 border border-white/10 rounded-lg px-3 py-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm text-gray-300">{selectedOffer.dureeTravailLibelle}</span>
                  </div>
                )}
                {selectedOffer.salaire?.libelle && (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <Euro className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">{selectedOffer.salaire.libelle}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedOffer.description && (
                <div>
                  <h3 className="font-semibold text-white mb-3 border-l-2 border-indigo-500 pl-3">Description du poste</h3>
                  <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{selectedOffer.description}</p>
                </div>
              )}

              {/* Competences */}
              {selectedOffer.competences && selectedOffer.competences.length > 0 && (
                <div>
                  <h3 className="font-semibold text-white mb-3 border-l-2 border-indigo-500 pl-3">Compétences recherchées</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.competences.map((comp, idx) => (
                      <span key={idx} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full px-3 py-1 text-sm">
                        {comp.libelle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Formations */}
              {selectedOffer.formations && selectedOffer.formations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-white mb-3 border-l-2 border-indigo-500 pl-3">Formation souhaitée</h3>
                  <ul className="space-y-2">
                    {selectedOffer.formations.map((form, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                        <GraduationCap className="h-4 w-4 text-indigo-400 shrink-0" />
                        {form.niveauLibelle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Company description */}
              {selectedOffer.entreprise?.description && (
                <div>
                  <h3 className="font-semibold text-white mb-3 border-l-2 border-indigo-500 pl-3">À propos de l'entreprise</h3>
                  <div className="bg-[#18181b]/40 border border-white/10 rounded-xl p-4">
                    <p className="text-sm text-gray-300 whitespace-pre-line">{selectedOffer.entreprise.description}</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              {selectedOffer.origineOffre?.urlOrigine && (
                <div className="pt-2 border-t border-white/[0.08] space-y-2">
                  <button
                    onClick={() => window.open(selectedOffer.origineOffre?.urlOrigine, "_blank")}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black font-semibold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Postuler sur le site
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Vous serez redirigé vers le site du recruteur pour finaliser votre candidature
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
