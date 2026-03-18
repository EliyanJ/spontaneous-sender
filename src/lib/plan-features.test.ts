import { describe, it, expect } from "vitest";
import {
  getPlanFeatures,
  isPremiumPlan,
  PLAN_FEATURES,
  type PlanType,
} from "@/lib/plan-features";

describe("getPlanFeatures", () => {
  it("retourne les features du plan free", () => {
    const f = getPlanFeatures("free");
    expect(f.canUseAISearch).toBe(false);
    expect(f.canUseManualSearch).toBe(false);
    expect(f.canUseAutomaticSearch).toBe(true);
    expect(f.maxCompaniesPerSearch).toBe(20);
    expect(f.sendsLimit).toBe(5);
  });

  it("retourne les features du plan simple", () => {
    const f = getPlanFeatures("simple");
    expect(f.maxCompaniesPerSearch).toBe(50);
    expect(f.sendsLimit).toBe(100);
    expect(f.canGenerateAIEmails).toBe(false);
  });

  it("retourne les features du plan plus", () => {
    const f = getPlanFeatures("plus");
    expect(f.canUseAISearch).toBe(true);
    expect(f.canUseManualSearch).toBe(true);
    expect(f.maxCompaniesPerSearch).toBe(200);
    expect(f.canGenerateAIEmails).toBe(true);
    expect(f.canGenerateCoverLetters).toBe(true);
    expect(f.canAccessJobOffers).toBe(true);
    expect(f.locationLevel).toBe("city");
    expect(f.sendsLimit).toBe(400);
  });

  it("retourne les features free pour un plan inconnu", () => {
    const f = getPlanFeatures("unknown-plan");
    expect(f).toEqual(PLAN_FEATURES["free"]);
  });

  it("retourne les features free pour null", () => {
    const f = getPlanFeatures(null);
    expect(f).toEqual(PLAN_FEATURES["free"]);
  });
});

describe("isPremiumPlan", () => {
  it("retourne true uniquement pour 'plus'", () => {
    expect(isPremiumPlan("plus")).toBe(true);
    expect(isPremiumPlan("free")).toBe(false);
    expect(isPremiumPlan("simple")).toBe(false);
  });
});

describe("PLAN_FEATURES cohérence", () => {
  const plans: PlanType[] = ["free", "simple", "plus"];

  it("chaque plan a toutes les propriétés requises", () => {
    const requiredKeys: (keyof typeof PLAN_FEATURES["free"])[] = [
      "canUseAISearch",
      "canUseManualSearch",
      "canUseAutomaticSearch",
      "locationLevel",
      "maxCompaniesPerSearch",
      "canAccessJobOffers",
      "canGenerateAIEmails",
      "canGenerateCoverLetters",
      "canGenerateAISubjects",
      "sendsLimit",
    ];
    for (const plan of plans) {
      for (const key of requiredKeys) {
        expect(PLAN_FEATURES[plan]).toHaveProperty(key);
      }
    }
  });

  it("maxCompaniesPerSearch croît avec le plan", () => {
    expect(PLAN_FEATURES["free"].maxCompaniesPerSearch)
      .toBeLessThan(PLAN_FEATURES["simple"].maxCompaniesPerSearch);
    expect(PLAN_FEATURES["simple"].maxCompaniesPerSearch)
      .toBeLessThan(PLAN_FEATURES["plus"].maxCompaniesPerSearch);
  });

  it("sendsLimit croît avec le plan", () => {
    expect(PLAN_FEATURES["free"].sendsLimit)
      .toBeLessThan(PLAN_FEATURES["simple"].sendsLimit);
    expect(PLAN_FEATURES["simple"].sendsLimit)
      .toBeLessThan(PLAN_FEATURES["plus"].sendsLimit);
  });
});
