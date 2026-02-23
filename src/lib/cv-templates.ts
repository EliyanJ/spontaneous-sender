// Finance/Corporate CV Template - inspired by the uploaded marketing CV
export const financeTemplate = {
  name: "Finance & Corporate",
  sector: "finance",
  css: `
    .cv-page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      margin: 0 auto;
      background: #ffffff;
      color: #1a1a2e;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 10pt;
      line-height: 1.5;
      box-sizing: border-box;
      position: relative;
    }
    .cv-header {
      background: linear-gradient(135deg, #0f1b3d 0%, #1a2d5a 100%);
      color: #ffffff;
      padding: 28px 36px 22px;
      position: relative;
    }
    .cv-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 36px;
      right: 36px;
      height: 3px;
      background: linear-gradient(90deg, #c9a84c, #e8d48b, #c9a84c);
    }
    .cv-name {
      font-size: 26pt;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 4px;
      font-family: 'Georgia', serif;
    }
    .cv-title {
      font-size: 11pt;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #c9a84c;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-weight: 300;
      margin-bottom: 12px;
    }
    .cv-contact {
      font-size: 8.5pt;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #d0d0e0;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cv-contact span {
      white-space: nowrap;
    }
    .cv-body {
      padding: 24px 36px;
    }
    .cv-summary {
      font-style: italic;
      color: #333;
      border-left: 3px solid #c9a84c;
      padding-left: 14px;
      margin-bottom: 20px;
      font-size: 9.5pt;
      line-height: 1.6;
    }
    .cv-section {
      margin-bottom: 18px;
    }
    .cv-section-title {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #0f1b3d;
      border-bottom: 2px solid #0f1b3d;
      padding-bottom: 4px;
      margin-bottom: 12px;
      font-family: 'Helvetica Neue', Arial, sans-serif;
    }
    .cv-exp-item {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .cv-exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .cv-exp-role {
      font-weight: 700;
      font-size: 10pt;
      color: #1a1a2e;
    }
    .cv-exp-dates {
      font-size: 8.5pt;
      color: #666;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-style: italic;
    }
    .cv-exp-company {
      font-size: 9pt;
      color: #c9a84c;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .cv-exp-bullets {
      padding-left: 16px;
      margin: 4px 0 0;
    }
    .cv-exp-bullets li {
      font-size: 9pt;
      margin-bottom: 2px;
      color: #333;
      line-height: 1.5;
    }
    .cv-edu-item {
      margin-bottom: 8px;
    }
    .cv-edu-degree {
      font-weight: 700;
      font-size: 9.5pt;
    }
    .cv-edu-school {
      font-size: 9pt;
      color: #555;
    }
    .cv-edu-dates {
      font-size: 8.5pt;
      color: #888;
      font-style: italic;
    }
    .cv-skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .cv-skill-tag {
      background: #f0f0f5;
      border: 1px solid #d0d0e0;
      border-radius: 3px;
      padding: 2px 8px;
      font-size: 8.5pt;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
    }
    .cv-languages {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .cv-lang-item {
      font-size: 9pt;
    }
    .cv-lang-name {
      font-weight: 600;
    }
    .cv-lang-level {
      color: #666;
      font-size: 8.5pt;
    }
    .cv-two-col {
      display: flex;
      gap: 24px;
    }
    .cv-two-col > div {
      flex: 1;
    }
    @media print {
      .cv-page {
        box-shadow: none;
        margin: 0;
      }
    }
  `,
};

export interface CVData {
  personalInfo: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone: string;
    address: string;
    linkedin: string;
  };
  summary: string;
  experiences: Array<{
    company: string;
    role: string;
    dates: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    dates: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  languages: Array<{
    name: string;
    level: string;
  }>;
  certifications?: string[];
  interests?: string[];
}

export const emptyCVData: CVData = {
  personalInfo: {
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    address: "",
    linkedin: "",
  },
  summary: "",
  experiences: [{ company: "", role: "", dates: "", bullets: [""] }],
  education: [{ school: "", degree: "", dates: "" }],
  skills: { technical: [], soft: [] },
  languages: [{ name: "", level: "" }],
  certifications: [],
  interests: [],
};
