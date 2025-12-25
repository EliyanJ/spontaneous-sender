// Stripe product and price configuration
export const STRIPE_PRODUCTS = {
  PLAN_SIMPLE: {
    product_id: "prod_Tfbyp2POhagRwc",
    price_id: "price_1SiGk5KkkIHh6CiwgtT585N8",
    name: "Simple",
    price: 24,
    sends_limit: 200,
    plan_type: "simple" as const,
    features: [
      "200 envois d'emails par mois",
      "Recherche d'entreprises illimitée",
      "Génération d'emails personnalisés",
      "Suivi des réponses",
      "Support par email"
    ]
  },
  PLAN_PLUS: {
    product_id: "prod_TfbyAGlkrpQCUE",
    price_id: "price_1SiGkGKkkIHh6CiwsTek7M1f",
    name: "Plus",
    price: 39,
    sends_limit: 400,
    plan_type: "plus" as const,
    features: [
      "400 envois d'emails par mois",
      "Recherche d'entreprises illimitée",
      "Génération d'emails personnalisés",
      "Suivi des réponses",
      "Support prioritaire",
      "Analyse des réponses IA"
    ]
  },
  PACK_50_TOKENS: {
    product_id: "prod_TfbzOex2KTEYcJ",
    price_id: "price_1SiGl7KkkIHh6CiwbdTxZ5pd",
    name: "Pack 50 Tokens",
    price: 5,
    tokens: 50
  },
  PACK_100_TOKENS: {
    product_id: "prod_TfbzIxumQAOVne",
    price_id: "price_1SiGlJKkkIHh6CiwzKjAjPeb",
    name: "Pack 100 Tokens",
    price: 9,
    tokens: 100
  }
} as const;

export const FREE_PLAN = {
  name: "Gratuit",
  price: 0,
  sends_limit: 5,
  plan_type: "free" as const,
  features: [
    "5 envois d'emails par mois",
    "Recherche d'entreprises limitée",
    "Génération d'emails de base"
  ]
};

export type PlanType = "free" | "simple" | "plus";
export type PriceType = "PLAN_SIMPLE" | "PLAN_PLUS" | "PACK_50_TOKENS" | "PACK_100_TOKENS";
