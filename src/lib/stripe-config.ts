// Stripe product and price configuration
// NOTE: These are TEST mode IDs. Update to live mode IDs for production.
export const STRIPE_PRODUCTS = {
  PLAN_SIMPLE: {
    product_id: "prod_TfcggrdvMApvwb",
    price_id: "price_1SiHQsKkkIHh6Ciw0GNQyKqa",
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
    product_id: "prod_TfcgvmNBq9q0Ey",
    price_id: "price_1SiHR4KkkIHh6CiwAM6trrO4",
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
    product_id: "prod_Tfcgjrr4dczx18",
    price_id: "price_1SiHRPKkkIHh6CiwLLZhqmQP",
    name: "Pack 50 Tokens",
    price: 5,
    tokens: 50
  },
  PACK_100_TOKENS: {
    product_id: "prod_Tfcgt8kBYS7YpN",
    price_id: "price_1SiHRZKkkIHh6CiwgBGkvm0U",
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
