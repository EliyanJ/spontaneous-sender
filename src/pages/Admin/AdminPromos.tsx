import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Ticket, Plus, Copy, XCircle, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

interface Coupon {
  id: string;
  name: string | null;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  duration_in_months: number | null;
  valid: boolean;
  created: number;
}

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  coupon: Coupon;
  created: number;
}

export const AdminPromos = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Create coupon form
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [couponName, setCouponName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [duration, setDuration] = useState("once");
  const [durationMonths, setDurationMonths] = useState("");
  const [creating, setCreating] = useState(false);

  // Create promo code form
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [promoCodeText, setPromoCodeText] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [creatingPromo, setCreatingPromo] = useState(false);

  const callPromoApi = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const { data, error } = await supabase.functions.invoke("admin-manage-promos", {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await callPromoApi({ action: "list" });
      setCoupons(data.coupons || []);
      setPromoCodes(data.promoCodes || []);
    } catch (error: any) {
      toast.error(error.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateCoupon = async () => {
    if (!couponName || !discountValue) return;
    setCreating(true);
    try {
      await callPromoApi({
        action: "create_coupon",
        name: couponName,
        ...(discountType === "percent"
          ? { percent_off: parseFloat(discountValue) }
          : { amount_off: Math.round(parseFloat(discountValue) * 100), currency: "eur" }),
        duration,
        ...(duration === "repeating" ? { duration_in_months: parseInt(durationMonths) } : {}),
      });
      toast.success("Coupon créé !");
      setShowCreateCoupon(false);
      setCouponName(""); setDiscountValue(""); setDuration("once"); setDurationMonths("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!selectedCouponId || !promoCodeText) return;
    setCreatingPromo(true);
    try {
      await callPromoApi({
        action: "create_promo_code",
        coupon_id: selectedCouponId,
        code: promoCodeText,
        ...(maxRedemptions ? { max_redemptions: parseInt(maxRedemptions) } : {}),
      });
      toast.success(`Code promo ${promoCodeText.toUpperCase()} créé !`);
      setShowCreatePromo(false);
      setSelectedCouponId(""); setPromoCodeText(""); setMaxRedemptions("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeactivate = async (promoId: string) => {
    try {
      await callPromoApi({ action: "deactivate_promo", promo_id: promoId });
      toast.success("Code promo désactivé");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    }
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.percent_off) return `${coupon.percent_off}%`;
    if (coupon.amount_off) return `${(coupon.amount_off / 100).toFixed(2)}€`;
    return "-";
  };

  const formatDuration = (coupon: Coupon) => {
    if (coupon.duration === "once") return "Une fois";
    if (coupon.duration === "forever") return "Pour toujours";
    if (coupon.duration === "repeating") return `${coupon.duration_in_months} mois`;
    return coupon.duration;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Codes Promo</h1>
          <p className="text-muted-foreground">Gérer les coupons et codes de réduction Stripe</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateCoupon(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un coupon
          </Button>
          <Button onClick={() => setShowCreatePromo(true)} disabled={coupons.length === 0}>
            <Tag className="h-4 w-4 mr-2" />
            Générer un code promo
          </Button>
        </div>
      </div>

      {/* Active promo codes */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Codes promo ({promoCodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {promoCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun code promo créé.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Utilisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-primary">{promo.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => { navigator.clipboard.writeText(promo.code); toast.success("Copié !"); }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatDiscount(promo.coupon)}</TableCell>
                    <TableCell>{formatDuration(promo.coupon)}</TableCell>
                    <TableCell>
                      {promo.times_redeemed}{promo.max_redemptions ? ` / ${promo.max_redemptions}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge className={promo.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {promo.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {promo.active && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(promo.id)} className="text-red-400 hover:text-red-300">
                          <XCircle className="h-4 w-4 mr-1" /> Désactiver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Coupons list */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Coupons Stripe ({coupons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun coupon créé.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.name || coupon.id}</TableCell>
                    <TableCell>{formatDiscount(coupon)}</TableCell>
                    <TableCell>{formatDuration(coupon)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{coupon.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create coupon dialog */}
      <Dialog open={showCreateCoupon} onOpenChange={setShowCreateCoupon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom du coupon</Label>
              <Input value={couponName} onChange={(e) => setCouponName(e.target.value)} placeholder="Ex: Lancement -20%" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de réduction</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "amount")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Pourcentage (%)</SelectItem>
                    <SelectItem value="amount">Montant fixe (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{discountType === "percent" ? "Pourcentage" : "Montant (€)"}</Label>
                <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === "percent" ? "20" : "5.00"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durée</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Une fois</SelectItem>
                    <SelectItem value="repeating">X mois</SelectItem>
                    <SelectItem value="forever">Pour toujours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {duration === "repeating" && (
                <div className="space-y-2">
                  <Label>Nombre de mois</Label>
                  <Input type="number" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} placeholder="3" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateCoupon(false)}>Annuler</Button>
            <Button onClick={handleCreateCoupon} disabled={creating || !couponName || !discountValue}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create promo code dialog */}
      <Dialog open={showCreatePromo} onOpenChange={setShowCreatePromo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer un code promo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Coupon associé</Label>
              <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                <SelectTrigger><SelectValue placeholder="Choisir un coupon" /></SelectTrigger>
                <SelectContent>
                  {coupons.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.id} ({formatDiscount(c)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Code promo</Label>
              <Input value={promoCodeText} onChange={(e) => setPromoCodeText(e.target.value.toUpperCase())} placeholder="Ex: LAUNCH20" className="font-mono uppercase" />
            </div>
            <div className="space-y-2">
              <Label>Utilisations max (optionnel)</Label>
              <Input type="number" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Illimité" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreatePromo(false)}>Annuler</Button>
            <Button onClick={handleCreatePromo} disabled={creatingPromo || !selectedCouponId || !promoCodeText}>
              {creatingPromo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
