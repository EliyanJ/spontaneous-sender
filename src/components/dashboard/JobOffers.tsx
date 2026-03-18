import { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Briefcase, Clock, ExternalLink, Euro, Bookmark, BookmarkCheck, Building2, X, GraduationCap, ChevronLeft, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
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
  lieuTravail?: { libelle?: string; commune?: string };
  entreprise?: { nom?: string; description?: string };
  typeContrat?: string;
  typeContratLibelle?: string;
  dureeTravailLibelle?: string;
  salaire?: { libelle?: string };
  dateCreation?: string;
  origineOffre?: { urlOrigine?: string };
  competences?: Array<{ libelle: string }>;
  formations?: Array<{ niveauLibelle: string }>;
}

interface SearchResponse {
  resultats?: JobOffer[];
  filtresPossibles?: unknown;
}

const getContractBadge = (type?: string) => {
  switch (type) {
    case "CDI": return { bg: "bg-primary/10 text-primary border border-primary/20", label: "CDI" };
    case "CDD": return { bg: "bg-violet-500/10 text-violet-600 border border-violet-500/20", label: "CDD" };
    case "MIS": return { bg: "bg-blue-500/10 text-blue-600 border border-blue-500/20", label: "Intérim" };
    case "SAI": return { bg: "bg-amber-500/10 text-amber-600 border border-amber-500/20", label: "Saisonnier" };
    case "LIB": return { bg: "bg-teal-500/10 text-teal-600 border border-teal-500/20", label: "Libéral" };
    default: return { bg: "bg-muted text-muted-foreground border border-border", label: type || "Autre" };
  }
};

const FAVORITES_KEY = "job_favorites";

const CompanyInitial = ({ name }: { name?: string }) => {
  const initial = name?.[0]?.toUpperCase() || "?";
  const colors = [
    "bg-primary/10 text-primary",
    "bg-violet-500/10 text-violet-600",
    "bg-blue-500/10 text-blue-600",
    "bg-teal-500/10 text-teal-600",
    "bg-amber-500/10 text-amber-600",
  ];
  const colorIndex = initial.charCodeAt(0) % colors.length;
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${colors[colorIndex]}`}>
      {initial}
    </div>
  );
};

export const JobOffers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<JobOffer[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  });
  const initialLoadDone = useRef(false);

  const toggleFavorite = (offer: JobOffer, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const exists = prev.some(f => f.id === offer.id);
      const next = exists ? prev.filter(f => f.id !== offer.id) : [...prev, offer];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      toast({ title: exists ? "Retiré des favoris" : "Ajouté aux favoris", description: offer.intitule });
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.some(f => f.id === id);

  const [searchParams, setSearchParams] = useState({
    motsCles: "",
    commune: "",
    codePostal: "",
    typeContrat: "all",
    distance: "10",
  });

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
      if (!session) throw new Error('Vous devez être connecté');

      const params: Record<string, string> = { action: 'search', distance: searchParams.distance };
      if (searchParams.motsCles.trim()) params.motsCles = searchParams.motsCles.trim();
      if (searchParams.codePostal.trim()) {
        params.location = searchParams.codePostal.trim();
      } else if (searchParams.commune.trim()) {
        const match = searchParams.commune.match(/\((\d{5})\)/);
        params.location = match ? match[1] : searchParams.commune.trim();
      }
      if (searchParams.typeContrat !== 'all') params.typeContrat = searchParams.typeContrat;

      // HIGH-04: use VITE_SUPABASE_PUBLISHABLE_KEY (the correct anon key variable)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/france-travail?${new URLSearchParams(params)}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la recherche');
      }

      const data: SearchResponse = await response.json();
      setOffers(data.resultats || []);
      setCurrentPage(1);
      if (!data.resultats?.length) {
        toast({ title: "Aucun résultat", description: "Essayez de modifier vos critères" });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les offres" });
    } finally {
      setLoading(false);
    }
  };

  const loadOfferDetails = async (offer: JobOffer) => {
    setSelectedOffer(offer);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/france-travail?action=details&id=${offer.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (response.ok) {
        const data: JobOffer = await response.json();
        setSelectedOffer(data);
      }
    } catch (error) {
      console.error('Details error:', error);
    }
  };

  const displayedOffers = showFavorites ? favorites : offers;
  const totalPages = Math.ceil(displayedOffers.length / PAGE_SIZE);
  const paginatedOffers = displayedOffers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-violet-500/5 border-b border-border/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08)_0%,transparent_60%)]" />
        <div className="relative px-4 sm:px-6 py-10 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/20">
              <Sparkles className="h-3 w-3" />
              France Travail
            </div>
            {!loading && offers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 text-xs font-medium px-3 py-1.5 rounded-full border border-green-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {offers.length} offres trouvées
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Offres d'emploi
          </h1>
          <p className="text-muted-foreground text-base mb-8">
            Découvrez les dernières offres publiées par France Travail en temps réel
          </p>

          {/* Search bar */}
          <div className="bg-card/80 backdrop-blur border border-border rounded-2xl shadow-lg p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Keywords */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mots-clés</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Développeur, Commercial..."
                    className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    value={searchParams.motsCles}
                    onChange={(e) => setSearchParams({ ...searchParams, motsCles: e.target.value })}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Localisation</label>
                <CommuneSearch
                  value={searchParams.commune}
                  onChange={(value, codePostal) => setSearchParams({ ...searchParams, commune: value, codePostal: codePostal || "" })}
                  placeholder="Paris, Lyon, 75001..."
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              {/* Contract */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contrat</label>
                <Select value={searchParams.typeContrat} onValueChange={(v) => setSearchParams({ ...searchParams, typeContrat: v })}>
                  <SelectTrigger className="bg-background border-border rounded-xl h-[42px] text-sm">
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

              {/* Distance + Search button */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rayon</label>
                <Select value={searchParams.distance} onValueChange={(v) => setSearchParams({ ...searchParams, distance: v })}>
                  <SelectTrigger className="bg-background border-border rounded-xl h-[42px] text-sm">
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

            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => { setShowFavorites(v => !v); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  showFavorites
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-amber-600 hover:border-amber-500/30"
                }`}
              >
                {showFavorites ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                Favoris {favorites.length > 0 && <span className="bg-amber-500/20 text-amber-600 text-xs rounded-full px-1.5">{favorites.length}</span>}
              </button>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Recherche...</>
                ) : (
                  <><Search className="h-4 w-4" />Rechercher</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm animate-pulse">Chargement des dernières offres...</p>
          </div>
        )}

        {/* Empty favorites */}
        {!loading && showFavorites && favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Bookmark className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Aucun favori</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Cliquez sur l'icône <Bookmark className="inline h-3.5 w-3.5" /> d'une offre pour l'ajouter
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !showFavorites && offers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Aucune offre trouvée</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Modifiez vos critères ou lancez une recherche sans filtre
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && displayedOffers.length > 0 && (
          <div className="space-y-3">
            {/* Results header */}
            <div className="flex items-center justify-between pb-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{displayedOffers.length}</span> offre{displayedOffers.length > 1 ? "s" : ""} {showFavorites ? "en favori" : "trouvées"}
              </p>
              <span className="text-xs text-muted-foreground">Page {currentPage}/{totalPages}</span>
            </div>

            {paginatedOffers.map((offer) => {
              const badge = getContractBadge(offer.typeContrat);
              return (
                <div
                  key={offer.id}
                  onClick={() => loadOfferDetails(offer)}
                  className="group bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <CompanyInitial name={offer.entreprise?.nom} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {offer.intitule}
                            </h3>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>

                          {offer.entreprise?.nom && (
                            <p className="text-sm font-medium text-primary mb-2">{offer.entreprise.nom}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {offer.lieuTravail?.libelle && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {offer.lieuTravail.libelle}
                              </span>
                            )}
                            {offer.dureeTravailLibelle && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {offer.dureeTravailLibelle}
                              </span>
                            )}
                            {offer.salaire?.libelle && (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <Euro className="h-3.5 w-3.5" />
                                {offer.salaire.libelle}
                              </span>
                            )}
                            {offer.dateCreation && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDistanceToNow(new Date(offer.dateCreation), { addSuffix: true, locale: fr })}
                              </span>
                            )}
                          </div>

                          {offer.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{offer.description}</p>
                          )}

                          {offer.competences && offer.competences.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {offer.competences.slice(0, 4).map((comp, idx) => (
                                <span key={idx} className="bg-accent text-accent-foreground text-xs rounded-full px-2.5 py-0.5 border border-border">
                                  {comp.libelle}
                                </span>
                              ))}
                              {offer.competences.length > 4 && (
                                <span className="text-xs text-muted-foreground self-center">+{offer.competences.length - 4}</span>
                              )}
                            </div>
                          )}

                          <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-block">
                            Voir les détails →
                          </span>
                        </div>

                        {/* Bookmark */}
                        <button
                          onClick={(e) => toggleFavorite(offer, e)}
                          className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all flex-shrink-0 ${
                            isFavorite(offer.id)
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                              : "bg-muted border-border text-muted-foreground hover:text-amber-500 hover:border-amber-500/30"
                          }`}
                        >
                          {isFavorite(offer.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                      page === currentPage
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOffer(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <CompanyInitial name={selectedOffer.entreprise?.nom} />
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedOffer.intitule}</h2>
                  {selectedOffer.entreprise?.nom && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-primary font-medium text-sm">{selectedOffer.entreprise.nom}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info badges */}
              <div className="flex flex-wrap gap-2">
                {selectedOffer.typeContratLibelle && (
                  <span className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${getContractBadge(selectedOffer.typeContrat).bg}`}>
                    <Briefcase className="h-3.5 w-3.5" />
                    {selectedOffer.typeContratLibelle}
                  </span>
                )}
                {selectedOffer.lieuTravail?.libelle && (
                  <span className="flex items-center gap-1.5 bg-muted text-muted-foreground text-sm px-3 py-1.5 rounded-full border border-border">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedOffer.lieuTravail.libelle}
                  </span>
                )}
                {selectedOffer.dureeTravailLibelle && (
                  <span className="flex items-center gap-1.5 bg-muted text-muted-foreground text-sm px-3 py-1.5 rounded-full border border-border">
                    <Clock className="h-3.5 w-3.5" />
                    {selectedOffer.dureeTravailLibelle}
                  </span>
                )}
                {selectedOffer.salaire?.libelle && (
                  <span className="flex items-center gap-1.5 bg-green-500/10 text-green-600 text-sm font-semibold px-3 py-1.5 rounded-full border border-green-500/20">
                    <Euro className="h-3.5 w-3.5" />
                    {selectedOffer.salaire.libelle}
                  </span>
                )}
              </div>

              {/* Description */}
              {selectedOffer.description && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    Description du poste
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{selectedOffer.description}</p>
                </div>
              )}

              {/* Competences */}
              {selectedOffer.competences && selectedOffer.competences.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    Compétences recherchées
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.competences.map((comp, idx) => (
                      <span key={idx} className="bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-sm">
                        {comp.libelle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Formation */}
              {selectedOffer.formations && selectedOffer.formations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    Formation souhaitée
                  </h3>
                  <ul className="space-y-2">
                    {selectedOffer.formations.map((form, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                        {form.niveauLibelle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Company description */}
              {selectedOffer.entreprise?.description && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    À propos de l'entreprise
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedOffer.entreprise.description}</p>
                </div>
              )}

              {/* CTA */}
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleFavorite(selectedOffer, { stopPropagation: () => {} } as React.MouseEvent)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      isFavorite(selectedOffer.id)
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                        : "bg-muted border-border text-muted-foreground hover:text-amber-600"
                    }`}
                  >
                    {isFavorite(selectedOffer.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    {isFavorite(selectedOffer.id) ? "Sauvegardé" : "Sauvegarder"}
                  </button>

                  {selectedOffer.origineOffre?.urlOrigine && (
                    <button
                      onClick={() => window.open(selectedOffer.origineOffre?.urlOrigine, "_blank")}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Postuler maintenant
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Vous serez redirigé vers le site du recruteur pour finaliser votre candidature
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
