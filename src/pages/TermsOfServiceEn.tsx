import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe } from "lucide-react";

const TermsOfServiceEn = () => {
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
          <Button
            variant="outline"
            onClick={() => navigate("/terms-of-service")}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            FR
          </Button>
        </div>

        <div className="bg-white dark:bg-card rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground mb-2">
            Terms of Service
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground mb-8">
            <strong>Last updated:</strong> December 13, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-700 dark:text-foreground leading-relaxed mb-3">
              By accessing and using <strong>Cronos</strong> (hereinafter "the Application"), accessible at{" "}
              <a
                href="https://getcronos.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-primary hover:underline"
              >
                https://getcronos.fr
              </a>
              , you unconditionally accept these Terms of Service in their entirety. If you do not accept these terms, please do not use the Application.
            </p>
            <p className="text-gray-700 dark:text-foreground leading-relaxed">
              Continued use of the Application after any modification of these terms means that you accept the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-700 dark:text-foreground mb-3">
              Cronos is a web application that allows you to:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4 mb-4">
              <li>Search for job offers via the French government API</li>
              <li>Connect your Gmail account to automate your job applications</li>
              <li>Create, edit, and send application emails</li>
              <li>Manage a history of your applications</li>
              <li>View statistics on your applications</li>
            </ul>
            <p className="text-gray-700 dark:text-foreground">
              The Application is provided as a prototype and "as-is". We reserve the right to modify, suspend, or discontinue the service at any time, with or without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              3. Access Conditions
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.1 Eligibility
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You must be at least 16 years old to use the Application</li>
              <li>You are responsible for ensuring your use complies with the laws of your country</li>
              <li>The Application is accessible from France and the European Union</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.2 Account Creation
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You are responsible for the confidentiality of your password</li>
              <li>You agree to provide accurate and complete information when registering</li>
              <li>A valid email is required to create an account</li>
              <li>You are responsible for all activities that occur on your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              3.3 Account Security
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You agree not to share your password with others</li>
              <li>You agree to immediately notify Cronos of any unauthorized access to your account</li>
              <li>You agree to log out of the Application after each session, particularly on shared devices</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              4. Acceptable Use
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              4.1 You agree to:
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Use the Application exclusively for personal and legal purposes</li>
              <li>Respect all third-party intellectual property rights</li>
              <li>Not spam, harass, or threaten other users or employers</li>
              <li>Not use the Application for illegal or fraudulent activities</li>
              <li>Not attempt to access or modify the system without authorization</li>
              <li>Comply with Gmail's terms of use and the government API's terms</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              4.2 You agree NOT to:
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Use the Application to send unsolicited mass emails (spam)</li>
              <li>Falsify your identity or application information</li>
              <li>Share your account with others</li>
              <li>Attempt to circumvent security measures</li>
              <li>Mass download or extract job offers</li>
              <li>Use bots or automation scripts (except those provided by the Application)</li>
              <li>Resell or monetize data obtained through the Application</li>
              <li>Maliciously criticize or disparage employers</li>
              <li>Use the Application for facial recognition, profiling, or surveillance purposes</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              4.3 Violations
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">Any violation of these rules may result in:</p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Immediate suspension of your account</li>
              <li>Deletion of your data</li>
              <li>Permanent ban from the Application</li>
              <li>Reporting to competent authorities if required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              5. Gmail Connection
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              5.1 Explicit Consent
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">
              By connecting your Gmail account to Cronos, you explicitly consent to the Application:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Accessing your emails, drafts, and contacts</li>
              <li>Reading and sending emails on your behalf</li>
              <li>Creating and modifying drafts</li>
              <li>Storing a copy of your emails on our servers</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              5.2 Responsibility
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You are fully responsible for all emails sent through the Application</li>
              <li>Cronos is not responsible for the content you send</li>
              <li>Cronos is not responsible for the receipt or non-receipt of your emails</li>
              <li>You accept that Gmail may classify your emails as spam</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              5.3 Revocation
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">
              You can revoke the Application's access to Gmail at any time via:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4 mb-3">
              <li>Your Google account settings (Security → Connected apps)</li>
              <li>The Application settings</li>
            </ul>
            <p className="text-gray-700 dark:text-foreground">
              Once revoked, the Application will no longer be able to access your emails, but previously synchronized data will remain stored in accordance with our Privacy Policy.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              5.4 Limitations
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>The Application will only access Gmail for the purposes of enabled features</li>
              <li>We will never share your emails with third parties without your consent</li>
              <li>We will never sell your Gmail data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              6. Data and Intellectual Property
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              6.1 Your Data
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You retain full ownership of your personal data, emails, and applications</li>
              <li>By using the Application, you grant us a license to process your data in accordance with our Privacy Policy</li>
              <li>You can request deletion of your data at any time</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              6.2 User Content
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>All content you create in the Application (applications, drafts, etc.) belongs to you</li>
              <li>You grant Cronos the right to store and process this content to provide the service</li>
              <li>Cronos may use anonymized and aggregated data to improve the service (never your personal data)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              6.3 Application Intellectual Property
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Cronos, its code, design, and content are the exclusive property of Eliyan JACQUET</li>
              <li>You do not have the right to reproduce, modify, distribute, or resell the Application</li>
              <li>You must not attempt to decompile, disassemble, or reverse engineer</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              7. Limitation of Liability
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              7.1 Access and Availability
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Cronos is provided "as-is" without guarantee of continuous availability</li>
              <li>We are not responsible for service interruptions, failures, or unavailability</li>
              <li>The Application may be unavailable for maintenance, updates, or technical reasons</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              7.2 Warranties
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">We DO NOT GUARANTEE:</p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>That the Application will meet your expectations</li>
              <li>That all bugs will be fixed</li>
              <li>That the Application will be compatible with all devices or browsers</li>
              <li>That your emails will always be received by recipients</li>
              <li>Data durability in case of major disaster</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              7.3 Limitation of Damages
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">
              IN NO CASE shall Eliyan JACQUET or Cronos be liable for:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4 mb-3">
              <li>Loss of data, emails, or applications</li>
              <li>Direct, indirect, consequential, or incidental damages</li>
              <li>Loss of revenue or employment opportunities</li>
              <li>Lost, unreceived, or spam-classified emails</li>
              <li>Poor performance of the Application</li>
            </ul>
            <p className="text-gray-700 dark:text-foreground">
              Your exclusive remedy in case of problems is to stop using the Application.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              7.4 Overall Liability Limitation
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              Cronos's total liability shall in no event exceed 100 euros or the amount paid (currently free for the prototype).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              8. Compliance with Laws
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              8.1 Compliance with Laws
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">
              You agree to use the Application in compliance with all applicable laws and regulations, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>French employment law</li>
              <li>Data protection law (GDPR, CNIL)</li>
              <li>Gmail terms of use</li>
              <li>Government API terms of use</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              8.2 Legal Prohibitions
            </h3>
            <p className="text-gray-700 dark:text-foreground mb-2">The Application may not be used for:</p>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Discrimination based on race, sex, origin, religion, disability, etc.</li>
              <li>Harassment or threats against employers</li>
              <li>Fraud or identity falsification</li>
              <li>Phishing or manipulation</li>
              <li>Any illegal activity</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              9. External Data
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              9.1 Government API
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Job offers come from public government sources</li>
              <li>Cronos is not responsible for the relevance, accuracy, or availability of this data</li>
              <li>You accept the government API's terms of use</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              9.2 External Links
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>The Application may contain links to external sites</li>
              <li>Cronos is not responsible for the content of these external sites</li>
              <li>Check their privacy policy before sharing your data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              10. Fees and Pricing
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              10.1 Prototype Free Status
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Cronos is currently free during the prototype phase</li>
              <li>We reserve the right to monetize the service in the future</li>
              <li>Any pricing changes will be communicated at least 30 days in advance</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              10.2 Third-Party Costs
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You are responsible for any internet connection costs to access the Application</li>
              <li>The Application uses free Gmail and government API services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              11. Modifications to Terms
            </h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>We may modify these terms at any time</li>
              <li>You will be notified by email or by notification in the Application</li>
              <li>Major changes will be communicated at least 30 days in advance</li>
              <li>Your continued use of the Application after modifications means you accept the new terms</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              12. Termination
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              12.1 By You
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>You can delete your account at any time via settings</li>
              <li>Your data will be deleted in accordance with our Privacy Policy</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              12.2 By Us
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>We may suspend or delete your account in case of violation of these terms</li>
              <li>We may discontinue the service at any time, with reasonable notice if possible</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              12.3 After Termination
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-foreground space-y-2 ml-4">
              <li>Your access rights to the Application cease immediately</li>
              <li>Certain clauses of these terms remain in force (liability, intellectual property, etc.)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              13. Indemnification
            </h2>
            <p className="text-gray-700 dark:text-foreground">
              You agree to indemnify and hold harmless Eliyan JACQUET and Cronos against any claims, damages, costs, or expenses resulting from your violation of these terms or your use of the Application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              14. Disputes and Jurisdiction
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              14.1 Applicable Law
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              These terms are governed by French law.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              14.2 Amicable Resolution
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              Any dispute will first be subject to an attempt at amicable resolution. Please contact us at eliyanjacquet99@gmail.com.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              14.3 Jurisdiction
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              In case of failure of amicable resolution, the competent French courts will have exclusive jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              15. Contact and Support
            </h2>
            <div className="bg-blue-50 dark:bg-primary/10 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-foreground mb-2">
                For any questions regarding these terms, contact us:
              </p>
              <p className="text-gray-700 dark:text-foreground">
                <strong>Email:</strong> eliyanjacquet99@gmail.com
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
                <strong>Address:</strong> 41 rue Parmentier, 95870 Bezons, France
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
              16. Miscellaneous Provisions
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3">
              16.1 Entire Agreement
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              These terms, combined with our Privacy Policy, constitute the entire agreement between you and Cronos.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              16.2 Severability
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              If any clause is found to be invalid or unenforceable, the other clauses remain in force.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              16.3 Non-Waiver
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              Failure to exercise a right does not constitute a waiver of that right.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 dark:text-foreground mb-3 mt-6">
              16.4 Assignment
            </h3>
            <p className="text-gray-700 dark:text-foreground">
              You may not assign your rights or obligations without our written consent. We may assign these terms at any time.
            </p>
          </section>

          <hr className="my-8 border-gray-200 dark:border-border" />

          <div className="text-center text-gray-600 dark:text-muted-foreground">
            <p>
              <strong>Version:</strong> 2.1
            </p>
            <p>
              <strong>Effective Date:</strong> December 13, 2025
            </p>
            <p className="mt-4">
              <strong>Contact:</strong> eliyanjacquet99@gmail.com
            </p>
            <p>
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
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceEn;
