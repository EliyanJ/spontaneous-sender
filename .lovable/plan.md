

# Onglet Admin "Chatbot" -- Gestion du prompt et de la base de connaissances

## Objectif

Permettre a l'admin de modifier le prompt systeme du chatbot et d'ajouter/modifier des donnees de reference (FAQ, infos actualisees, etc.) directement depuis le back-office, sans toucher au code.

## Comment ca marche

Actuellement, le prompt du chatbot est ecrit "en dur" dans le code backend. Il ne peut etre modifie que par un developpeur. Le changement consiste a stocker ce prompt et les donnees de reference dans la base de donnees, pour que l'admin puisse les editer via une interface dediee.

```text
Avant :  Prompt fige dans le code --> Chatbot
Apres :  Admin edite le prompt en base --> Le backend lit la base --> Chatbot actualise
```

---

## Ce qui sera cree

### 1. Nouvelle table `chatbot_config`

Une table simple avec une seule ligne contenant :
- **system_prompt** : Le prompt systeme complet (celui qui definit le comportement du chatbot)
- **knowledge_base** : Un champ texte libre pour ajouter des informations supplementaires (FAQ, mises a jour, donnees actualisees). Ce contenu sera injecte dans le prompt avant chaque reponse.
- **model** : Le modele IA utilise (par defaut `google/gemini-2.5-flash`)
- **is_active** : Activer/desactiver le chatbot
- **updated_at** / **updated_by** : Tracabilite

RLS : Admins peuvent tout faire. Lecture publique pour que l'edge function puisse lire la config.

### 2. Nouvelle page admin : Chatbot

Un nouvel onglet "Chatbot" dans la navigation admin avec :

**Section "Prompt systeme"** :
- Un grand editeur de texte avec le prompt actuel pre-rempli
- Bouton "Sauvegarder"
- Indication de la derniere modification

**Section "Base de connaissances"** :
- Un editeur de texte pour ajouter des infos complementaires (FAQ, tarifs actualises, nouvelles fonctionnalites, etc.)
- Ces infos sont injectees automatiquement dans le prompt avant chaque reponse du chatbot
- Bouton "Sauvegarder"

**Section "Parametres"** :
- Choix du modele IA (dropdown)
- Toggle actif/inactif
- Bouton "Reinitialiser le prompt par defaut"

### 3. Modification de l'edge function `chatbot-assistant`

Au lieu de lire le prompt depuis une variable en dur, la fonction :
1. Lit `chatbot_config` depuis la base de donnees
2. Combine `system_prompt` + `knowledge_base` pour construire le prompt final
3. Utilise le modele configure
4. Si aucune config en base, utilise le prompt par defaut actuel comme fallback

---

## Details techniques

### Fichiers crees

| Fichier | Role |
|---------|------|
| `src/pages/Admin/AdminChatbot.tsx` | Page admin de gestion du chatbot |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/chatbot-assistant/index.ts` | Lire le prompt depuis la base au lieu du code |
| `src/pages/Admin/AdminLayout.tsx` | Ajouter l'onglet "Chatbot" dans la nav |
| `src/pages/Admin/index.ts` | Exporter AdminChatbot |
| `src/App.tsx` | Ajouter la route `/admin/chatbot` |

### Migration DB

```sql
CREATE TABLE public.chatbot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL,
  knowledge_base text DEFAULT '',
  model text DEFAULT 'google/gemini-2.5-flash',
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
-- RLS + insert du prompt actuel comme valeur initiale
```

### Comportement de l'edge function

```text
1. Requete arrive
2. Lire chatbot_config (1 ligne)
3. Si config trouvee et is_active = true :
     prompt = system_prompt + "\n\n# INFORMATIONS ACTUALISEES\n" + knowledge_base
4. Sinon : utiliser le prompt par defaut en dur (fallback)
5. Envoyer a l'IA avec le prompt construit
```

### Ordre d'implementation

1. Migration DB : creer `chatbot_config` avec le prompt actuel en valeur initiale
2. Creer la page admin `AdminChatbot.tsx`
3. Modifier l'edge function pour lire la config depuis la base
4. Ajouter la route et le lien dans la nav admin

