import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlacklistEntry {
  id: string;
  company_siren: string;
  contacted_at: string;
}

export const Blacklist = () => {
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [siren, setSiren] = useState("");

  const fetchBlacklist = async () => {
    const { data, error } = await supabase
      .from("user_company_blacklist")
      .select("*")
      .order("contacted_at", { ascending: false });

    if (!error && data) setBlacklist(data);
  };

  const addToBlacklist = async () => {
    if (!siren) {
      toast.error("Veuillez entrer un numéro SIREN");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("user_company_blacklist").insert({
        user_id: user.id,
        company_siren: siren,
      });

      if (error) throw error;

      toast.success("SIREN ajouté à la blacklist");
      setSiren("");
      fetchBlacklist();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="h-5 w-5" />
          Blacklist
        </CardTitle>
        <CardDescription>
          Entreprises déjà contactées ({blacklist.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label>Ajouter un SIREN</Label>
            <div className="flex gap-2">
              <Input
                placeholder="123456789"
                value={siren}
                onChange={(e) => setSiren(e.target.value)}
              />
              <Button onClick={addToBlacklist}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {blacklist.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune entreprise dans la blacklist
            </p>
          ) : (
            blacklist.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="font-mono text-sm">{entry.company_siren}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.contacted_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
