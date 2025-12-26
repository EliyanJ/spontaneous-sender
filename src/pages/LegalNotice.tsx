import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LegalNotice = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          <div className="flex gap-2">
            <Button variant="default" size="sm" disabled>
              🇫🇷 Français
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/legal-notice-en")}>
              🇬🇧 English
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-2">
            Mentions Légales
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground mb-8">
            <strong>Dernière mise à jour :</strong> 13 décembre 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              1. Éditeur du Site
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Nom de l'application :</strong> Cronos
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Site web :</strong>{" "}
                <a
                  href="https://getcronos.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://getcronos.fr
                </a>
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Éditeur :</strong> Eliyan JACQUET
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Statut :</strong> Personne physique - Site édité à titre personnel
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Adresse :</strong> 41 rue Parmentier, 95870 Bezons, France
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Email :</strong> eliyanjacquet99@gmail.com
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              2. Directeur de la Publication
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Nom :</strong> Eliyan JACQUET
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Email :</strong> eliyanjacquet99@gmail.com
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              3. Hébergement
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.1 Hébergement Frontend
            </h3>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg mb-4">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Société :</strong> Lovable / Vercel Inc.
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Site web :</strong>{" "}
                <a
                  href="https://lovable.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://lovable.dev
                </a>
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.2 Hébergement Backend & Base de Données
            </h3>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Société :</strong> Supabase Inc.
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Adresse :</strong> 970 Toa Payoh North #07-04, Singapore 318992
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Site web :</strong>{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://supabase.com
                </a>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              4. Propriété Intellectuelle
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              L'ensemble du contenu de ce site (textes, images, graphiques, logos, icônes, 
              logiciels, etc.) est la propriété exclusive d'Eliyan JACQUET ou de ses partenaires 
              et est protégé par les lois françaises et internationales relatives à la propriété 
              intellectuelle.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              Toute reproduction, représentation, modification, publication, adaptation, 
              totale ou partielle, des éléments du site, quel que soit le moyen ou le procédé 
              utilisé, est interdite sans l'autorisation écrite préalable d'Eliyan JACQUET.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Toute exploitation non autorisée du site ou de son contenu engagerait la 
              responsabilité de l'utilisateur et constituerait une contrefaçon sanctionnée 
              par les articles L.335-2 et suivants du Code de la Propriété Intellectuelle.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              5. Données Personnelles
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              Le traitement des données personnelles est régi par notre{" "}
              <a
                href="/privacy-policy"
                className="text-blue-600 dark:text-primary hover:underline"
              >
                Politique de Confidentialité
              </a>
              , accessible à tout moment depuis ce site.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et 
              à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez 
              d'un droit d'accès, de rectification, de suppression et de portabilité de vos 
              données personnelles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              6. Cookies
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Ce site utilise uniquement des cookies essentiels au fonctionnement de 
              l'application (authentification, préférences de thème). Aucun cookie de 
              tracking tiers n'est utilisé. Pour plus d'informations, consultez notre{" "}
              <a
                href="/privacy-policy"
                className="text-blue-600 dark:text-primary hover:underline"
              >
                Politique de Confidentialité
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              7. Limitation de Responsabilité
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              Eliyan JACQUET s'efforce de fournir des informations aussi précises que 
              possible sur ce site. Toutefois, il ne pourra être tenu responsable des 
              omissions, des inexactitudes et des carences dans la mise à jour, qu'elles 
              soient de son fait ou du fait des tiers partenaires qui lui fournissent ces 
              informations.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Tous les éléments du site sont fournis « en l'état » sans garantie d'aucune 
              sorte, expresse ou implicite. L'utilisateur utilise le site sous sa seule 
              responsabilité.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              8. Droit Applicable
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Les présentes mentions légales sont soumises au droit français. En cas de 
              litige, et après tentative de résolution amiable, compétence exclusive est 
              attribuée aux tribunaux français compétents.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              9. Contact
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                Pour toute question concernant ces mentions légales, vous pouvez nous 
                contacter à :
              </p>
              <p className="text-gray-700 dark:text-foreground mt-2">
                <strong>Email :</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700 dark:text-foreground mt-1">
                <strong>Site web :</strong>{" "}
                <a
                  href="https://getcronos.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://getcronos.fr
                </a>
              </p>
            </div>
          </section>

          <hr className="my-8 border-gray-200 dark:border-border" />

          <div className="text-center text-gray-600 dark:text-muted-foreground">
            <p>
              <strong>Version :</strong> 1.1
            </p>
            <p>
              <strong>Date d'entrée en vigueur :</strong> 13 décembre 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalNotice;