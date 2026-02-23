import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Key, HelpCircle, MessageCircle } from "lucide-react";
import logoTransparent from "@/assets/logo-transparent.png";

const Help = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoTransparent} alt="Cronos" className="h-8 w-auto" />
            <span className="font-display text-lg font-bold text-foreground">Cronos</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la connexion
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
            <HelpCircle className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Centre d'aide
          </h1>
          <p className="text-lg text-muted-foreground">
            Retrouvez ici les réponses à vos questions les plus fréquentes.
          </p>
        </div>

        {/* Section Comment se connecter */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Comment se connecter
          </h2>
          
          <div className="space-y-4 text-muted-foreground">
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <h3 className="font-medium text-foreground mb-2">1. Rendez-vous sur la page de connexion</h3>
              <p>Cliquez sur "Se connecter" depuis la page d'accueil de Cronos.</p>
            </div>
            
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <h3 className="font-medium text-foreground mb-2">2. Choisissez votre méthode de connexion</h3>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Email</strong> : Entrez votre email et mot de passe</li>
                <li><strong>Google</strong> : Connectez-vous avec votre compte Google</li>
                <li><strong>Clé d'accès</strong> : Bientôt disponible</li>
              </ul>
            </div>
            
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <h3 className="font-medium text-foreground mb-2">3. Accédez à votre tableau de bord</h3>
              <p>Une fois connecté, vous serez redirigé vers votre espace personnel.</p>
            </div>
          </div>
        </section>

        {/* Section Problèmes de connexion */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Problèmes de connexion ?
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <h3 className="font-medium text-foreground mb-2">Mot de passe oublié</h3>
              <p className="text-muted-foreground mb-3">
                Cliquez sur "Mot de passe oublié ?" sur la page de connexion et suivez les instructions envoyées par email.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/forgot-password">Réinitialiser mon mot de passe</Link>
              </Button>
            </div>
            
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <h3 className="font-medium text-foreground mb-2">Email non reconnu</h3>
              <p className="text-muted-foreground">
                Vérifiez que vous utilisez la bonne adresse email. Si vous êtes nouveau, créez un compte depuis la page de connexion.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-card border border-border/50">
              <h3 className="font-medium text-foreground mb-2">Connexion Google qui échoue</h3>
              <p className="text-muted-foreground">
                Assurez-vous que les pop-ups sont autorisés dans votre navigateur. Essayez de vider le cache ou d'utiliser un autre navigateur.
              </p>
            </div>
          </div>
        </section>

        {/* Section Nous contacter */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Nous contacter
          </h2>
          
          <div className="p-6 rounded-xl bg-card border border-border/50 text-center">
            <p className="text-muted-foreground mb-4">
              Vous ne trouvez pas la réponse à votre question ?<br />
              Notre équipe est là pour vous aider.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-primary font-medium">
              <Mail className="h-5 w-5" />
              <a href="mailto:support@cronos.fr" className="hover:underline">
                support@cronos.fr
              </a>
            </div>
          </div>
        </section>

        {/* Liens utiles */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Liens utiles
          </h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Link 
              to="/privacy-policy"
              className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors text-center"
            >
              <p className="font-medium text-foreground">Confidentialité</p>
              <p className="text-sm text-muted-foreground">Politique de confidentialité</p>
            </Link>
            
            <Link 
              to="/terms-of-service"
              className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors text-center"
            >
              <p className="font-medium text-foreground">Conditions</p>
              <p className="text-sm text-muted-foreground">Conditions d'utilisation</p>
            </Link>
            
            <Link 
              to="/mentions-legales"
              className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors text-center"
            >
              <p className="font-medium text-foreground">Mentions légales</p>
              <p className="text-sm text-muted-foreground">Informations légales</p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="container mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          © 2025 Cronos - Tous droits réservés
        </div>
      </footer>
    </div>
  );
};

export default Help;
