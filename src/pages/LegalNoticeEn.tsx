import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LegalNoticeEn = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/mentions-legales")}>
              🇫🇷 Français
            </Button>
            <Button variant="default" size="sm" disabled>
              🇬🇧 English
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-card rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-2">
            Legal Notice
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground mb-8">
            <strong>Last updated:</strong> December 13, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              1. Site Publisher
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Application name:</strong> Cronos
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Website:</strong>{" "}
                <a
                  href="https://getcronos.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://getcronos.fr
                </a>
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Publisher:</strong> Eliyan JACQUET
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Status:</strong> Individual - Personal website
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Address:</strong> 41 rue Parmentier, 95870 Bezons, France
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Email:</strong> eliyanjacquet99@gmail.com
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              2. Publication Director
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Name:</strong> Eliyan JACQUET
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Email:</strong> eliyanjacquet99@gmail.com
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              3. Hosting
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.1 Frontend Hosting
            </h3>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg mb-4">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Company:</strong> Lovable / Vercel Inc.
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Address:</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Website:</strong>{" "}
                <a
                  href="https://lovable.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://lovable.dev
                </a>
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.2 Backend & Database Hosting
            </h3>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                <strong>Company:</strong> Supabase Inc.
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Address:</strong> 970 Toa Payoh North #07-04, Singapore 318992
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Website:</strong>{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://supabase.com
                </a>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              4. Intellectual Property
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              All content on this site (texts, images, graphics, logos, icons, 
              software, etc.) is the exclusive property of Eliyan JACQUET or its partners 
              and is protected by French and international intellectual property laws.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              Any reproduction, representation, modification, publication, adaptation, 
              in whole or in part, of the site elements, by any means or process, 
              is prohibited without the prior written authorization of Eliyan JACQUET.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Any unauthorized use of the site or its content would engage the 
              user's responsibility and constitute infringement sanctioned 
              by Articles L.335-2 and following of the French Intellectual Property Code.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              5. Personal Data
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              The processing of personal data is governed by our{" "}
              <a
                href="/privacy-policy-en"
                className="text-blue-600 dark:text-primary hover:underline"
              >
                Privacy Policy
              </a>
              , accessible at any time from this site.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              In accordance with the General Data Protection Regulation (GDPR) and 
              the French Data Protection Act of January 6, 1978, as amended, you have 
              the right to access, rectify, delete, and port your personal data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              6. Cookies
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              This site uses only essential cookies for the application to function 
              (authentication, theme preferences). No third-party tracking cookies 
              are used. For more information, please consult our{" "}
              <a
                href="/privacy-policy-en"
                className="text-blue-600 dark:text-primary hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              7. Limitation of Liability
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-4">
              Eliyan JACQUET strives to provide information as accurate as 
              possible on this site. However, he cannot be held responsible for 
              omissions, inaccuracies, and deficiencies in updates, whether 
              by himself or by third-party partners who provide this information.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              All elements of the site are provided "as is" without any 
              warranty, express or implied. The user uses the site at their 
              sole responsibility.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              8. Applicable Law
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              These legal notices are subject to French law. In case of 
              dispute, and after an attempt at amicable resolution, exclusive 
              jurisdiction is attributed to the competent French courts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              9. Contact
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground">
                For any questions regarding these legal notices, you can contact 
                us at:
              </p>
              <p className="text-gray-700 dark:text-foreground mt-2">
                <strong>Email:</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700 dark:text-foreground mt-1">
                <strong>Website:</strong>{" "}
                <a
                  href="https://getcronos.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-primary hover:underline"
                >
                  https://getcronos.fr
                </a>
              </p>
            </div>
          </section>

          <hr className="my-8 border-gray-200 dark:border-border" />

          <div className="text-center text-gray-600 dark:text-muted-foreground">
            <p>
              <strong>Version:</strong> 1.1
            </p>
            <p>
              <strong>Effective Date:</strong> December 13, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalNoticeEn;
