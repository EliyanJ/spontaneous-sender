import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { subDays } from "date-fns";

interface Props { period: string; }

const COLORS = [
  "hsl(var(--primary))", "hsl(210, 70%, 55%)", "hsl(150, 60%, 45%)",
  "hsl(40, 80%, 55%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 55%)",
  "hsl(180, 50%, 45%)", "hsl(330, 60%, 55%)", "hsl(60, 70%, 50%)", "hsl(120, 50%, 40%)"
];

const getPeriodDays = (period: string) => {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 365;
};

export const DataCandidatures = ({ period }: Props) => {
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [regionData, setRegionData] = useState<{ name: string; value: number }[]>([]);
  const [sectorData, setSectorData] = useState<{ name: string; value: number }[]>([]);
  const [aiUsage, setAiUsage] = useState({ withAI: 0, withoutAI: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const days = getPeriodDays(period);
      const since = subDays(new Date(), days).toISOString();

      // Get companies
      const { data: companies, count } = await supabase
        .from("companies")
        .select("ville, code_postal, libelle_ape, status", { count: "exact" })
        .gte("created_at", since);

      setTotalCompanies(count || 0);

      // Region from code_postal (first 2 digits)
      const regionMap: Record<string, number> = {};
      const sectorMap: Record<string, number> = {};

      (companies || []).forEach((c: { code_postal: string | null; libelle_ape: string | null }) => {
        const dept = c.code_postal?.substring(0, 2);
        if (dept) {
          const regionName = getDeptRegion(dept);
          regionMap[regionName] = (regionMap[regionName] || 0) + 1;
        }
        if (c.libelle_ape) {
          sectorMap[c.libelle_ape] = (sectorMap[c.libelle_ape] || 0) + 1;
        }
      });

      setRegionData(
        Object.entries(regionMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name, value]) => ({ name, value }))
      );

      setSectorData(
        Object.entries(sectorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, value]) => ({ name: name.length > 30 ? name.substring(0, 30) + "…" : name, value }))
      );

      // AI usage (emails with personalized subject vs generic)
      const { data: emailCampaigns } = await supabase
        .from("email_campaigns")
        .select("subject, body")
        .gte("created_at", since);

      const withAI = (emailCampaigns || []).filter((e: { body: string }) => 
        e.body && e.body.length > 200
      ).length;
      setAiUsage({ 
        withAI, 
        withoutAI: (emailCampaigns || []).length - withAI 
      });

      setLoading(false);
    };
    fetchData();
  }, [period]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const pieData = [
    { name: "Avec IA", value: aiUsage.withAI },
    { name: "Sans IA", value: aiUsage.withoutAI },
  ];

  return (
    <div className="space-y-6">
      {/* KPI */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Total entreprises postulées</p>
          <p className="text-3xl font-bold text-foreground">{totalCompanies.toLocaleString()}</p>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regions */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Répartition par région</CardTitle></CardHeader>
          <CardContent>
            {regionData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Pas de données</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* AI Usage */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-base">Utilisation emails IA</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted-foreground))" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sectors */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader><CardTitle className="text-base">Top 10 secteurs d'activité</CardTitle></CardHeader>
        <CardContent>
          {sectorData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sectorData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Entreprises" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function getDeptRegion(dept: string): string {
  const map: Record<string, string> = {
    "75": "Île-de-France", "77": "Île-de-France", "78": "Île-de-France", "91": "Île-de-France", "92": "Île-de-France", "93": "Île-de-France", "94": "Île-de-France", "95": "Île-de-France",
    "13": "PACA", "83": "PACA", "84": "PACA", "04": "PACA", "05": "PACA", "06": "PACA",
    "69": "Auvergne-RA", "01": "Auvergne-RA", "03": "Auvergne-RA", "07": "Auvergne-RA", "15": "Auvergne-RA", "26": "Auvergne-RA", "38": "Auvergne-RA", "42": "Auvergne-RA", "43": "Auvergne-RA", "63": "Auvergne-RA", "73": "Auvergne-RA", "74": "Auvergne-RA",
    "31": "Occitanie", "09": "Occitanie", "11": "Occitanie", "12": "Occitanie", "30": "Occitanie", "32": "Occitanie", "34": "Occitanie", "46": "Occitanie", "48": "Occitanie", "65": "Occitanie", "66": "Occitanie", "81": "Occitanie", "82": "Occitanie",
    "33": "Nouvelle-Aquit.", "16": "Nouvelle-Aquit.", "17": "Nouvelle-Aquit.", "19": "Nouvelle-Aquit.", "23": "Nouvelle-Aquit.", "24": "Nouvelle-Aquit.", "40": "Nouvelle-Aquit.", "47": "Nouvelle-Aquit.", "64": "Nouvelle-Aquit.", "79": "Nouvelle-Aquit.", "86": "Nouvelle-Aquit.", "87": "Nouvelle-Aquit.",
    "44": "Pays de la Loire", "49": "Pays de la Loire", "53": "Pays de la Loire", "72": "Pays de la Loire", "85": "Pays de la Loire",
    "35": "Bretagne", "22": "Bretagne", "29": "Bretagne", "56": "Bretagne",
    "59": "Hauts-de-France", "02": "Hauts-de-France", "60": "Hauts-de-France", "62": "Hauts-de-France", "80": "Hauts-de-France",
    "67": "Grand Est", "68": "Grand Est", "10": "Grand Est", "08": "Grand Est", "51": "Grand Est", "52": "Grand Est", "54": "Grand Est", "55": "Grand Est", "57": "Grand Est", "88": "Grand Est",
    "76": "Normandie", "14": "Normandie", "27": "Normandie", "50": "Normandie", "61": "Normandie",
    "45": "Centre-Val de L.", "18": "Centre-Val de L.", "28": "Centre-Val de L.", "36": "Centre-Val de L.", "37": "Centre-Val de L.", "41": "Centre-Val de L.",
    "21": "Bourgogne-FC", "25": "Bourgogne-FC", "39": "Bourgogne-FC", "58": "Bourgogne-FC", "70": "Bourgogne-FC", "71": "Bourgogne-FC", "89": "Bourgogne-FC", "90": "Bourgogne-FC",
    "20": "Corse", "2A": "Corse", "2B": "Corse",
  };
  return map[dept] || "Autre";
}
