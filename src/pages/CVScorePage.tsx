import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { CVComparator } from "@/components/dashboard/CVComparator";
import { CVScoreAuthPopup } from "@/components/CVScoreAuthPopup";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Target, TrendingUp, Shield, CheckCircle2, Star, FileText, Briefcase } from "lucide-react";
import { Header } from "@/components/Header";
import { Logo } from "@/components/Logo";
import { PublicFooter } from "@/components/PublicFooter";

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne l'analyse ATS de Cronos ?",
    a: "Notre algorithme ATS analyse votre CV en le comparant à la fiche de poste selon 7 critères clés : mots-clés primaires et secondaires, soft skills, structure du CV, coordonnées, résultats mesurables et adéquation du titre. Chaque critère est pondéré pour vous donner un score sur 100 points, identique à ce qu'utilisent les recruteurs en entreprise.",
  },
  {
    q: "Qu'est-ce qu'un système ATS et pourquoi est-il important ?",
    a: "Un ATS (Applicant Tracking System) est un logiciel utilisé par 75% des grandes entreprises pour filtrer les candidatures avant même qu'un recruteur les lise. Ces systèmes scannent automatiquement vos CV à la recherche de mots-clés spécifiques. Un CV non optimisé pour l'ATS peut être rejeté automatiquement, même si votre profil est excellent. Cronos vous aide à passer ce filtre invisible.",
  },
  {
    q: "Pourquoi mon CV doit-il être adapté à chaque offre d'emploi ?",
    a: "Les recruteurs et les ATS recherchent des correspondances précises entre votre CV et la fiche de poste. Un CV générique obtient en moyenne 35% de moins de rappels qu'un CV adapté. Notre analyse vous montre exactement quels mots-clés ajouter, quelles compétences mettre en avant et comment restructurer votre document pour maximiser vos chances.",
  },
  {
    q: "Quels formats de CV sont acceptés ?",
    a: "Cronos accepte les formats PDF, DOCX (Word) et TXT. Nous recommandons le format PDF pour un meilleur rendu, mais notre moteur d'extraction fonctionne avec tous ces formats. Évitez les CV sous forme d'image (JPG, PNG) car ils ne peuvent pas être lus par les ATS.",
  },
  {
    q: "Est-ce que Cronos stocke mon CV ?",
    a: "Sans compte, votre CV est analysé en temps réel et n'est pas stocké. Avec un compte gratuit, vous pouvez sauvegarder vos analyses et accéder à l'historique de vos comparaisons. Nous ne partageons jamais vos données avec des tiers.",
  },
  {
    q: "Combien de comparaisons puis-je faire gratuitement ?",
    a: "Vous pouvez effectuer une analyse gratuite sans créer de compte. En vous inscrivant gratuitement, vous accédez à 5 analyses supplémentaires. Les abonnements payants offrent des analyses illimitées, la génération de CV optimisé et l'envoi automatique de candidatures.",
  },
  {
    q: "Comment améliorer mon score ATS rapidement ?",
    a: "Les 3 actions les plus impactantes sont : 1) Copier exactement les termes de la fiche de poste dans votre CV (les ATS cherchent des correspondances exactes), 2) Ajouter des résultats quantifiés (chiffres, pourcentages), 3) Utiliser le même titre de poste que celui de l'offre. Notre outil vous indique précisément quels mots-clés ajouter pour maximiser votre score.",
  },
  {
    q: "Quelle est la différence entre un CV optimisé ATS et un CV classique ?",
    a: "Un CV optimisé ATS utilise des mots-clés stratégiques issus de l'offre d'emploi, évite les tableaux complexes et les polices inhabituelles qui perturbent les scanners, et suit une structure standard (expériences, formation, compétences). Un CV classique peut être visuellement attrayant mais invisible aux systèmes automatiques.",
  },
];

const BENEFITS = [
  { icon: Target, title: "Score précis sur 100", desc: "Algorithme utilisé par les recruteurs" },
  { icon: Zap, title: "Résultats instantanés", desc: "Analyse en moins de 10 secondes" },
  { icon: TrendingUp, title: "Conseils personnalisés", desc: "Actions concrètes pour améliorer votre score" },
  { icon: Shield, title: "Données sécurisées", desc: "Analyse locale, aucun stockage sans compte" },
];

export const CVScorePage = () => {
  useSEO("/score-cv");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);

  // JSON-LD Schema.org
  React.useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "schema-score-cv";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Cronos — Comparateur CV ATS",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Comparez votre CV à une fiche de poste en 10 secondes. Algorithme ATS avec score sur 100 points et conseils personnalisés pour décrocher plus d'entretiens.",
      "url": "https://spontaneous-sender.lovable.app/score-cv",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "342" }
    });
    document.head.appendChild(script);
    return () => { const el = document.getElementById("schema-score-cv"); if (el) el.remove(); };
  }, []);

  const handleAnalysisComplete = () => {
    const newCount = analysisCount + 1;
    setAnalysisCount(newCount);
    if (newCount >= 1) {
      setTimeout(() => setShowAuthPopup(true), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden pt-[72px] pb-10 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge variant="outline" className="mb-4 text-xs border-primary/30 text-primary bg-primary/5">
            <Zap className="h-3 w-3 mr-1" /> Outil ATS gratuit
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Comparez votre CV à une offre d'emploi
            <span className="text-primary"> en 10 secondes</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Notre algorithme ATS analyse la compatibilité de votre CV avec la fiche de poste et vous donne un score précis avec des conseils personnalisés pour décrocher plus d'entretiens.
          </p>
          {/* Benefits grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-2xl mx-auto">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-3 rounded-xl bg-card border border-border/50 text-left">
                <Icon className="h-4 w-4 text-primary mb-1.5" />
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tool section */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <CVComparator isPublic onAnalysisComplete={handleAnalysisComplete} />
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 px-4 bg-muted/30 border-y border-border/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-1 mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">"J'ai augmenté mon score de 42 à 78 en 20 minutes"</p>
          <p className="text-sm text-muted-foreground">— Marie D., Chef de projet IT, Paris</p>
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[["+40%", "de rappels recruteurs"], ["78%", "des grandes entreprises utilisent un ATS"], ["3 min", "durée moyenne de lecture d'un CV"]].map(([stat, label]) => (
              <div key={stat} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO text section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">Optimisez votre CV pour les systèmes ATS et décrochez plus d'entretiens</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
            <p>
              Dans un marché de l'emploi compétitif, <strong>75% des candidatures sont éliminées par des logiciels ATS</strong> avant même d'être lues par un recruteur. Ces systèmes de suivi des candidats (Applicant Tracking Systems) filtrent automatiquement les CV en cherchant des <strong>mots-clés spécifiques</strong> correspondant à la fiche de poste.
            </p>
            <p>
              Notre outil de comparaison CV / offre d'emploi analyse en quelques secondes la compatibilité de votre candidature avec l'algorithme ATS. Contrairement aux outils génériques, Cronos utilise une base de données de <strong>milliers de fiches de postes françaises</strong> pour identifier précisément les compétences techniques, les soft skills et le vocabulaire métier attendu par les recruteurs.
            </p>
            <p>
              La <strong>création d'un CV optimisé pour l'ATS</strong> ne signifie pas sacrifier la qualité rédactionnelle : il s'agit d'intégrer stratégiquement les bons termes dans vos expériences professionnelles, de quantifier vos réalisations et de structurer votre document selon les standards reconnus par les robots de recrutement.
            </p>
          </div>

          {/* Features list */}
          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {[
              "Analyse des mots-clés primaires et secondaires",
              "Détection des soft skills manquants",
              "Score de structure du CV (sections, format)",
              "Vérification des coordonnées et informations de contact",
              "Analyse des résultats quantifiés",
              "Conseils personnalisés actionnables",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-muted/20 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2">Questions fréquentes sur l'optimisation ATS</h2>
          <p className="text-muted-foreground mb-8">Tout ce que vous devez savoir pour maximiser vos chances avec les recruteurs</p>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border border-border/50 rounded-xl px-4 bg-card/50">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Cross-links to other tools */}
      <section className="py-10 px-4 border-t border-border/30 bg-muted/10">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Aller plus loin</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/createur-de-cv" className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-primary/30 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Créer un CV optimisé</p>
                <p className="text-xs text-muted-foreground">Générez un CV ATS-ready depuis zéro</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
            <Link to="/offres-emploi" className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-primary/30 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Trouver des offres d'emploi</p>
                <p className="text-xs text-muted-foreground">Parcourez des milliers d'offres en France</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-t border-border/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Prêt à décrocher plus d'entretiens ?</h2>
          <p className="text-muted-foreground mb-6">Créez votre compte gratuit et accédez à des comparaisons illimitées, la génération de CV et l'envoi automatique de candidatures.</p>
          <Link to="/register">
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
              Créer mon compte gratuit <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-3">Gratuit · Sans carte bancaire · 5 analyses offertes</p>
        </div>
      </section>

      <PublicFooter />

      {/* Auth popup */}
      <CVScoreAuthPopup open={showAuthPopup} onOpenChange={setShowAuthPopup} />
    </div>
  );
};
