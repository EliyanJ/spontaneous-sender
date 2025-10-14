import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Mail, MessageSquare, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Support() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Support</h2>
        <p className="text-muted-foreground">Besoin d'aide ? Nous sommes là pour vous</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contactez-nous
            </CardTitle>
            <CardDescription>
              Notre équipe vous répond sous 24h
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              support@prospection.fr
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Chat en direct
            </CardTitle>
            <CardDescription>
              Discutez avec notre équipe en temps réel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Ouvrir le chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Documentation
          </CardTitle>
          <CardDescription>
            Guides et tutoriels pour utiliser la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold">Guide de démarrage</h3>
            <p className="text-sm text-muted-foreground">
              Apprenez les bases de la recherche d'entreprises
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold">Créer une campagne email</h3>
            <p className="text-sm text-muted-foreground">
              Configurez et lancez votre première campagne
            </p>
          </div>
          <div className="border-l-4 border-primary pl-4 py-2">
            <h3 className="font-semibold">Trouver des emails</h3>
            <p className="text-sm text-muted-foreground">
              Maximisez vos chances de trouver des contacts
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Questions fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">Comment fonctionne la recherche d'entreprises ?</h4>
            <p className="text-sm text-muted-foreground">
              Utilisez les filtres (secteur, ville, effectif) pour cibler vos prospects. Le système recherche dans la base gouvernementale des entreprises françaises.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Combien d'emails puis-je envoyer par jour ?</h4>
            <p className="text-sm text-muted-foreground">
              Vous pouvez configurer jusqu'à 100 emails par jour et par campagne. Nous recommandons de commencer par 40 emails/jour.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Comment sont trouvés les emails ?</h4>
            <p className="text-sm text-muted-foreground">
              Notre système recherche automatiquement les emails via l'API hunter.io en analysant le site web de l'entreprise.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
