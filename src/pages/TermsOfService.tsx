import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'accueil
        </Button>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Conditions d'Utilisation
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Dernière mise à jour :</strong> 12 novembre 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Acceptation des Conditions
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              En accédant et en utilisant <strong>APP SENDER</strong> (ci-après « l'Application »), vous acceptez sans réserve l'intégralité de ces Conditions d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'Application.
            </p>
            <p className="text-gray-700 leading-relaxed">
              L'utilisation continue de l'Application après toute modification de ces conditions signifie que vous acceptez les nouvelles conditions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Description du Service
            </h2>
            <p className="text-gray-700 mb-3">
              APP SENDER est une application web qui vous permet de :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li>Rechercher des offres d'emploi via l'API du gouvernement français</li>
              <li>Connecter votre compte Gmail pour automatiser vos candidatures</li>
              <li>Créer, modifier et envoyer des emails de candidature</li>
              <li>Gérer un historique de vos candidatures</li>
              <li>Consulter des statistiques sur vos candidatures</li>
            </ul>
            <p className="text-gray-700">
              L'Application est fournie à titre de prototype et "tel quel" (as-is). Nous nous réservons le droit de modifier, suspendre ou cesser le service à tout moment, avec ou sans préavis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Conditions d'Accès
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.1 Éligibilité
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous devez être âgé(e) d'au moins 16 ans pour utiliser l'Application</li>
              <li>Vous êtes responsable de la conformité de votre utilisation avec la législation de votre pays</li>
              <li>L'Application est accessible depuis la France et l'Union Européenne</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.2 Création de Compte
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous êtes responsable de la confidentialité de votre mot de passe</li>
              <li>Vous acceptez de fournir des informations exactes et complètes lors de l'inscription</li>
              <li>Un email valide est requis pour créer un compte</li>
              <li>Vous êtes responsable de toutes les activités qui se déroulent sur votre compte</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.3 Sécurité du Compte
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous vous engagez à ne pas partager votre mot de passe avec d'autres personnes</li>
              <li>Vous acceptez de notifier immédiatement APP SENDER de tout accès non autorisé à votre compte</li>
              <li>Vous acceptez de vous déconnecter de l'Application après chaque session, particulièrement sur des appareils partagés</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Utilisation Acceptable
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              4.1 Vous vous engagez à :
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Utiliser l'Application exclusivement à des fins personnelles et légales</li>
              <li>Respecter tous les droits de propriété intellectuelle de tiers</li>
              <li>Ne pas spam, harceler ou menacer d'autres utilisateurs ou employeurs</li>
              <li>Ne pas utiliser l'Application pour des activités illégales ou frauduleuses</li>
              <li>Ne pas tenter d'accéder ou de modifier le système sans autorisation</li>
              <li>Respecter les conditions d'utilisation de Gmail et de l'API gouvernementale</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              4.2 Vous vous engagez à NE PAS :
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Utiliser l'Application pour envoyer des emails de masse non consentis (spam)</li>
              <li>Falsifier votre identité ou les informations de votre candidature</li>
              <li>Partager votre compte avec d'autres personnes</li>
              <li>Tenter de contourner les mesures de sécurité</li>
              <li>Télécharger ou extraire massivement des offres d'emploi</li>
              <li>Utiliser des bots ou scripts d'automatisation (sauf ceux fournis par l'Application)</li>
              <li>Revendre ou monétiser les données obtenues via l'Application</li>
              <li>Critiquer ou dénigrer les employeurs de manière malveillante</li>
              <li>Utiliser l'Application pour des fins de reconnaissance faciale, de profilage, ou de surveillance</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              4.3 Violations
            </h3>
            <p className="text-gray-700 mb-2">Toute violation de ces règles peut entraîner :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>La suspension immédiate de votre compte</li>
              <li>La suppression de vos données</li>
              <li>L'interdiction d'accès permanent à l'Application</li>
              <li>Une signalisation aux autorités compétentes si la loi l'exige</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Connexion Gmail
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              5.1 Consentement Explicite
            </h3>
            <p className="text-gray-700 mb-2">
              En connectant votre compte Gmail à APP SENDER, vous consentez explicitement à ce que l'Application :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Accède à vos emails, brouillons et contacts</li>
              <li>Lise et envoie des emails en votre nom</li>
              <li>Crée et modifie des brouillons</li>
              <li>Stocke une copie de vos emails sur nos serveurs</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.2 Responsabilité
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous êtes entièrement responsable de tous les emails envoyés via l'Application</li>
              <li>APP SENDER n'est pas responsable du contenu que vous envoyez</li>
              <li>APP SENDER n'est pas responsable de la réception ou du non-reçu de vos emails</li>
              <li>Vous acceptez que Gmail puisse classifier vos emails comme spam</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.3 Révocation
            </h3>
            <p className="text-gray-700 mb-2">
              Vous pouvez révoquer l'accès de l'Application à Gmail à tout moment via :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-3">
              <li>Les paramètres de votre compte Google (Security → Connected apps)</li>
              <li>Les paramètres de l'Application</li>
            </ul>
            <p className="text-gray-700">
              Une fois révoquée, l'Application ne pourra plus accéder à vos emails, mais les données déjà synchronisées resteront stockées conformément à notre Politique de Confidentialité.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.4 Limitations
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>L'Application n'accédera à Gmail que pour les besoins des fonctionnalités activées</li>
              <li>Nous ne partagerons jamais vos emails avec des tiers sans votre consentement</li>
              <li>Nous ne vendrons jamais vos données Gmail</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Données et Propriété Intellectuelle
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              6.1 Vos Données
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous conservez la propriété complète de vos données personnelles, emails et candidatures</li>
              <li>En utilisant l'Application, vous nous accordez une licence pour traiter vos données conformément à notre Politique de Confidentialité</li>
              <li>Vous pouvez demander la suppression de vos données à tout moment</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.2 Contenu Utilisateur
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Tout contenu que vous créez dans l'Application (candidatures, brouillons, etc.) vous appartient</li>
              <li>Vous accordez à APP SENDER le droit de stocker et de traiter ce contenu pour fournir le service</li>
              <li>APP SENDER peut utiliser des données anonymisées et agrégées pour améliorer le service (jamais vos données personnelles)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.3 Propriété Intellectuelle de l'Application
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>APP SENDER, son code, son design, et son contenu sont la propriété exclusive d'Eliyan JACQUET</li>
              <li>Vous n'avez pas le droit de reproduire, modifier, distribuer ou revendre l'Application</li>
              <li>Vous ne devez pas tenter de décompiler, désassembler ou effectuer d'ingénierie inverse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Limitation de Responsabilité
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              7.1 Accès et Disponibilité
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>APP SENDER est fournie "telle quelle" sans garantie de disponibilité continue</li>
              <li>Nous ne sommes pas responsables des interruptions de service, pannes ou indisponibilités</li>
              <li>L'Application peut être indisponible pour maintenance, mises à jour ou raisons techniques</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              7.2 Garanties
            </h3>
            <p className="text-gray-700 mb-2">Nous NE GARANTISSONS PAS :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Que l'Application répondra à vos attentes</li>
              <li>Que tous les bugs seront corrigés</li>
              <li>Que l'Application sera compatible avec tous les appareils ou navigateurs</li>
              <li>Que vos emails seront toujours reçus par les destinataires</li>
              <li>La durabilité des données en cas de catastrophe majeure</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              7.3 Limitation de Dommages
            </h3>
            <p className="text-gray-700 mb-2">
              EN AUCUN CAS, Eliyan JACQUET ou APP SENDER ne sera responsable pour :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-3">
              <li>Les pertes de données, emails ou candidatures</li>
              <li>Les dommages directs, indirects, consécutifs ou accidentels</li>
              <li>Les pertes de revenus ou d'opportunités d'emploi</li>
              <li>Les emails perdus, non reçus ou classés comme spam</li>
              <li>La mauvaise performance de l'Application</li>
            </ul>
            <p className="text-gray-700">
              Votre recours exclusif en cas de problème est la cessation de l'utilisation de l'Application.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              7.4 Limitation de Responsabilité Globale
            </h3>
            <p className="text-gray-700">
              La responsabilité totale d'APP SENDER ne peut en aucun cas dépasser 100 euros ou le montant payé (actuellement gratuit pour le prototype).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Conformité aux Lois
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              8.1 Respect des Lois
            </h3>
            <p className="text-gray-700 mb-2">
              Vous acceptez d'utiliser l'Application conformément à toutes les lois et réglementations applicables, notamment :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>La législation française sur l'emploi</li>
              <li>La loi sur la protection des données (RGPD, CNIL)</li>
              <li>Les conditions d'utilisation de Gmail</li>
              <li>Les conditions d'utilisation de l'API gouvernementale</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              8.2 Interdictions Légales
            </h3>
            <p className="text-gray-700 mb-2">L'Application ne peut pas être utilisée pour :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Des discriminations basées sur la race, le sexe, l'origine, la religion, le handicap, etc.</li>
              <li>Du harcèlement ou de la menace envers des employeurs</li>
              <li>De la fraude ou de la falsification d'identité</li>
              <li>Du phishing ou de la manipulation</li>
              <li>Toute activité illégale</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Données Externes
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              9.1 API du Gouvernement
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Les offres d'emploi proviennent de sources publiques gouvernementales</li>
              <li>APP SENDER n'est pas responsable de la pertinence, de l'exactitude ou de la disponibilité de ces données</li>
              <li>Vous acceptez les conditions d'utilisation de l'API gouvernementale</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              9.2 Liens Externes
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>L'Application peut contenir des liens vers des sites externes</li>
              <li>APP SENDER n'est pas responsable du contenu de ces sites externes</li>
              <li>Consultez leur politique de confidentialité avant de partager vos données</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Frais et Tarification
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              10.1 Gratuité du Prototype
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>APP SENDER est actuellement gratuite pendant la phase de prototype</li>
              <li>Nous nous réservons le droit de monétiser le service à l'avenir</li>
              <li>Tout changement de tarification sera communiqué au minimum 30 jours avant</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              10.2 Pas de Frais Cachés
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Il n'y a pas de frais cachés</li>
              <li>Vous n'êtes pas responsable des frais générés par votre utilisation (connexion, stockage, etc.)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Modifications des Conditions
            </h2>
            <p className="text-gray-700 mb-3">
              Nous pouvons modifier ces Conditions d'Utilisation à tout moment. Les modifications entrent en vigueur immédiatement après publication. Votre utilisation continue de l'Application signifie que vous acceptez les modifications.
            </p>
            <p className="text-gray-700 mb-2">Les modifications majeures seront communiquées via :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Un email à l'adresse associée à votre compte</li>
              <li>Un bandeau dans l'Application</li>
              <li>Un avis 30 jours avant l'entrée en vigueur (le cas échéant)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Résiliation
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              12.1 Résiliation par Vous
            </h3>
            <p className="text-gray-700 mb-2">
              Vous pouvez cesser d'utiliser l'Application à tout moment. Pour supprimer définitivement votre compte :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-3">
              <li>Accédez aux paramètres de votre compte</li>
              <li>Cliquez sur "Supprimer mon compte"</li>
              <li>Vos données seront supprimées conformément à notre Politique de Confidentialité</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              12.2 Résiliation par APP SENDER
            </h3>
            <p className="text-gray-700 mb-2">Nous pouvons suspendre ou résilier votre compte si :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous violez ces conditions</li>
              <li>Vous utilisez l'Application à des fins illégales</li>
              <li>Vous menacez ou harcelez d'autres utilisateurs</li>
              <li>Vous tentez d'accéder à des données non autorisées</li>
              <li>Pour des raisons techniques ou de sécurité</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              12.3 Conséquences
            </h3>
            <p className="text-gray-700 mb-2">En cas de résiliation :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Vous perdez l'accès à l'Application</li>
              <li>Vos données seront supprimées selon le calendrier de notre Politique de Confidentialité</li>
              <li>Les articles qui survivent à la résiliation restent en vigueur</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Indemnisation
            </h2>
            <p className="text-gray-700">
              Vous acceptez d'indemniser et de dégager de responsabilité APP SENDER et Eliyan JACQUET de tout :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-2">
              <li>Réclamation, demande ou action en justice</li>
              <li>Dommages, perte ou dépense</li>
              <li>Découlant de votre utilisation de l'Application ou de votre violation de ces conditions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Litige et Juridiction
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              14.1 Droit Applicable
            </h3>
            <p className="text-gray-700">
              Ces Conditions d'Utilisation sont régies par la loi française et le droit de l'Union Européenne, notamment le RGPD.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.2 Juridiction
            </h3>
            <p className="text-gray-700">
              Tout litige découlant de ces conditions sera soumis à la juridiction des tribunaux compétents de Paris, France.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.3 Résolution Alternative
            </h3>
            <p className="text-gray-700 mb-2">Avant d'engager des poursuites judiciaires, nous vous encourageons à :</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Nous contacter à eliyanjacquet99@gmail.com pour résoudre le différend à l'amiable</li>
              <li>Attendre 30 jours pour une réponse</li>
              <li>Recourir à la médiation si nécessaire</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Contact et Support
            </h2>
            <p className="text-gray-700 mb-3">
              Pour toute question sur ces Conditions d'Utilisation ou pour signaler une violation :
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email :</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700">
                <strong>Adresse :</strong> 41 rue Parmentier, 95870 Bezons
              </p>
              <p className="text-gray-700">
                <strong>Délai de réponse :</strong> Nous répondrons dans les 30 jours
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              16. Dispositions Diverses
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              16.1 Intégralité de l'Accord
            </h3>
            <p className="text-gray-700">
              Ces Conditions d'Utilisation, conjointement avec notre Politique de Confidentialité, constituent l'intégralité de l'accord entre vous et APP SENDER concernant l'utilisation de l'Application.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              16.2 Divisibilité
            </h3>
            <p className="text-gray-700">
              Si une partie de ces conditions est jugée invalide ou inapplicable, les autres dispositions restent en vigueur.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              16.3 Pas de Renonciation
            </h3>
            <p className="text-gray-700">
              Le fait que nous n'appliquions pas une disposition ne signifie pas que nous y renoncions définitivement.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              16.4 Cession
            </h3>
            <p className="text-gray-700">
              Vous ne pouvez pas céder vos droits ou obligations en vertu de ces conditions sans notre consentement écrit préalable.
            </p>
          </section>

          <hr className="my-8" />

          <div className="text-center text-gray-600">
            <p>
              <strong>Version :</strong> 1.0
            </p>
            <p>
              <strong>Date d'entrée en vigueur :</strong> 12 novembre 2025
            </p>
            <p>
              <strong>Dernière mise à jour :</strong> 12 novembre 2025
            </p>
            <p className="mt-4">
              <strong>Responsable :</strong> Eliyan JACQUET
            </p>
            <p>
              <strong>Email :</strong> eliyanjacquet99@gmail.com
            </p>
            <p>
              <strong>Adresse :</strong> 41 rue Parmentier, 95870 Bezons
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
