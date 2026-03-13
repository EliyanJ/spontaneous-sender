// ══════════════════════════════════════════════════════════
// src/lib/cv-export/exportDocx.ts
// Génère un document Word (.docx) structuré à partir
// des données du CV. Construction programmatique via docx.js.
// ══════════════════════════════════════════════════════════

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  TabStopType,
  LeaderType,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import type { TemplateCVData } from "@/lib/cv-templates/injectCVData";
import type { DocxStyleConfig } from "./extractStyleFromTemplate";

export interface ExportDocxOptions {
  cvData: TemplateCVData;
  fileName?: string;
  style?: Partial<DocxStyleConfig>;
}

const DEFAULT_STYLE: DocxStyleConfig = {
  fontFamily: "Arial",
  headingColor: "1A3C72",
  textColor: "333333",
  headingBorder: true,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pt(points: number) {
  return points * 2; // docx uses half-points
}

function sectionTitle(
  text: string,
  style: DocxStyleConfig
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: style.fontFamily,
        size: pt(11),
        color: style.headingColor,
      }),
    ],
    spacing: { before: 200, after: 80 },
    border: style.headingBorder
      ? {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 6,
            color: style.headingColor,
            space: 4,
          },
        }
      : undefined,
  });
}

function bulletParagraph(text: string, style: DocxStyleConfig): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: style.fontFamily,
        size: pt(9.5),
        color: style.textColor,
      }),
    ],
    numbering: { reference: "cv-bullets", level: 0 },
    spacing: { before: 20, after: 20 },
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [new TextRun({ text: "" })] });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportCVToDocx({
  cvData,
  fileName = "CV.docx",
  style = {},
}: ExportDocxOptions): Promise<void> {
  const s: DocxStyleConfig = { ...DEFAULT_STYLE, ...style };

  const sections: Paragraph[] = [];

  // ── 1. Header : Nom + Titre ──
  if (cvData.full_name) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cvData.full_name.toUpperCase(),
            bold: true,
            font: s.fontFamily,
            size: pt(22),
            color: s.headingColor,
          }),
        ],
        spacing: { after: 60 },
        alignment: AlignmentType.LEFT,
      })
    );
  }

  if (cvData.main_title) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cvData.main_title,
            bold: true,
            font: s.fontFamily,
            size: pt(11),
            color: s.headingColor,
          }),
        ],
        spacing: { after: 40 },
      })
    );
  }

  if (cvData.sub_titles) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cvData.sub_titles,
            font: s.fontFamily,
            size: pt(10),
            color: s.textColor,
            italics: true,
          }),
        ],
        spacing: { after: 60 },
      })
    );
  }

  // Contact sur une ligne séparée par " | "
  const contactParts = [
    cvData.phone,
    cvData.email,
    cvData.location,
    (cvData as any).linkedin,
  ].filter(Boolean) as string[];

  if (contactParts.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join(" | "),
            font: s.fontFamily,
            size: pt(9),
            color: "666666",
          }),
        ],
        spacing: { after: 160 },
      })
    );
  }

  // ── 2. Résumé ──
  if (cvData.summary) {
    sections.push(sectionTitle("Profil", s));
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cvData.summary,
            font: s.fontFamily,
            size: pt(10),
            color: s.textColor,
          }),
        ],
        spacing: { after: 80 },
      })
    );
    sections.push(emptyLine());
  }

  // ── 3. Expériences ──
  if (cvData.experiences && cvData.experiences.length > 0) {
    sections.push(sectionTitle("Expériences Professionnelles", s));

    cvData.experiences.forEach((exp) => {
      // Titre à gauche, date à droite via tabulation
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              font: s.fontFamily,
              size: pt(10),
              color: s.textColor,
            }),
            new TextRun({
              text: "\t" + (exp.date || ""),
              font: s.fontFamily,
              size: pt(9),
              color: "888888",
            }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: convertInchesToTwip(6.5),
              leader: LeaderType.NONE,
            },
          ],
          spacing: { before: 120, after: 40 },
        })
      );

      (exp.bullets || []).filter(Boolean).forEach((bullet) => {
        sections.push(bulletParagraph(bullet, s));
      });
    });

    sections.push(emptyLine());
  }

  // ── 4. Entrepreneuriat ──
  if (cvData.entrepreneurship && cvData.entrepreneurship.length > 0) {
    sections.push(sectionTitle("Entrepreneuriat", s));

    cvData.entrepreneurship.forEach((item) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              font: s.fontFamily,
              size: pt(10),
              color: s.textColor,
            }),
          ],
          spacing: { before: 120, after: 40 },
        })
      );

      (item.bullets || []).filter(Boolean).forEach((bullet) => {
        sections.push(bulletParagraph(bullet, s));
      });
    });

    sections.push(emptyLine());
  }

  // ── 5. Compétences ──
  if (cvData.skills && cvData.skills.length > 0) {
    sections.push(sectionTitle("Compétences", s));

    cvData.skills.forEach((skill) => {
      const parts = [skill.detail_1, skill.detail_2].filter(Boolean);
      if (skill.category || parts.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              ...(skill.category
                ? [
                    new TextRun({
                      text: skill.category + ": ",
                      bold: true,
                      font: s.fontFamily,
                      size: pt(9.5),
                      color: s.textColor,
                    }),
                  ]
                : []),
              new TextRun({
                text: parts.join(", "),
                font: s.fontFamily,
                size: pt(9.5),
                color: s.textColor,
              }),
            ],
            spacing: { before: 30, after: 30 },
          })
        );
      }
    });

    sections.push(emptyLine());
  }

  // ── 6. Formation ──
  if (cvData.education && cvData.education.length > 0) {
    sections.push(sectionTitle("Formation", s));

    cvData.education.forEach((edu) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.label,
              bold: true,
              font: s.fontFamily,
              size: pt(10),
              color: s.textColor,
            }),
            new TextRun({
              text: "\t" + (edu.date || ""),
              font: s.fontFamily,
              size: pt(9),
              color: "888888",
            }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: convertInchesToTwip(6.5),
              leader: TabStopLeader.NONE,
            },
          ],
          spacing: { before: 80, after: 40 },
        })
      );
    });

    sections.push(emptyLine());
  }

  // ── 7. Langues + Centres d'intérêt ──
  if (cvData.languages_content || cvData.interests_content) {
    sections.push(sectionTitle("Langues & Centres d'intérêt", s));

    if (cvData.languages_content) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Langues : ",
              bold: true,
              font: s.fontFamily,
              size: pt(9.5),
              color: s.textColor,
            }),
            new TextRun({
              text: cvData.languages_content,
              font: s.fontFamily,
              size: pt(9.5),
              color: s.textColor,
            }),
          ],
          spacing: { before: 60, after: 30 },
        })
      );
    }

    if (cvData.interests_content) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Centres d'intérêt : ",
              bold: true,
              font: s.fontFamily,
              size: pt(9.5),
              color: s.textColor,
            }),
            new TextRun({
              text: cvData.interests_content,
              font: s.fontFamily,
              size: pt(9.5),
              color: s.textColor,
            }),
          ],
          spacing: { before: 30, after: 60 },
        })
      );
    }
  }

  // ── Document config ──────────────────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "cv-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: convertInchesToTwip(0.25),
                    hanging: convertInchesToTwip(0.15),
                  },
                },
                run: {
                  font: "Arial",
                  size: pt(9.5),
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in DXA (twips)
              height: 16838, // A4 height in DXA
            },
            margin: {
              top: 1134,    // ≈ 20mm
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}
