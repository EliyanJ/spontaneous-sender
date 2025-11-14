import { useState, useEffect } from "react";
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
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Soft sky blue gradient like Cluely */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5B9FD8] via-[#E8F4FD] to-[#A8D5F2]"></div>
      {/* Mountains image overlay with low opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{ backgroundImage: `url(${mountainsBg})` }}
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
          <h1 className="font-display text-5xl font-bold leading-tight text-gray-900 md:text-7xl animate-fade-in">
            Décrochez votre prochain emploi
            <br />
            <span className="text-blue-600">avec des candidatures spontanées ciblées</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-gray-700 md:text-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Trouvez les entreprises qui correspondent à votre profil, découvrez automatiquement les contacts RH, et envoyez vos candidatures spontanées personnalisées en quelques clics.
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
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 text-gray-900 shadow-lg transition hover:shadow-xl animate-fade-in hover:scale-105 duration-300" style={{ animationDelay: '0.6s' }}>
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Recherche d'employeurs ciblée</h3>
              <p className="text-gray-600">
                Identifiez les entreprises qui recrutent dans votre secteur et correspondent à vos aspirations professionnelles
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 text-gray-900 shadow-lg transition hover:shadow-xl animate-fade-in hover:scale-105 duration-300" style={{ animationDelay: '0.8s' }}>
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Contacts RH automatiques</h3>
              <p className="text-gray-600">
                L'IA trouve automatiquement les emails RH et recruteurs des entreprises ciblées
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 text-gray-900 shadow-lg transition hover:shadow-xl animate-fade-in hover:scale-105 duration-300" style={{ animationDelay: '1s' }}>
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Candidatures personnalisées</h3>
              <p className="text-gray-600">
                Envoyez vos candidatures spontanées avec CV et lettre de motivation personnalisés
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Detailed Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-8 shadow-lg">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">Trouvez les entreprises qui recrutent</h2>
              <p className="mb-6 text-gray-700">
                Notre IA identifie les entreprises correspondant à votre profil professionnel et vous aide à cibler celles avec le plus fort potentiel d'embauche.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Filtrage par secteur, taille et localisation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Analyse des besoins de recrutement</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Sauvegarde de vos listes d'entreprises cibles</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '1.4s' }}>
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm p-8 shadow-lg">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">Contacts RH découverts automatiquement</h2>
              <p className="mb-6 text-gray-700">
                Notre IA scanne les sites web des entreprises pour trouver les bons contacts RH et générer des candidatures personnalisées adaptées à chaque entreprise.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Emails RH, recruteurs et responsables</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Détection des pages carrières actives</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="mt-1 h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Vérification de validité des adresses</span>
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
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Questions fréquentes</h2>
          <p className="text-xl text-gray-700">Tout ce que vous devez savoir sur vos candidatures spontanées</p>
        </div>
        <div className="mx-auto max-w-3xl animate-fade-in" style={{ animationDelay: '2.8s' }}>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Comment fonctionne la recherche d'entreprises ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Notre plateforme utilise des bases de données publiques françaises pour identifier les entreprises selon vos critères (secteur, taille, localisation). L'IA analyse ensuite leurs sites web pour trouver les contacts RH et évaluer leur potentiel de recrutement.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Les emails RH trouvés sont-ils valides ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Nous utilisons plusieurs techniques de vérification pour assurer la validité des emails RH. Ces informations provenant de sources publiques, nous recommandons de personnaliser chaque candidature pour maximiser vos chances de réponse.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Puis-je envoyer mes candidatures directement depuis la plateforme ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Oui ! Connectez votre compte Gmail pour envoyer vos candidatures spontanées directement depuis ProspectAI. Vous pouvez joindre votre CV et lettre de motivation, et suivre l'état de chaque candidature au même endroit.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Y a-t-il une limite au nombre de candidatures que je peux envoyer ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                Les limites dépendent de votre abonnement. Le plan gratuit permet d'envoyer jusqu'à 50 candidatures par mois, tandis que les plans premium offrent des envois illimités et des fonctionnalités avancées de suivi.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="rounded-lg bg-white/70 backdrop-blur-sm px-6 shadow-lg border-none">
              <AccordionTrigger className="text-left font-semibold text-gray-900">
                Comment l'IA personnalise-t-elle mes candidatures ?
              </AccordionTrigger>
              <AccordionContent className="text-gray-700">
                L'IA analyse le site web de chaque entreprise pour comprendre leur activité, leurs valeurs et besoins en recrutement. Elle adapte votre lettre de motivation en mettant en avant les compétences pertinentes pour chaque poste potentiel.
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
                <li><a href="/privacy-policy" className="text-gray-700 hover:text-blue-600 transition">Politique de confidentialité</a></li>
                <li><a href="/terms-of-service" className="text-gray-700 hover:text-blue-600 transition">Conditions d'utilisation</a></li>
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
