
-- Table for ATS professions with keywords
CREATE TABLE public.ats_professions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  primary_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  secondary_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  soft_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ats_professions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read professions"
ON public.ats_professions FOR SELECT
TO authenticated
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage professions"
ON public.ats_professions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed professions data
INSERT INTO public.ats_professions (name, primary_keywords, secondary_keywords, soft_skills) VALUES
('Marketing digital', 
 '["SEO","SEA","Google Ads","Facebook Ads","content marketing","emailing","inbound marketing","analytics","conversion","CRM","automation","branding","social media","ROI","KPI","copywriting","landing page","funnel","growth hacking","remarketing","display","affiliation","influenceur","e-commerce","newsletter","taux de clic","audience","engagement","campagne","stratégie digitale"]',
 '["coordination","planification","mise en page","reporting","benchmark","veille","budget","brief","créativité","rédaction","collaboration","gestion de projet","présentation","support","communication"]',
 '["autonomie","organisation","créativité","curiosité","esprit d''analyse","réactivité","travail en équipe","adaptabilité","rigueur","force de proposition","sens du détail","proactivité"]'),

('Développement web',
 '["JavaScript","TypeScript","React","Node.js","HTML","CSS","API","REST","SQL","Git","Docker","CI/CD","Python","PHP","Angular","Vue.js","MongoDB","PostgreSQL","AWS","Azure","microservices","backend","frontend","fullstack","agile","Scrum","DevOps","testing","debug","performance"]',
 '["architecture","documentation","code review","déploiement","maintenance","sécurité","scalabilité","refactoring","intégration","versioning","monitoring","automatisation","migration","optimisation"]',
 '["rigueur","logique","curiosité","autonomie","travail en équipe","résolution de problèmes","adaptabilité","patience","communication","esprit critique","apprentissage continu"]'),

('Ressources humaines',
 '["recrutement","formation","GPEC","paie","droit du travail","entretien","sourcing","onboarding","offboarding","SIRH","marque employeur","mobilité","rémunération","avantages sociaux","contrat de travail","période d''essai","convention collective","CSE","QVT","bien-être","talent management","assessment","ATS","LinkedIn Recruiter","intérim"]',
 '["planification","reporting","administration","conformité","médiation","conseil","accompagnement","évaluation","gestion","suivi","processus","politique RH","indicateurs","tableaux de bord"]',
 '["écoute","empathie","discrétion","diplomatie","organisation","communication","rigueur","sens du relationnel","adaptabilité","réactivité","confidentialité","bienveillance"]'),

('Commerce / Vente',
 '["prospection","négociation","closing","CRM","Salesforce","pipeline","chiffre d''affaires","objectifs","fidélisation","B2B","B2C","lead","qualification","rendez-vous","proposition commerciale","contrat","tarification","marge","upselling","cross-selling","cold calling","terrain","portefeuille client","partenariat","salon"]',
 '["reporting","prévision","analyse","stratégie","veille concurrentielle","présentation","démonstration","suivi","relance","administration","facturation","coordination"]',
 '["persuasion","persévérance","écoute active","dynamisme","autonomie","résistance au stress","esprit de compétition","sens du contact","adaptabilité","organisation","confiance en soi","orientation résultat"]'),

('Finance / Comptabilité',
 '["comptabilité","bilan","compte de résultat","trésorerie","fiscalité","audit","contrôle de gestion","budget","reporting financier","consolidation","normes IFRS","TVA","rapprochement bancaire","facturation","amortissement","provision","clôture","ERP","SAP","Excel","analyse financière","cash flow","P&L","balance","grand livre"]',
 '["rigueur","conformité","réglementation","procédures","archivage","documentation","vérification","réconciliation","planification","prévision","optimisation","suivi"]',
 '["rigueur","précision","discrétion","organisation","esprit d''analyse","fiabilité","intégrité","méthode","autonomie","sens du détail","concentration","patience"]'),

('Communication',
 '["relations presse","relations publiques","événementiel","communiqué","média","interview","stratégie de communication","plan de communication","identité visuelle","charte graphique","rédaction","storytelling","e-réputation","crise","sponsoring","partenariat","influence","contenus","vidéo","podcast","newsletter","intranet"]',
 '["coordination","planification","budget","brief","créativité","veille","benchmark","reporting","logistique","organisation","support","présentation","diffusion"]',
 '["créativité","aisance rédactionnelle","sens du relationnel","curiosité","réactivité","organisation","travail en équipe","adaptabilité","diplomatie","sens de l''esthétique","esprit de synthèse"]'),

('Data / Analytics',
 '["Python","SQL","machine learning","deep learning","data science","data analysis","Big Data","statistiques","modélisation","visualisation","Tableau","Power BI","ETL","data warehouse","Spark","Hadoop","TensorFlow","NLP","régression","classification","clustering","A/B testing","KPI","dashboard","data mining","R","Pandas","NumPy"]',
 '["reporting","documentation","automatisation","pipeline","architecture","qualité des données","gouvernance","sécurité","migration","intégration","monitoring","optimisation"]',
 '["rigueur","curiosité","esprit d''analyse","logique","autonomie","communication","pédagogie","résolution de problèmes","adaptabilité","sens critique","patience"]'),

('Design graphique',
 '["Photoshop","Illustrator","InDesign","Figma","Sketch","UI","UX","wireframe","maquette","prototypage","typographie","identité visuelle","charte graphique","logo","mise en page","infographie","responsive","design system","accessibilité","motion design","After Effects","3D","Blender","print","web design"]',
 '["créativité","veille","benchmark","brief","présentation","collaboration","itération","recherche utilisateur","test utilisateur","documentation","spécifications","livrable"]',
 '["créativité","sens de l''esthétique","curiosité","attention aux détails","ouverture d''esprit","autonomie","travail en équipe","communication","adaptabilité","patience","écoute"]'),

('Gestion de projet',
 '["planning","Gantt","agile","Scrum","Kanban","sprint","backlog","roadmap","budget","risques","jalons","livrables","cahier des charges","spécifications","JIRA","Trello","Monday","MS Project","PMO","PRINCE2","PMP","stakeholders","comité de pilotage","rétrospective","user story","MVP"]',
 '["coordination","suivi","reporting","documentation","communication","animation","facilitation","priorisation","estimation","allocation","gouvernance","processus"]',
 '["leadership","organisation","communication","diplomatie","résolution de problèmes","adaptabilité","rigueur","sens des priorités","écoute","esprit de synthèse","gestion du stress","négociation"]'),

('Logistique / Supply chain',
 '["supply chain","approvisionnement","stock","inventaire","entrepôt","WMS","transport","livraison","flux","commande","fournisseur","achat","douane","incoterms","SAP","ERP","lean","kanban","prévision","demande","traçabilité","qualité","certification","norme ISO","cross-docking"]',
 '["planification","coordination","suivi","optimisation","reporting","indicateurs","processus","amélioration continue","négociation","conformité","sécurité","documentation"]',
 '["rigueur","organisation","réactivité","sens des priorités","autonomie","travail en équipe","adaptabilité","résistance au stress","communication","esprit d''analyse","fiabilité"]'),

('Droit / Juridique',
 '["droit des affaires","droit du travail","droit des sociétés","contrat","contentieux","conformité","RGPD","propriété intellectuelle","rédaction juridique","veille juridique","due diligence","négociation","arbitrage","médiation","code civil","jurisprudence","procédure","réglementation","audit juridique","clause"]',
 '["recherche","analyse","rédaction","conseil","accompagnement","documentation","archivage","suivi","reporting","conformité","procédure","validation"]',
 '["rigueur","précision","discrétion","esprit d''analyse","éthique","communication","diplomatie","organisation","autonomie","esprit de synthèse","confidentialité","argumentation"]'),

('Informatique / Systèmes',
 '["réseau","serveur","Windows Server","Linux","Active Directory","VMware","firewall","cybersécurité","cloud","AWS","Azure","GCP","monitoring","backup","helpdesk","ITIL","ticketing","infrastructure","virtualisation","VPN","DNS","DHCP","TCP/IP","scripting","PowerShell","Bash"]',
 '["documentation","procédure","maintenance","déploiement","migration","support","incident","escalade","inventaire","conformité","audit","sécurité"]',
 '["rigueur","réactivité","patience","logique","autonomie","communication","résolution de problèmes","organisation","curiosité","travail en équipe","adaptabilité"]'),

('Ingénierie',
 '["CAO","DAO","AutoCAD","SolidWorks","CATIA","calcul","simulation","mécanique","électronique","matériaux","process","industrialisation","qualité","normes","prototype","essais","R&D","innovation","brevet","conception","dimensionnement","tolérance","spécification","cahier des charges","certification"]',
 '["documentation","reporting","planification","coordination","suivi","validation","vérification","amélioration continue","gestion de projet","analyse","optimisation","conformité"]',
 '["rigueur","précision","curiosité","esprit d''analyse","créativité","autonomie","travail en équipe","communication","méthode","patience","résolution de problèmes","innovation"]'),

('Assistanat / Administratif',
 '["secrétariat","accueil","agenda","courrier","classement","archivage","saisie","facturation","commande","fournitures","réunion","compte-rendu","téléphone","Word","Excel","PowerPoint","Outlook","ERP","CRM","standard","note de frais","déplacement","planning","organisation"]',
 '["gestion","coordination","suivi","support","logistique","communication","administration","procédure","mise à jour","relance","vérification","diffusion"]',
 '["organisation","rigueur","discrétion","polyvalence","réactivité","sens du service","communication","adaptabilité","autonomie","sens des priorités","fiabilité","diplomatie"]'),

('Community Management',
 '["réseaux sociaux","Facebook","Instagram","LinkedIn","TikTok","Twitter","modération","ligne éditoriale","calendrier éditorial","contenu","engagement","communauté","influence","hashtag","story","reel","analytics","KPI","publicité","sponsorisé","UGC","viralité","tendance","veille"]',
 '["planification","créativité","rédaction","benchmark","reporting","collaboration","brief","stratégie","animation","événement","partenariat","veille"]',
 '["créativité","réactivité","sens du relationnel","curiosité","humour","adaptabilité","organisation","empathie","écoute","esprit d''analyse","autonomie"]'),

('Cybersécurité',
 '["pentest","audit sécurité","SIEM","SOC","firewall","IDS","IPS","OWASP","CVE","vulnérabilité","chiffrement","authentification","ISO 27001","RGPD","incident","forensic","malware","phishing","ransomware","politique de sécurité","IAM","zero trust","EBIOS","threat intelligence"]',
 '["documentation","procédure","conformité","veille","reporting","sensibilisation","formation","analyse","monitoring","investigation","remédiation","gouvernance"]',
 '["rigueur","vigilance","curiosité","esprit d''analyse","discrétion","réactivité","autonomie","communication","éthique","résolution de problèmes","apprentissage continu"]'),

('Product Management',
 '["product","roadmap","backlog","user story","MVP","OKR","KPI","A/B testing","discovery","delivery","sprint","priorisation","persona","product-market fit","feature","release","analytics","funnel","rétention","onboarding","feedback","NPS","iteration","Go-to-market"]',
 '["coordination","communication","documentation","présentation","animation","facilitation","reporting","stratégie","benchmark","veille","collaboration","suivi"]',
 '["leadership","communication","empathie","curiosité","esprit d''analyse","adaptabilité","diplomatie","organisation","sens des priorités","vision","écoute","pragmatisme"]');
