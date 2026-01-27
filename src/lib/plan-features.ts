// Plan features configuration - defines what each plan can access

export type PlanType = "free" | "simple" | "plus";

export interface PlanFeatures {
  // Search capabilities
  canUseAISearch: boolean;
  canUseManualSearch: boolean;
  canUseAutomaticSearch: boolean;
  locationLevel: 'department' | 'city';
  maxCompaniesPerSearch: number;
  
  // Job offers access
  canAccessJobOffers: boolean;
  
  // Email AI features
  canGenerateAIEmails: boolean;
  canGenerateCoverLetters: boolean;
  canGenerateAISubjects: boolean;
  
  // Limits
  sendsLimit: number;
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  free: {
    canUseAISearch: false,
    canUseManualSearch: false,
    canUseAutomaticSearch: true,
    locationLevel: 'department',
    maxCompaniesPerSearch: 20,
    canAccessJobOffers: false,
    canGenerateAIEmails: false,
    canGenerateCoverLetters: false,
    canGenerateAISubjects: false,
    sendsLimit: 5,
  },
  simple: {
    canUseAISearch: false,
    canUseManualSearch: false,
    canUseAutomaticSearch: true,
    locationLevel: 'department',
    maxCompaniesPerSearch: 50,
    canAccessJobOffers: false,
    canGenerateAIEmails: false,
    canGenerateCoverLetters: false,
    canGenerateAISubjects: false,
    sendsLimit: 100,
  },
  plus: {
    canUseAISearch: true,
    canUseManualSearch: true,
    canUseAutomaticSearch: true,
    locationLevel: 'city',
    maxCompaniesPerSearch: 200,
    canAccessJobOffers: true,
    canGenerateAIEmails: true,
    canGenerateCoverLetters: true,
    canGenerateAISubjects: true,
    sendsLimit: 400,
  }
};

// Helper to check if a plan is "premium" (has AI features)
export const isPremiumPlan = (planType: PlanType): boolean => {
  return planType === 'plus';
};

// Get features for a plan type, defaulting to 'free' if not found
export const getPlanFeatures = (planType: PlanType | string | null): PlanFeatures => {
  const validPlanType = (planType && planType in PLAN_FEATURES) 
    ? planType as PlanType 
    : 'free';
  return PLAN_FEATURES[validPlanType];
};
