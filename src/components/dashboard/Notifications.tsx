import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground">Restez informé de l'activité de vos campagnes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Centre de notifications
          </CardTitle>
          <CardDescription>
            Vous serez notifié ici des événements importants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune notification pour le moment</p>
            <p className="text-sm mt-2">
              Les notifications concernant vos campagnes apparaîtront ici
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
