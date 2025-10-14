import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import { ArrowRight, Building2, Mail, Search, Zap, Users, Target, Clock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import mountainsBg from "@/assets/mountains-bg.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Landing = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Si déjà connecté, rediriger vers le dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Top section - Sky blue gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5B9FD8] via-[#E8F4FD] to-transparent" style={{ height: '50%' }}></div>
      
      {/* Bottom section - Purple/Pink gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#E8D5FD] to-[#F8E8FF]" style={{ top: '50%' }}></div>
      
      {/* Mountains image overlay with low opacity on top */}
      <div 
        className="absolute opacity-10"
        style={{ 
          backgroundImage: `url(${mountainsBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          top: 0,
          left: 0,
          right: 0,
          height: '60%'
        }}
      ></div>
      <div className="relative z-10">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl font-bold text-gray-900">ProspectAI</span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-gray-800 transition hover:text-blue-600">
            Fonctionnalités
          </a>
          <a href="#faq" className="text-sm text-gray-800 transition hover:text-blue-600">
            FAQ
          </a>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setAuthOpen(true)}
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Se connecter
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl animate-fade-in">
            <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">Votre assistant IA</span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">pour la prospection</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-gray-700 md:text-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Trouvez les entreprises qui correspondent à vos critères, découvrez automatiquement les emails de contact, et lancez vos campagnes de prospection en quelques clics.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button 
              size="lg" 
              onClick={() => setAuthOpen(true)}
              className="rounded-full bg-blue-600 text-white hover:bg-blue-700 font-semibold text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid gap-6 pt-20 md:grid-cols-3">
            <div className="group relative rounded-3xl p-[2px] animate-fade-in transition-all duration-500 hover:scale-105" style={{ animationDelay: '0.6s' }}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-3xl bg-white/90 backdrop-blur-sm p-8">
                <div className="mb-4 inline-block rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 p-4">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Recherche intelligente</h3>
                <p className="text-gray-600 leading-relaxed">
                  Filtrez par secteur, taille, localisation et trouvez vos prospects idéaux
                </p>
              </div>
            </div>

            <div className="group relative rounded-3xl p-[2px] animate-fade-in transition-all duration-500 hover:scale-105" style={{ animationDelay: '0.8s' }}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-3xl bg-white/90 backdrop-blur-sm p-8">
                <div className="mb-4 inline-block rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Emails automatiques</h3>
                <p className="text-gray-600 leading-relaxed">
                  L'IA scanne les sites web et trouve automatiquement les emails de contact
                </p>
              </div>
            </div>

            <div className="group relative rounded-3xl p-[2px] animate-fade-in transition-all duration-500 hover:scale-105" style={{ animationDelay: '1s' }}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400 opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-3xl bg-white/90 backdrop-blur-sm p-8">
                <div className="mb-4 inline-block rounded-2xl bg-gradient-to-br from-pink-500 to-blue-500 p-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">Campagnes rapides</h3>
                <p className="text-gray-600 leading-relaxed">
                  Lancez vos campagnes d'emailing directement depuis la plateforme
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Detailed Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="animate-fade-in group" style={{ animationDelay: '1.2s' }}>
            <div className="glass-card-dark rounded-3xl p-8 transition-all duration-500 hover:bg-white/15">
              <h2 className="mb-4 text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Recherche avancée d'entreprises</h2>
              <p className="mb-6 text-gray-800 leading-relaxed">
                Avant chaque prospection, notre IA analyse les entreprises correspondant à vos critères et vous fournit un contexte détaillé sur leurs activités et besoins.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-purple-600" />
                  <span className="text-gray-700">Filtrage par secteur d'activité et taille</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-purple-600" />
                  <span className="text-gray-700">Localisation géographique précise</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-purple-600" />
                  <span className="text-gray-700">Export et sauvegarde des listes</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="animate-fade-in group" style={{ animationDelay: '1.4s' }}>
            <div className="glass-card-dark rounded-3xl p-8 transition-all duration-500 hover:bg-white/15">
              <h2 className="mb-4 text-3xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">Extraction automatique d'emails</h2>
              <p className="mb-6 text-gray-800 leading-relaxed">
                Notre IA scanne automatiquement les sites web des entreprises et génère des emails de suivi basés sur vos besoins et le contexte de chaque prospect.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-pink-600" />
                  <span className="text-gray-700">Emails RH et contacts décisionnaires</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-pink-600" />
                  <span className="text-gray-700">Pages carrières et formulaires de contact</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-pink-600" />
                  <span className="text-gray-700">Vérification de validité des emails</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-12 shadow-xl animate-fade-in" style={{ animationDelay: '1.6s' }}>
          <div className="grid gap-8 md:grid-cols-3 text-center">
            <div>
              <div className="mb-2 text-4xl font-bold text-blue-600">10k+</div>
              <div className="text-gray-700">Entreprises prospectées</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-blue-600">5k+</div>
              <div className="text-gray-700">Emails trouvés</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-blue-600">95%</div>
              <div className="text-gray-700">Taux de précision</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 animate-fade-in" style={{ animationDelay: '1.8s' }}>
          Ils nous font confiance
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-lg animate-fade-in" style={{ animationDelay: '2s' }}>
            <p className="mb-4 text-gray-700">
              "ProspectAI nous a permis de gagner un temps considérable dans notre recherche de prospects qualifiés."
            </p>
            <div className="font-semibold text-gray-900">— Marie D., Responsable Commercial</div>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-lg animate-fade-in" style={{ animationDelay: '2.2s' }}>
            <p className="mb-4 text-gray-700">
              "L'extraction automatique des emails fonctionne parfaitement. Nous avons multiplié nos contacts par 3."
            </p>
            <div className="font-semibold text-gray-900">— Thomas L., Startup Founder</div>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-6 shadow-lg animate-fade-in" style={{ animationDelay: '2.4s' }}>
            <p className="mb-4 text-gray-700">
              "Interface intuitive et résultats impressionnants. Un outil indispensable pour notre équipe."
            </p>
            <div className="font-semibold text-gray-900">— Sophie M., Directrice Marketing</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-6 py-20">
        <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 animate-fade-in" style={{ animationDelay: '2.6s' }}>
          Questions fréquentes
        </h2>
        <div className="mx-auto max-w-3xl animate-fade-in" style={{ animationDelay: '2.8s' }}>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Comment fonctionne l'extraction d'emails ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Notre IA analyse les sites web des entreprises que vous avez sélectionnées, identifie les pages de contact, carrières et les formulaires pour extraire automatiquement les emails professionnels pertinents.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Les données sont-elles conformes au RGPD ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Oui, nous utilisons uniquement des données publiquement accessibles et respectons toutes les réglementations en vigueur concernant la protection des données personnelles.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Puis-je exporter mes listes de prospects ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Absolument ! Vous pouvez exporter vos listes d'entreprises et d'emails au format CSV pour les utiliser dans vos outils CRM ou d'emailing préférés.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Quel est le taux de réussite de l'extraction d'emails ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Notre IA atteint un taux de succès de 95% sur les entreprises disposant d'un site web avec des informations de contact accessibles publiquement.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 font-display text-xl font-bold text-gray-900">ProspectAI</h3>
              <p className="text-gray-700">
                Votre assistant IA pour une prospection B2B efficace et automatisée.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-gray-900">Produit</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-700 hover:text-blue-600 transition">Fonctionnalités</a></li>
                <li><a href="#faq" className="text-gray-700 hover:text-blue-600 transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-gray-900">Entreprise</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-700 hover:text-blue-600 transition">À propos</a></li>
                <li><a href="#" className="text-gray-700 hover:text-blue-600 transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-gray-900">Légal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-700 hover:text-blue-600 transition">Mentions légales</a></li>
                <li><a href="#" className="text-gray-700 hover:text-blue-600 transition">Confidentialité</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/20 pt-8 text-center text-gray-700">
            <p>&copy; 2025 ProspectAI. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    </div>
  );
};

export default Landing;
