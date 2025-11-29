export interface SectorCategory {
  id: string;
  label: string;
  icon: string;
  subcategories: {
    label: string;
    description: string;
    codes: string[];
  }[];
}

export const SECTOR_CATEGORIES: SectorCategory[] = [
  {
    id: "informatique",
    label: "Informatique",
    icon: "💻",
    subcategories: [
      {
        label: "Programmation informatique",
        description: "Développement de logiciels, apps, sites web",
        codes: ["62.01Z"]
      },
      {
        label: "Conseil en systèmes et logiciels",
        description: "Conseil IT auprès des entreprises",
        codes: ["62.02A"]
      },
      {
        label: "Tierce maintenance",
        description: "Support et maintenance d'applications",
        codes: ["62.02B"]
      },
      {
        label: "Gestion d'installations informatiques",
        description: "Gestion serveurs, infrastructure",
        codes: ["62.03Z"]
      },
      {
        label: "Autres activités informatiques",
        description: "Services IT divers",
        codes: ["62.09Z"]
      },
      {
        label: "Traitement de données & hébergement",
        description: "Data centers, cloud, big data",
        codes: ["63.11Z"]
      },
      {
        label: "Portails Internet",
        description: "Création et gestion de portails web",
        codes: ["63.12Z"]
      }
    ]
  },
  {
    id: "conseil",
    label: "Conseil en gestion",
    icon: "📊",
    subcategories: [
      {
        label: "Conseil pour les affaires",
        description: "Stratégie, organisation, management",
        codes: ["70.22Z"]
      },
      {
        label: "Conseil en management",
        description: "Conseil en organisation et RH",
        codes: ["70.22Z"]
      },
      {
        label: "Autres activités de conseil",
        description: "Conseil spécialisé divers",
        codes: ["82.99Z"]
      }
    ]
  },
  {
    id: "marketing",
    label: "Marketing & Communication",
    icon: "📱",
    subcategories: [
      {
        label: "Régie publicitaire",
        description: "Achat et vente d'espaces publicitaires",
        codes: ["73.11Z"]
      },
      {
        label: "Conseil en publicité",
        description: "Stratégie publicitaire et créative",
        codes: ["73.12Z"]
      },
      {
        label: "Conseil en relations publiques",
        description: "Communication corporate et RP",
        codes: ["70.21Z"]
      }
    ]
  },
  {
    id: "architecture",
    label: "Architecture & Ingénierie",
    icon: "🏗️",
    subcategories: [
      {
        label: "Architecture",
        description: "Conception de bâtiments",
        codes: ["71.11Z"]
      },
      {
        label: "Ingénierie bâtiment",
        description: "Études techniques construction",
        codes: ["71.12A"]
      },
      {
        label: "Ingénierie génie civil",
        description: "Infrastructure, travaux publics",
        codes: ["71.12B"]
      },
      {
        label: "Contrôle technique automobile",
        description: "Contrôle et certification véhicules",
        codes: ["71.20A"]
      },
      {
        label: "Contrôle technique construction",
        description: "Contrôle qualité BTP",
        codes: ["71.20B"]
      }
    ]
  },
  {
    id: "finance",
    label: "Finance & Assurance",
    icon: "💰",
    subcategories: [
      {
        label: "Banque centrale",
        description: "Activités bancaires centrales",
        codes: ["64.11Z"]
      },
      {
        label: "Banques",
        description: "Activités bancaires diverses",
        codes: ["64.19Z"]
      },
      {
        label: "Holdings financières",
        description: "Gestion de participations",
        codes: ["64.20Z"]
      },
      {
        label: "Fonds de placement",
        description: "Gestion d'actifs et fonds",
        codes: ["64.30Z"]
      },
      {
        label: "Crédit-bail",
        description: "Location avec option d'achat",
        codes: ["64.91Z"]
      },
      {
        label: "Organismes financiers divers",
        description: "Autres services financiers",
        codes: ["64.92Z", "64.99Z"]
      },
      {
        label: "Assurance vie",
        description: "Produits d'assurance vie",
        codes: ["65.11Z"]
      },
      {
        label: "Autres assurances",
        description: "Assurance non-vie",
        codes: ["65.12Z"]
      },
      {
        label: "Courtage en assurance",
        description: "Intermédiation en assurances",
        codes: ["66.22Z"]
      },
      {
        label: "Gestion de patrimoine",
        description: "Conseil financier et gestion",
        codes: ["66.30Z"]
      }
    ]
  },
  {
    id: "commerce",
    label: "E-commerce & Commerce",
    icon: "🛒",
    subcategories: [
      {
        label: "Vente à distance (e-commerce)",
        description: "Commerce en ligne",
        codes: ["47.91A", "47.91B"]
      },
      {
        label: "Commerce de détail alimentaire",
        description: "Supermarchés, commerces alimentaires",
        codes: ["47.11B", "47.11C", "47.11D", "47.11E", "47.11F"]
      },
      {
        label: "Commerce de détail non alimentaire",
        description: "Magasins spécialisés",
        codes: ["47.19A", "47.19B"]
      }
    ]
  },
  {
    id: "immobilier",
    label: "Immobilier",
    icon: "🏠",
    subcategories: [
      {
        label: "Location de logements",
        description: "Gestion locative résidentielle",
        codes: ["68.20A"]
      },
      {
        label: "Location de terrains et autres biens",
        description: "Location commerciale et foncière",
        codes: ["68.20B"]
      },
      {
        label: "Agences immobilières",
        description: "Transaction et gestion immobilière",
        codes: ["68.31Z"]
      },
      {
        label: "Administration de biens immobiliers",
        description: "Syndic et gestion de copropriété",
        codes: ["68.32A", "68.32B"]
      }
    ]
  },
  {
    id: "sante",
    label: "Santé",
    icon: "🏥",
    subcategories: [
      {
        label: "Activités hospitalières",
        description: "Hôpitaux et cliniques",
        codes: ["86.10Z"]
      },
      {
        label: "Pratique médicale générale",
        description: "Cabinets de médecine générale",
        codes: ["86.21Z"]
      },
      {
        label: "Pratique médicale spécialisée",
        description: "Spécialistes médicaux",
        codes: ["86.22A", "86.22B"]
      },
      {
        label: "Pratique dentaire",
        description: "Cabinets dentaires",
        codes: ["86.23Z"]
      },
      {
        label: "Activités paramédicales",
        description: "Infirmiers, kinés, auxiliaires",
        codes: ["86.90A", "86.90B", "86.90C", "86.90D", "86.90E", "86.90F"]
      }
    ]
  },
  {
    id: "formation",
    label: "Formation",
    icon: "🎓",
    subcategories: [
      {
        label: "Enseignement post-secondaire",
        description: "Formations supérieures",
        codes: ["85.51Z", "85.52Z"]
      },
      {
        label: "Enseignement spécialisé",
        description: "Formations professionnelles",
        codes: ["85.53Z"]
      },
      {
        label: "Autres enseignements",
        description: "Cours divers et formations",
        codes: ["85.59A", "85.59B"]
      }
    ]
  },
  {
    id: "industrie",
    label: "Industrie & Construction",
    icon: "🏭",
    subcategories: [
      {
        label: "Industries agroalimentaires",
        description: "Transformation alimentaire",
        codes: ["10.11Z", "10.12Z", "10.13A", "10.13B", "10.20Z", "10.31Z", "10.32Z", "10.39A", "10.39B", "10.41A", "10.41B", "10.42Z", "10.51A", "10.51B", "10.51C", "10.51D", "10.52Z", "10.61A", "10.61B", "10.62Z", "10.71A", "10.71B", "10.71C", "10.71D", "10.72Z", "10.73Z", "10.81Z", "10.82Z", "10.83Z", "10.84Z", "10.85Z", "10.86Z", "10.89Z", "10.91Z", "10.92Z"]
      },
      {
        label: "Construction de bâtiments",
        description: "Promotion et construction immobilière",
        codes: ["41.10A", "41.10B", "41.10C", "41.10D", "41.20A", "41.20B"]
      },
      {
        label: "Génie civil",
        description: "Infrastructures et travaux publics",
        codes: ["42.11Z", "42.12Z", "42.13A", "42.13B", "42.21Z", "42.22Z", "42.91Z", "42.99Z"]
      },
      {
        label: "Énergie",
        description: "Production et distribution d'énergie",
        codes: ["35.11Z", "35.12Z", "35.13Z", "35.14Z", "35.21Z", "35.22Z", "35.23Z", "35.30Z"]
      },
      {
        label: "Environnement",
        description: "Gestion des déchets et assainissement",
        codes: ["36.00Z", "37.00Z", "38.11Z", "38.12Z", "38.21Z", "38.22Z", "38.31Z", "38.32Z", "39.00Z"]
      }
    ]
  },
  {
    id: "hotellerie",
    label: "Hôtellerie & Logistique",
    icon: "🏨",
    subcategories: [
      {
        label: "Hôtels",
        description: "Hébergement hôtelier",
        codes: ["55.10Z"]
      },
      {
        label: "Hébergement touristique",
        description: "Locations de vacances, campings",
        codes: ["55.20Z", "55.30Z"]
      },
      {
        label: "Restauration traditionnelle",
        description: "Restaurants et brasseries",
        codes: ["56.10A", "56.10B", "56.10C"]
      },
      {
        label: "Restauration rapide",
        description: "Fast-food et snacking",
        codes: ["56.21Z"]
      },
      {
        label: "Traiteurs et cantines",
        description: "Restauration collective",
        codes: ["56.29A", "56.29B"]
      },
      {
        label: "Débits de boissons",
        description: "Cafés et bars",
        codes: ["56.30Z"]
      },
      {
        label: "Transport & Logistique",
        description: "Transport de marchandises et personnes, entreposage",
        codes: ["49.10Z", "49.20Z", "49.31Z", "49.32Z", "49.39A", "49.39B", "49.39C", "49.41A", "49.41B", "49.41C", "49.42Z", "49.50Z", "50.10Z", "50.20Z", "50.30Z", "50.40Z", "51.10Z", "51.21Z", "51.22Z", "52.10A", "52.10B", "52.21Z", "52.22Z", "52.23Z", "52.24A", "52.24B", "52.29A", "52.29B"]
      }
    ]
  }
];
