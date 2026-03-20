
## Full Analysis of Problems

### Problem 1: Job descriptions NOT stored per-analysis
The `cv_analyses` table stores `job_description` (line 743 in analyze-cv-ats) but the `CvAnalysis` interface in `AdminATSTraining.tsx` (lines 37-49) does NOT include `job_description`. So when the bulk AI review sends `{ analysis }` to `ats-ai-review`, the job description is **never included**. The AI reviews keywords without the job posting context — it can't find new keywords from it.

### Problem 2: Bulk AI review is disconnected from job description
In `ats-ai-review/index.ts` (lines 263-292), the default review mode only looks at `analysis.analysis_result` keywords to validate/recategorize them. It never extracts **new** keywords from the job description. The bulk review is therefore only a keyword cleanup tool, not an enrichment tool.

### Problem 3: Score does NOT update after bulk review
The bulk review modifies `ats_professions` keywords for future analyses, but it does **not** re-run `analyze-cv-ats` for already-saved analyses. So past scores are frozen. Users re-analyzing after training would see improvements, but existing saved results do not.

### Problem 4: Soft skills overweighted vs hard skills
Looking at `analyze-cv-ats/index.ts`:
- Hard skills (primary): **30 pts** (10 keywords × 3pts) + bonuses
- Secondary keywords: **15 pts** (5 keywords × 3pts) + bonuses  
- Soft skills: **10 pts** (dynamic, split across all matches)

The soft skills section alone equals 20% of all scoring. The user wants this reduced in favor of hard skills.

---

## Plan

### Step 1 — Add `job_description` to `CvAnalysis` interface and bulk review
**File: `src/pages/Admin/AdminATSTraining.tsx`**

Add `job_description: string | null` to the `CvAnalysis` interface so the field is passed through when sending to the AI review Edge Function.

### Step 2 — Add new AI mode `extract_new_keywords` to `ats-ai-review`
**File: `supabase/functions/ats-ai-review/index.ts`**

Add a new mode block `extract_new_keywords` that:
1. Takes the job description from the analysis
2. Compares it against existing profession keywords
3. Returns new keywords found in the job posting that are not already in the DB

This is a distinct operation from the existing `review_analysis` mode (which validates/recategorizes).

### Step 3 — Fix bulk AI review to do 2 things per analysis
**File: `src/pages/Admin/AdminATSTraining.tsx`** — `runBulkAiReview` function

For each analysis, run **two sequential AI calls**:
1. Existing call: validate/recategorize existing keywords (already works)
2. NEW call: extract new keywords from the stored `job_description` that aren't yet in the profession — merge results into `primary_keywords` / `secondary_keywords`

Also add the `job_description` field to the existing `ats-ai-review` default mode context so the AI has better context for validation.

### Step 4 — Re-score analyses after bulk training
**File: `src/pages/Admin/AdminATSTraining.tsx`** — `runBulkAiReview` function

After updating a profession's keywords, for any analyses linked to that profession, trigger a re-score by calling `analyze-cv-ats` with the stored `cv_text` and `job_description`. Update `total_score` and `analysis_result` in `cv_analyses`. This is what makes the user's score actually change.

To avoid infinite loops, mark each re-scored analysis as `admin_reviewed: true`.

### Step 5 — Rebalance scoring weights in `analyze-cv-ats`
**File: `supabase/functions/analyze-cv-ats/index.ts`**

Reduce soft skills from **10 pts → 6 pts**, and redistribute to hard skills:
- Primary keywords: **30 pts → 34 pts** (keep 10 keywords × 3.4 pts)  
- Secondary keywords: **15 pts → 15 pts** (unchanged)
- Soft skills: **10 pts → 6 pts** (capped at 6)

Total remains ~100. This change affects all future analyses.

---

## Summary of Changes

| File | Change |
|---|---|
| `AdminATSTraining.tsx` | Add `job_description` to `CvAnalysis` interface |
| `AdminATSTraining.tsx` | Bulk review: call AI twice (validate + extract new keywords) |
| `AdminATSTraining.tsx` | Bulk review: re-score all analyses after profession update |
| `ats-ai-review/index.ts` | New `extract_new_keywords` mode using job description |
| `analyze-cv-ats/index.ts` | Hard skills: 34pts, soft skills: 6pts (rebalanced) |

```text
BULK REVIEW FLOW (fixed):

For each unreviewed analysis:
  1. AI validates existing keywords → clean bad ones
  2. AI extracts NEW keywords from job_description → add to profession
  3. Re-run scoring with updated profession → update stored score
  4. Mark as admin_reviewed
```

No database schema changes needed — `job_description` is already stored in `cv_analyses`.
