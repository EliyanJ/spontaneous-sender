import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props { period: string; }

const COLORS = [
  "hsl(var(--primary))", "hsl(210, 70%, 55%)", "hsl(150, 60%, 45%)",
  "hsl(40, 80%, 55%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(330, 60%, 55%)", "hsl(60, 70%, 50%)", "hsl(120, 50%, 40%)"
];

const EDUCATION_LABELS: Record<string, string> = {
  college: "Collège",
  lycee: "Lycée",
  bac: "Bac",
  "bac+1": "Bac+1",
  "bac+2": "Bac+2",
  licence: "Licence",
  master1: "Master 1",
  master2: "Master 2",
  doctorat: "Doctorat",
  autre: "Autre",
  non_etudiant: "Non étudiant",
};

const GENDER_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  autre: "Autre",
  non_precise: "Non précisé",
};

export const DataDemographics = ({ period }: Props) => {
  const [educationData, setEducationData] = useState<{ name: string; value: number }[]>([]);
  const [ageData, setAgeData] = useState<{ name: string; value: number }[]>([]);
  const [genderData, setGenderData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("education_level, age, gender");

      // Education
      const eduMap: Record<string, number> = {};
      const ageMap: Record<string, number> = { "< 18": 0, "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
      const genMap: Record<string, number> = {};

      (profiles || []).forEach((p: { education_level: string | null; age: number | null; gender: string | null }) => {
        const edu = p.education_level || "non_precise";
        eduMap[edu] = (eduMap[edu] || 0) + 1;

        if (p.age) {
          if (p.age < 18) ageMap["< 18"]++;
          else if (p.age <= 24) ageMap["18-24"]++;
          else if (p.age <= 34) ageMap["25-34"]++;
          else if (p.age <= 44) ageMap["35-44"]++;
          else if (p.age <= 54) ageMap["45-54"]++;
          else ageMap["55+"]++;
        }

        const gen = p.gender || "non_precise";
        genMap[gen] = (genMap[gen] || 0) + 1;
      });

      setEducationData(
        Object.entries(eduMap)
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => ({ name: EDUCATION_LABELS[key] || key, value }))
      );

      setAgeData(
        Object.entries(ageMap)
          .filter(([_, v]) => v > 0)
          .map(([name, value]) => ({ name, value }))
      );

      setGenderData(
        Object.entries(genMap)
          .sort((a, b) => b[1] - a[1])
          .map(([key, value]) => ({ name: GENDER_LABELS[key] || key, value }))
      );

      setLoading(false);
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Education */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Niveau d'études</CardTitle></CardHeader>
          <CardContent>
            {educationData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Pas de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={educationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {educationData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gender */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Genre</CardTitle></CardHeader>
          <CardContent>
            {genderData.length === 0 || (genderData.length === 1 && genderData[0].name === "Non précisé") ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Données insuffisantes</p>
                <p className="text-xs text-muted-foreground mt-2">Le champ genre a été ajouté au formulaire d'inscription. Les données se rempliront avec les nouveaux inscrits.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    <Cell fill="hsl(210, 70%, 55%)" />
                    <Cell fill="hsl(330, 60%, 55%)" />
                    <Cell fill="hsl(var(--muted-foreground))" />
                    <Cell fill="hsl(var(--accent))" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Age distribution */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Répartition par âge</CardTitle></CardHeader>
        <CardContent>
          {ageData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Utilisateurs" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
