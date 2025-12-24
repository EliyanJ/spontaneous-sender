import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/privacy-policy-en")}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            EN
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Politique de Confidentialité
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Dernière mise à jour :</strong> 13 décembre 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Cette politique de confidentialité explique comment{" "}
              <strong>Cronos</strong> (ci-après « l'Application »), accessible sur{" "}
              <a
                href="https://getcronos.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://getcronos.fr
              </a>
              , collecte, utilise, stocke et protège vos données personnelles. L'Application
              est une plateforme de recherche d'offres d'emploi et
              d'automatisation de candidatures par email.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Nous nous engageons à respecter votre vie privée et à respecter
              pleinement le Règlement Général sur la Protection des Données
              (RGPD) et la législation française en matière de protection des
              données.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Responsable du Traitement
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Application :</strong> Cronos
              </p>
              <p className="text-gray-700">
                <strong>Site web :</strong>{" "}
                <a
                  href="https://getcronos.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://getcronos.fr
                </a>
              </p>
              <p className="text-gray-700">
                <strong>Responsable :</strong> Eliyan JACQUET
              </p>
              <p className="text-gray-700">
                <strong>Email :</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700">
                <strong>Adresse :</strong> 41 rue Parmentier, 95870 Bezons
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Données Collectées
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.1 Données d'authentification
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Adresse email</li>
              <li>Mot de passe (hashé et chiffré)</li>
              <li>Identifiant utilisateur unique</li>
            </ul>
            <p className="text-gray-700 mt-2">
              Ces données sont nécessaires pour vous créer un compte et
              sécuriser votre accès à l'Application.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.2 Données Gmail
            </h3>
            <p className="text-gray-700 mb-2">
              Lorsque vous connectez votre compte Gmail à l'Application, nous
              collectons et stockons avec votre permission explicite :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Emails envoyés (brouillons, emails finalisés)</li>
              <li>Emails reçus (métadonnées et contenu)</li>
              <li>Contacts Gmail</li>
              <li>Labels et organisation de vos emails</li>
            </ul>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-gray-700">
                <strong>Important :</strong> Nous n'accédons à Gmail que pour
                les fonctionnalités que vous avez explicitement activées. Vous
                pouvez révoquer cet accès à tout moment via votre compte Google.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.3 Données de recherche et de candidature
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Critères de recherche utilisés</li>
              <li>Offres d'emploi consultées</li>
              <li>Candidatures envoyées (date, employeur, statut)</li>
              <li>Brouillons de candidatures</li>
              <li>Historique de vos actions sur l'Application</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.4 Données de tracking
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Pages visitées</li>
              <li>Fonctionnalités utilisées</li>
              <li>Durée de session</li>
              <li>Type d'appareil et navigateur</li>
              <li>Adresse IP (à titre informatif uniquement)</li>
              <li>Événements d'interaction (clics, recherches, envois)</li>
            </ul>
            <p className="text-gray-700 mt-2">
              Ces données nous permettent d'améliorer l'Application et de
              comprendre comment vous l'utilisez.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.5 Données techniques
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Logs de serveur</li>
              <li>Erreurs techniques</li>
              <li>Performances de l'Application</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Fondement Légal du Traitement
            </h2>
            <p className="text-gray-700 mb-3">
              Nous traitons vos données sur la base des fondements légaux
              suivants :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Consentement</strong> : Pour la connexion Gmail et le
                tracking (vous avez le droit de refuser)
              </li>
              <li>
                <strong>Exécution du contrat</strong> : Pour créer votre compte
                et fournir les services de l'Application
              </li>
              <li>
                <strong>Intérêt légitime</strong> : Pour améliorer l'Application
                et détecter les fraudes
              </li>
              <li>
                <strong>Conformité légale</strong> : Si la loi l'exige
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Utilisation des Données
            </h2>
            <p className="text-gray-700 mb-3">
              Nous utilisons vos données pour :
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.1 Fonctionnement de l'Application
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Créer et gérer votre compte</li>
              <li>
                Fournir les services de recherche d'offres et d'automatisation
                Gmail
              </li>
              <li>Traiter vos candidatures</li>
              <li>Vous envoyer des notifications pertinentes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.2 Amélioration du Service
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Analyser l'utilisation de l'Application</li>
              <li>Identifier les bugs et problèmes de performance</li>
              <li>Développer de nouvelles fonctionnalités</li>
              <li>Personnaliser votre expérience</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.3 Communication
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous envoyer des mises à jour importantes sur l'Application</li>
              <li>Répondre à vos questions de support</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.4 Sécurité
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Prévenir et détecter les fraudes</li>
              <li>Protéger contre les accès non autorisés</li>
              <li>Respecter les obligations légales</li>
            </ul>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
              <p className="text-gray-700 font-semibold">
                Nous ne vendons JAMAIS vos données personnelles à des tiers.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Partage des Données
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.1 Avec des prestataires
            </h3>
            <p className="text-gray-700 mb-2">
              Vos données peuvent être partagées avec :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Supabase</strong> (base de données) : Stockage sécurisé
                de vos données
              </li>
              <li>
                <strong>Google</strong> : Accès à votre API Gmail (vous
                autorisez explicitement cet accès)
              </li>
              <li>
                <strong>API gouvernementale</strong> (offres d'emploi) :
                Recherche d'offres (données anonymisées)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.2 Obligations légales
            </h3>
            <p className="text-gray-700">
              Nous pouvons divulguer vos données si la loi l'exige (ordre
              judiciaire, enquête police, etc.).
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.3 Pas de partage commercial
            </h3>
            <p className="text-gray-700">
              Nous ne partageons pas vos données à des fins commerciales,
              marketing ou de vente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Durée de Rétention des Données
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Données de compte</strong> : Conservées tant que votre
                compte est actif, supprimées dans les 30 jours après suppression
                du compte
              </li>
              <li>
                <strong>Données de candidature</strong> : Conservées 12 mois
                (vous pouvez les supprimer à tout moment)
              </li>
              <li>
                <strong>Données Gmail</strong> : Synchronisées avec votre compte
                Gmail, supprimées dans les 7 jours après déconnexion
              </li>
              <li>
                <strong>Données de tracking</strong> : Conservées 90 jours
                maximum, puis anonymisées
              </li>
              <li>
                <strong>Logs techniques</strong> : Conservés 30 jours
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Sécurité des Données
            </h2>
            <p className="text-gray-700 mb-3">
              Nous mettons en place des mesures de sécurité robustes :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Chiffrement</strong> : Vos données sont chiffrées en
                transit (HTTPS/TLS) et au repos
              </li>
              <li>
                <strong>Authentification</strong> : Accès sécurisé via mot de
                passe hashé
              </li>
              <li>
                <strong>Accès limité</strong> : Seul le personnel autorisé peut
                accéder aux données
              </li>
              <li>
                <strong>Supabase</strong> : Respecte les standards de sécurité
                entreprise
              </li>
              <li>
                <strong>Pas de stockage de mots de passe en clair</strong> :
                Chiffrement robuste
              </li>
              <li>
                <strong>Audit régulier</strong> : Contrôles de sécurité
                réguliers
              </li>
            </ul>
            <p className="text-gray-700 mt-4 italic">
              Cependant, <strong>aucune transmission sur Internet n'est 100% sécurisée</strong>. 
              Vous utilisez l'Application à vos risques et périls, bien que nous
              faisions tout notre possible pour protéger vos données.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Vos Droits
            </h2>
            <p className="text-gray-700 mb-4">
              Conformément au RGPD, vous avez les droits suivants :
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.1 Droit d'accès
                </h3>
                <p className="text-gray-700">
                  Vous pouvez demander une copie de toutes les données
                  personnelles que nous avons sur vous.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.2 Droit de rectification
                </h3>
                <p className="text-gray-700">
                  Vous pouvez corriger vos données personnelles à tout moment via
                  votre compte.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.3 Droit à l'oubli (droit à la suppression)
                </h3>
                <p className="text-gray-700">
                  Vous pouvez demander la suppression de vos données
                  personnelles, sauf si nous devons les conserver pour des
                  raisons légales.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.4 Droit à la portabilité
                </h3>
                <p className="text-gray-700">
                  Vous pouvez demander une copie de vos données dans un format
                  lisible et transférable.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.5 Droit d'opposition
                </h3>
                <p className="text-gray-700">
                  Vous pouvez vous opposer à certains traitements de vos données
                  (tracking, par exemple).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.6 Droit de limiter le traitement
                </h3>
                <p className="text-gray-700">
                  Vous pouvez demander à limiter notre utilisation de vos
                  données.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.7 Droit de retirer votre consentement
                </h3>
                <p className="text-gray-700">
                  Vous pouvez retirer votre consentement à tout moment (notamment
                  pour la connexion Gmail).
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700">
                <strong>Pour exercer ces droits, contactez-nous à :</strong>{" "}
                eliyanjacquet99@gmail.com
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Consentement Explicite pour Gmail
            </h2>
            <p className="text-gray-700 mb-3">
              Lorsque vous connectez votre compte Gmail à l'Application :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                Vous <strong>consentez explicitement</strong> à ce que
                l'Application accède à vos emails
              </li>
              <li>
                Vous pouvez <strong>révoquer cet accès</strong> à tout moment via
                votre compte Google
              </li>
              <li>
                Nous n'utilisons ces données <strong>que pour les fonctionnalités</strong>{" "}
                que vous avez activées
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Google API Services - Limited Use Disclosure
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-gray-700 font-semibold mb-2">
                Conformité à la Politique de Données Utilisateur des Services API Google
              </p>
              <p className="text-gray-700">
                L'utilisation et le transfert des informations reçues des API Google par Cronos
                respectent la{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Politique de Données Utilisateur des Services API Google
                </a>
                , y compris les exigences d'Utilisation Limitée.
              </p>
            </div>

            <p className="text-gray-700 mb-4">
              Cette Application utilise l'API Gmail de Google pour vous permettre
              d'envoyer des emails directement depuis votre compte Gmail. L'accès
              à vos données Gmail est strictement limité aux fonctionnalités
              suivantes :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li>Envoi d'emails de candidature en votre nom</li>
              <li>Programmation d'emails pour envoi ultérieur</li>
              <li>Détection des réponses à vos emails envoyés</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              11.1 Ce que nous NE FAISONS PAS avec vos données Gmail
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li>
                Nous ne lisons pas le contenu de vos emails reçus à des fins
                autres que la détection des réponses à vos candidatures
              </li>
              <li>Nous ne partageons pas vos données Gmail avec des tiers</li>
              <li>
                Nous n'utilisons pas vos données Gmail à des fins publicitaires
              </li>
              <li>
                Nous ne stockons pas le contenu complet de vos emails au-delà de
                ce qui est nécessaire au fonctionnement du service
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              11.2 Révocation de l'accès
            </h3>
            <p className="text-gray-700">
              Vous pouvez révoquer l'accès de notre Application à votre compte
              Gmail à tout moment via les paramètres de sécurité de votre compte
              Google :{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://myaccount.google.com/permissions
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Cookies
            </h2>
            <p className="text-gray-700 mb-3">
              L'Application peut utiliser des cookies ou des technologies
              similaires pour :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Maintenir votre connexion</li>
              <li>Mémoriser vos préférences</li>
              <li>Analyser l'utilisation de l'Application</li>
              <li>Améliorer les performances</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Vous pouvez refuser les cookies de tracking</strong> via les
              paramètres de l'Application ou de votre navigateur, bien que cela
              puisse affecter certaines fonctionnalités.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Liens Externes
            </h2>
            <p className="text-gray-700">
              L'Application peut contenir des liens vers des sites tiers. Nous ne
              sommes pas responsables de leur contenu ou de leur politique de
              confidentialité. Consultez leur politique avant de partager vos
              données.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Mineurs
            </h2>
            <p className="text-gray-700">
              L'Application <strong>n'est pas destinée aux mineurs</strong> (moins
              de 16 ans). Nous ne collectons pas sciemment les données
              personnelles de mineurs. Si vous découvrez qu'un mineur a utilisé
              l'Application, veuillez nous en informer immédiatement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Modifications de cette Politique
            </h2>
            <p className="text-gray-700 mb-3">
              Nous pouvons modifier cette politique à tout moment. Vous serez
              informé(e) par :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Notification dans l'Application</li>
              <li>Email à votre adresse enregistrée</li>
              <li>
                Mise à jour de la date « Dernière mise à jour » en haut de cette
                page
              </li>
            </ul>
            <p className="text-gray-700 mt-3">
              Votre utilisation continue de l'Application après toute modification
              signifie que vous acceptez la nouvelle politique.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              16. Contact
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">
                Pour toute question concernant cette politique de
                confidentialité, contactez-nous :
              </p>
              <p className="text-gray-700">
                <strong>Email :</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700">
                <strong>Site web :</strong>{" "}
                <a
                  href="https://getcronos.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://getcronos.fr
                </a>
              </p>
              <p className="text-gray-700">
                <strong>Adresse :</strong> 41 rue Parmentier, 95870 Bezons, France
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              17. Réclamation
            </h2>
            <p className="text-gray-700">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez
              déposer une réclamation auprès de la{" "}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                CNIL (Commission Nationale de l'Informatique et des Libertés)
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              18. Conformité RGPD
            </h2>
            <p className="text-gray-700 mb-3">
              Cette politique est conforme au Règlement Général sur la Protection
              des Données (RGPD) de l'Union Européenne et à la loi française
              Informatique et Libertés.
            </p>
            <p className="text-gray-700">
              Nous nous engageons à respecter les principes de :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
              <li>
                <strong>Minimisation des données</strong> : Nous ne collectons que
                les données nécessaires
              </li>
              <li>
                <strong>Finalité limitée</strong> : Vos données sont utilisées
                uniquement pour les objectifs déclarés
              </li>
              <li>
                <strong>Transparence</strong> : Vous êtes informé(e) de
                l'utilisation de vos données
              </li>
              <li>
                <strong>Sécurité</strong> : Vos données sont protégées
              </li>
              <li>
                <strong>Droits individuels</strong> : Vous pouvez exercer vos
                droits à tout moment
              </li>
            </ul>
          </section>

          <hr className="my-8 border-gray-200" />

          <div className="text-center text-gray-600">
            <p>
              <strong>Version :</strong> 2.1
            </p>
            <p>
              <strong>Date d'entrée en vigueur :</strong> 13 décembre 2025
            </p>
            <p>
              <strong>Dernière révision :</strong> 13 décembre 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;