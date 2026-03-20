// ══════════════════════════════════════════════════════════
// useTemplateConstraints.ts
// Charge le template_schema depuis la BDD pour un template donné,
// expose les contraintes (maxChars, maxLines, maxItems…)
// afin que le CVBuilderEditor les applique en temps réel.
// ══════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConstraintsMap } from "@/components/admin/template-builder/ConstraintsPanel";

export function useTemplateConstraints(templateId: string): ConstraintsMap {
  const { data } = useQuery({
    queryKey: ["template-constraints", templateId],
    enabled: !!templateId && /^[0-9a-f-]{36}$/i.test(templateId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cv_templates")
        .select("template_schema")
        .eq("id", templateId)
        .single();
      if (error || !data?.template_schema) return {};
      const schema = data.template_schema as any;
      return (schema?.constraints ?? {}) as ConstraintsMap;
    },
  });

  return data ?? {};
}
