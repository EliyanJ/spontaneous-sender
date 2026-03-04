import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, MapPin, Briefcase, Clock, ExternalLink, Euro, Bookmark, BookmarkCheck,
  Building2, X, GraduationCap, ChevronLeft, ChevronRight, Sparkles, TrendingUp,
  ArrowRight, LogIn, ChevronDown, Mail, BookOpen, Users, FileText, BarChart2,
  MessageCircle, DollarSign, Target, HelpCircle
} from "lucide-react";
import { CommuneSearch } from "@/components/ui/commune-search";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logoTransparent from "@/assets/logo-transparent.png";

const PAGE_SIZE = 12;
const FAVORITES_KEY = "job_favorites_public";

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
  experienceLibelle?: string;
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

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-card hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium text-foreground text-sm">{question}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 py-4 bg-muted/10 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const FEATURED_COMPANIES = [
  { initials: "SUP", name: "SUP INTERIM LURE", desc: "Spécialiste du travail temporaire et du recrutement CDD/CDI.", offers: 12 },
  { initials: "DM", name: "THE DOOR MAN", desc: "Réseau immobilier national innovant et collaboratif.", offers: 5 },
  { initials: "GR", name: "GR EDUCATION", desc: "Organisme de formation spécialisé dans les métiers de demain.", offers: 8 },
];

export const JobOffersPublic = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [favorites, setFavorites] = useState<JobOffer[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
  });
  const initialLoadDone = useRef(false);

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
      const params: Record<string, string> = { action: 'search', distance: searchParams.distance };
      if (searchParams.motsCles.trim()) params.motsCles = searchParams.motsCles.trim();
      if (searchParams.codePostal.trim()) {
        params.location = searchParams.codePostal.trim();
      } else if (searchParams.commune.trim()) {
        const match = searchParams.commune.match(/\((\d{5})\)/);
        params.location = match ? match[1] : searchParams.commune.trim();
      }
      if (searchParams.typeContrat !== 'all') params.typeContrat = searchParams.typeContrat;

      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const headers: Record<string, string> = {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/france-travail?${new URLSearchParams(params)}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la recherche');
      }

      const data = await response.json();
      setOffers(data.resultats || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOfferDetails = async (offer: JobOffer) => {
    setSelectedOffer(offer);
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const headers: Record<string, string> = {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      };
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/france-travail?action=details&id=${offer.id}`,
        { headers }
      );
      if (response.ok) {
        const data: JobOffer = await response.json();
        setSelectedOffer(data);
      }
    } catch (error) {
      console.error('Details error:', error);
    }
  };

  const toggleFavorite = (offer: JobOffer, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const exists = prev.some(f => f.id === offer.id);
      const next = exists ? prev.filter(f => f.id !== offer.id) : [...prev, offer];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.some(f => f.id === id);

  const displayedOffers = showFavorites ? favorites : offers;
  const totalPages = Math.ceil(displayedOffers.length / PAGE_SIZE);
  const paginatedOffers = displayedOffers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
                <img src={logoTransparent} alt="GetCronos" className="h-8 w-auto" />
                <span className="font-bold text-lg tracking-tight text-foreground">Get<span className="text-primary">Cronos</span></span>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-7">
                <button
                  onClick={() => navigate('/dashboard?tab=cv-comparator')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Comparatif de CV
                </button>
                <button
                  onClick={() => navigate('/cv-builder')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Création de CV
                </button>
                <button
                  onClick={() => navigate('/dashboard?tab=cv-advice')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Conseil personnalisé
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Tarification
                </button>
              </nav>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Chatbot hint */}
              <button
                className="hidden md:flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors bg-muted/50 border border-border rounded-full px-3 py-1.5"
                onClick={() => navigate('/register')}
              >
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                Besoin d'aide ? Discutez avec notre IA
              </button>

              {user ? (
                <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 shadow-md shadow-primary/20">
                  Mon tableau de bord
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    Connexion
                  </Button>
                  <Button size="sm" onClick={() => navigate('/register')} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 font-semibold shadow-md shadow-primary/20 uppercase text-xs tracking-wide">
                    CRÉER MON CV
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16">
        {/* ===== HERO SECTION ===== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-violet-500/5 border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.1)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(260_60%_45%/0.06)_0%,transparent_60%)]" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight leading-tight">
                Plus de <span className="text-primary">2200 offres d'emploi</span><br />
                dans toute la France
              </h1>
              <p className="text-lg text-muted-foreground mb-10">
                Vous venez de créer votre CV ? Nos recruteurs ont certainement une opportunité pour vous !
              </p>
            </div>

            {/* Search Panel */}
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Keywords */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="h-3 w-3" /> Métier
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Développeur, Commercial, Infirmier..."
                      className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                      value={searchParams.motsCles}
                      onChange={(e) => setSearchParams({ ...searchParams, motsCles: e.target.value })}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> Localisation
                  </label>
                  <CommuneSearch
                    value={searchParams.commune}
                    onChange={(value, codePostal) => setSearchParams({ ...searchParams, commune: value, codePostal: codePostal || "" })}
                    placeholder="Paris, Lyon, 75001..."
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>

                {/* Contract type */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Contrat
                  </label>
                  <Select value={searchParams.typeContrat} onValueChange={(v) => setSearchParams({ ...searchParams, typeContrat: v })}>
                    <SelectTrigger className="bg-background border-border rounded-xl h-[42px] text-sm">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="MIS">Intérim</SelectItem>
                      <SelectItem value="SAI">Alternance</SelectItem>
                      <SelectItem value="LIB">Libéral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Distance */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3 w-3" /> Rayon
                  </label>
                  <Select value={searchParams.distance} onValueChange={(v) => setSearchParams({ ...searchParams, distance: v })}>
                    <SelectTrigger className="bg-background border-border rounded-xl h-[42px] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">20 km</SelectItem>
                      <SelectItem value="20">50 km</SelectItem>
                      <SelectItem value="30">30 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                      <SelectItem value="100">100 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search button row */}
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-medium">Recherches populaires :</span>
                  {["Télétravail", "Développeur", "Commercial", "Marketing"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => { setSearchParams(p => ({ ...p, motsCles: tag })); setTimeout(handleSearch, 100); }}
                      className="text-xs bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 transition-colors font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
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
                    className="flex items-center gap-2 px-8 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Recherche...</>
                    ) : (
                      <><Search className="h-4 w-4" />RECHERCHER</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FEATURED COMPANIES ===== */}
        <section className="bg-muted/20 border-b border-border py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Partenaires</p>
              <h2 className="text-2xl font-bold text-foreground">Des dizaines d'entreprises</h2>
              <p className="text-muted-foreground mt-1">qui proposent des offres partout en France</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {FEATURED_COMPANIES.map((company, i) => {
                const colors = ["bg-primary/10 text-primary", "bg-violet-500/10 text-violet-600", "bg-teal-500/10 text-teal-600"];
                return (
                  <div key={i} className="bg-card border border-border rounded-2xl p-5 flex gap-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                      {company.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded mb-1 ${colors[i % colors.length]}`}>
                        {company.initials}
                      </div>
                      <p className="font-semibold text-foreground text-sm">{company.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{company.desc}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-primary font-medium">{company.offers} offres</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== LATEST OFFERS ===== */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dernières offres publiées</h2>
              <p className="text-muted-foreground mt-1">Découvrez les opportunités les plus récentes</p>
            </div>
            {offers.length > 0 && (
              <button
                onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
                className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Voir toutes les offres <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 border-4 border-muted border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground text-sm animate-pulse">Chargement des offres en cours...</p>
            </div>
          )}

          {/* Empty favorites */}
          {!loading && showFavorites && favorites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Bookmark className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Aucun favori sauvegardé</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Cliquez sur l'icône <Bookmark className="inline h-3.5 w-3.5" /> d'une offre pour la retrouver ici
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !showFavorites && offers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Aucune offre trouvée</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Modifiez vos critères ou lancez une recherche sans filtre pour voir les dernières offres
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && displayedOffers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{displayedOffers.length}</span> offre{displayedOffers.length > 1 ? "s" : ""} {showFavorites ? "en favori" : "disponibles"}
                </p>
                <span className="text-xs text-muted-foreground">Page {currentPage}/{totalPages}</span>
              </div>

              {paginatedOffers.map((offer) => {
                const badge = getContractBadge(offer.typeContrat);
                return (
                  <div
                    key={offer.id}
                    onClick={() => loadOfferDetails(offer)}
                    className="group bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <CompanyInitial name={offer.entreprise?.nom} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
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
                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{offer.lieuTravail.libelle}</span>
                              )}
                              {offer.dureeTravailLibelle && (
                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{offer.dureeTravailLibelle}</span>
                              )}
                              {offer.salaire?.libelle && (
                                <span className="flex items-center gap-1 text-green-600 font-medium"><Euro className="h-3.5 w-3.5" />{offer.salaire.libelle}</span>
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
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => toggleFavorite(offer, e)}
                              className={`p-2 rounded-lg transition-all ${
                                isFavorite(offer.id)
                                  ? "text-amber-500 bg-amber-500/10"
                                  : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                              }`}
                            >
                              {isFavorite(offer.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                            </button>
                            <button className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-2 rounded-lg transition-colors">
                              Postuler
                            </button>
                          </div>
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
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-border text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />Précédent
                  </button>
                  <span className="text-sm text-muted-foreground px-3">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-border text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Suivant<ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Bottom CTA */}
              <div className="flex justify-center pt-4">
                <button className="flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 hover:bg-primary/5 rounded-xl px-6 py-2.5 transition-colors">
                  Voir toutes les offres <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== CTA BANNER (non logged) ===== */}
        {!user && !loading && (
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-violet-500/10 border-y border-primary/20 py-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center gap-5">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-foreground mb-1">Postulez intelligemment avec Cronos</h3>
                <p className="text-sm text-muted-foreground">
                  Créez un compte gratuit pour envoyer des candidatures personnalisées, suivre vos réponses et booster votre CV avec l'IA.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="rounded-full">
                  <LogIn className="h-4 w-4 mr-2" />Se connecter
                </Button>
                <Button size="sm" onClick={() => navigate('/register')} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 shadow-lg shadow-primary/20">
                  Créer un compte <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ===== CAREER TIPS ===== */}
        <section className="py-14 border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground">Conseils pour votre carrière</h2>
              <p className="text-muted-foreground mt-1">Optimisez vos chances avec nos guides experts</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: <FileText className="h-5 w-5" />,
                  color: "bg-primary/10 text-primary",
                  tag: "CV & Lettre",
                  title: "Comment rédiger un CV percutant en 2025 ?",
                  desc: "Découvrez les structures et mots-clés qui attirent l'attention des recruteurs dès les premières secondes.",
                },
                {
                  icon: <Users className="h-5 w-5" />,
                  color: "bg-violet-500/10 text-violet-600",
                  tag: "Entretien",
                  title: "Les 10 questions pièges en entretien",
                  desc: "Préparez vos réponses aux questions les plus difficiles pour transformer l'essai lors de votre rencontre.",
                },
                {
                  icon: <DollarSign className="h-5 w-5" />,
                  color: "bg-teal-500/10 text-teal-600",
                  tag: "Négociation",
                  title: "Négocier son salaire : le guide complet",
                  desc: "Apprenez à évaluer votre valeur sur le marché et à aborder la question du salaire avec confiance.",
                },
              ].map((article, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                  <div className="h-32 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${article.color}`}>
                      {article.icon}
                    </div>
                  </div>
                  <div className="p-5">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${article.color}`}>
                      {article.tag}
                    </span>
                    <h3 className="font-semibold text-foreground text-sm mb-2 group-hover:text-primary transition-colors">{article.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{article.desc}</p>
                    <span className="text-xs font-medium text-primary flex items-center gap-1">
                      Lire l'article <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="py-14 border-b border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/20 mb-4">
                <HelpCircle className="h-3.5 w-3.5" />
                FAQ
              </div>
              <h2 className="text-2xl font-bold text-foreground">Foire aux questions</h2>
              <p className="text-muted-foreground mt-1">Trouvez rapidement les réponses à vos questions</p>
            </div>
            <div className="space-y-3">
              <FAQItem
                question="Comment optimiser ma recherche ?"
                answer="Pour optimiser votre recherche d'emploi sur GetCronos, utilisez les filtres avancés (localisation, type de contrat, distance) et les mots-clés précis. Créez des alertes personnalisées pour recevoir les nouvelles offres correspondant à votre profil. Notre IA vous aide également à affiner votre CV pour maximiser vos chances auprès des recruteurs."
              />
              <FAQItem
                question="Quels sont les avantages de GetCronos ?"
                answer="GetCronos vous offre un accès à plus de 2200 offres d'emploi actualisées quotidiennement, des outils d'optimisation de CV basés sur l'IA, des conseils personnalisés pour votre carrière, et un accompagnement stratégique pour maximiser vos chances de décrocher le poste idéal. Notre plateforme est conçue pour vous donner un avantage compétitif dans votre recherche."
              />
              <FAQItem
                question="Comment fonctionne l'analyse de CV ?"
                answer="Notre système d'analyse de CV utilise l'intelligence artificielle pour évaluer la structure, le contenu et l'optimisation de votre CV par rapport aux standards du marché. Vous recevez un score détaillé avec des recommandations concrètes pour améliorer vos chances d'être retenu par les recruteurs."
              />
              <FAQItem
                question="Les services sont-ils gratuits ?"
                answer="GetCronos propose une version gratuite avec accès aux offres d'emploi et fonctionnalités de base. Pour bénéficier de l'analyse approfondie de CV, des conseils personnalisés et des alertes avancées, consultez notre page Tarification pour découvrir nos formules premium adaptées à vos besoins."
              />
            </div>
          </div>
        </section>

        {/* ===== EMAIL ALERT BANNER ===== */}
        <section className="py-14 bg-gradient-to-br from-primary via-primary/90 to-violet-600">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-5">
              <Mail className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ne ratez aucune opportunité</h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Inscrivez-vous à notre alerte emploi et recevez les dernières offres correspondant à votre profil directement dans votre boîte mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="votre@email.com"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20 transition-all"
              />
              <button
                onClick={() => navigate('/register')}
                className="flex items-center justify-center gap-2 bg-white text-primary font-semibold text-sm px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
              >
                Créer une alerte
              </button>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="bg-card border-t border-border py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
              {/* Brand */}
              <div className="sm:col-span-1">
                <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => navigate('/')}>
                  <img src={logoTransparent} alt="GetCronos" className="h-7 w-auto" />
                  <span className="font-bold text-foreground">Get<span className="text-primary">Cronos</span></span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  La plateforme de référence pour trouver votre prochain emploi en France. Plus de 2200 offres mises à jour quotidiennement.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <a href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-muted-foreground text-xs font-bold">in</a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-muted-foreground text-xs font-bold">tw</a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-muted-foreground text-xs font-bold">fb</a>
                </div>
              </div>

              {/* Candidats */}
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-4">Candidats</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Toutes les offres", action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                    { label: "Créer un CV", action: () => navigate('/cv-builder') },
                    { label: "Conseils carrière", action: () => {} },
                    { label: "Simulateur de salaire", action: () => {} },
                  ].map((link) => (
                    <li key={link.label}>
                      <button onClick={link.action} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Entreprises */}
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-4">Entreprises</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Déposer une offre", action: () => {} },
                    { label: "CVThèque", action: () => {} },
                    { label: "Solutions RH", action: () => {} },
                    { label: "Tarifs", action: () => navigate('/pricing') },
                  ].map((link) => (
                    <li key={link.label}>
                      <button onClick={link.action} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Légal */}
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-4">Légal</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Mentions légales", path: "/mentions-legales" },
                    { label: "Politique de confidentialité", path: "/politique-de-confidentialite" },
                    { label: "CGU", path: "/conditions-generales" },
                    { label: "Contact", path: "/dashboard?tab=support" },
                  ].map((link) => (
                    <li key={link.label}>
                      <button onClick={() => navigate(link.path)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">© 2025 GetCronos. Tous droits réservés.</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border rounded-full px-3 py-1">
                🇫🇷 Français
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* ===== OFFER DETAIL MODAL ===== */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-sm" onClick={() => setSelectedOffer(null)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <CompanyInitial name={selectedOffer.entreprise?.nom} />
                <div>
                  <h2 className="text-base font-semibold text-foreground leading-tight">{selectedOffer.intitule}</h2>
                  {selectedOffer.entreprise?.nom && (
                    <p className="text-sm text-primary font-medium">{selectedOffer.entreprise.nom}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedOffer(null)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-5">
              <div className="flex flex-wrap gap-2">
                {selectedOffer.typeContrat && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getContractBadge(selectedOffer.typeContrat).bg}`}>
                    {getContractBadge(selectedOffer.typeContrat).label}
                  </span>
                )}
                {selectedOffer.lieuTravail?.libelle && (
                  <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border">
                    <MapPin className="h-3 w-3" />{selectedOffer.lieuTravail.libelle}
                  </span>
                )}
                {selectedOffer.dureeTravailLibelle && (
                  <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border">
                    <Clock className="h-3 w-3" />{selectedOffer.dureeTravailLibelle}
                  </span>
                )}
                {selectedOffer.salaire?.libelle && (
                  <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-3 py-1 rounded-full border border-green-500/20 font-medium">
                    <Euro className="h-3 w-3" />{selectedOffer.salaire.libelle}
                  </span>
                )}
              </div>

              {selectedOffer.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />Description du poste
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{selectedOffer.description}</p>
                  </div>
                </div>
              )}

              {selectedOffer.competences && selectedOffer.competences.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Compétences requises</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.competences.map((comp, idx) => (
                      <span key={idx} className="bg-primary/10 text-primary text-xs rounded-full px-3 py-1 border border-primary/20 font-medium">
                        {comp.libelle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedOffer.formations && selectedOffer.formations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />Formation requise
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffer.formations.map((f, idx) => (
                      <span key={idx} className="bg-muted text-muted-foreground text-xs rounded-full px-3 py-1 border border-border">
                        {f.niveauLibelle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedOffer.experienceLibelle && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Expérience</h3>
                  <span className="bg-muted text-muted-foreground text-xs rounded-full px-3 py-1 border border-border">
                    {selectedOffer.experienceLibelle}
                  </span>
                </div>
              )}

              {selectedOffer.entreprise?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />À propos de l'entreprise
                  </h3>
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4 border border-border/50">
                    {selectedOffer.entreprise.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 flex items-center gap-3">
              {!user && (
                <Button variant="outline" onClick={() => navigate('/register')} className="flex-1 rounded-xl">
                  <ArrowRight className="h-4 w-4 mr-2" />Créer un compte pour postuler avec l'IA
                </Button>
              )}
              {selectedOffer.origineOffre?.urlOrigine && (
                <Button
                  onClick={() => window.open(selectedOffer.origineOffre?.urlOrigine, '_blank')}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />Postuler maintenant
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOffersPublic;
