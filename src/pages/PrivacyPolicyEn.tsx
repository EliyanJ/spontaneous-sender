import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicyEn = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Last updated:</strong> November 12, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed">
              This privacy policy explains how <strong>APP SENDER</strong>
              (hereinafter "the Application") collects, uses, stores, and
              protects your personal data. The Application is a job search
              and email automation platform for job applications.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              We are committed to respecting your privacy and fully complying
              with the General Data Protection Regulation (GDPR) and French
              data protection legislation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Data Controller
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Controller:</strong> Eliyan JACQUET
              </p>
              <p className="text-gray-700">
                <strong>Email:</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700">
                <strong>Address:</strong> 41 rue Parmentier, 95870 Bezons, France
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Data Collected
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.1 Authentication Data
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Email address</li>
              <li>Password (hashed and encrypted)</li>
              <li>Unique user identifier</li>
            </ul>
            <p className="text-gray-700 mt-2">
              This data is necessary to create your account and secure your
              access to the Application.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.2 Gmail Data
            </h3>
            <p className="text-gray-700 mb-2">
              When you connect your Gmail account to the Application, we collect
              and store with your explicit permission:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Sent emails (finalized emails only)</li>
              <li>Email metadata for response detection</li>
            </ul>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
              <p className="text-gray-700">
                <strong>Important:</strong> We only access Gmail for the
                functionalities you have explicitly enabled. You can revoke this
                access at any time via your Google account settings.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.3 Job Search and Application Data
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Search criteria used</li>
              <li>Job offers viewed</li>
              <li>Applications sent (date, employer, status)</li>
              <li>Your action history on the Application</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              3.4 Tracking Data
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Pages visited</li>
              <li>Features used</li>
              <li>Session duration</li>
              <li>Device type and browser</li>
              <li>IP address (for informational purposes only)</li>
              <li>Interaction events (clicks, searches, sends)</li>
            </ul>
            <p className="text-gray-700 mt-2">
              This data allows us to improve the Application and understand how
              you use it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Legal Basis for Processing
            </h2>
            <p className="text-gray-700 mb-3">
              We process your data based on the following legal grounds:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Consent</strong>: For Gmail connection and tracking (you
                have the right to refuse)
              </li>
              <li>
                <strong>Contract performance</strong>: To create your account
                and provide Application services
              </li>
              <li>
                <strong>Legitimate interest</strong>: To improve the Application
                and detect fraud
              </li>
              <li>
                <strong>Legal compliance</strong>: If required by law
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Use of Data
            </h2>
            <p className="text-gray-700 mb-3">We use your data to:</p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.1 Application Operation
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Create and manage your account</li>
              <li>
                Provide job search services and Gmail automation
              </li>
              <li>Process your applications</li>
              <li>Send you relevant notifications</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              5.2 Service Improvement
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Analyze Application usage</li>
              <li>Identify bugs and performance issues</li>
              <li>Develop new features</li>
              <li>Personalize your experience</li>
            </ul>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
              <p className="text-gray-700 font-semibold">
                We NEVER sell your personal data to third parties.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Data Sharing
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.1 With Service Providers
            </h3>
            <p className="text-gray-700 mb-2">
              Your data may be shared with:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Supabase</strong> (database): Secure storage of your data
              </li>
              <li>
                <strong>Google</strong>: Access to your Gmail API (you explicitly
                authorize this access)
              </li>
              <li>
                <strong>Government API</strong> (job offers): Job search
                (anonymized data)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              6.2 No Commercial Sharing
            </h3>
            <p className="text-gray-700">
              We do not share your data for commercial, marketing, or sales
              purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Data Retention Period
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Account data</strong>: Kept as long as your account is
                active, deleted within 30 days after account deletion
              </li>
              <li>
                <strong>Application data</strong>: Kept for 12 months (you can
                delete it at any time)
              </li>
              <li>
                <strong>Gmail data</strong>: Synchronized with your Gmail account,
                deleted within 7 days after disconnection
              </li>
              <li>
                <strong>Tracking data</strong>: Kept for 90 days maximum, then
                anonymized
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Data Security
            </h2>
            <p className="text-gray-700 mb-3">
              We implement robust security measures:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>
                <strong>Encryption</strong>: Your data is encrypted in transit
                (HTTPS/TLS) and at rest
              </li>
              <li>
                <strong>Authentication</strong>: Secure access via hashed password
              </li>
              <li>
                <strong>Limited access</strong>: Only authorized personnel can
                access data
              </li>
              <li>
                <strong>No plain text password storage</strong>: Robust encryption
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Your Rights
            </h2>
            <p className="text-gray-700 mb-4">
              In accordance with GDPR, you have the following rights:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.1 Right of Access
                </h3>
                <p className="text-gray-700">
                  You can request a copy of all personal data we hold about you.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.2 Right to Rectification
                </h3>
                <p className="text-gray-700">
                  You can correct your personal data at any time via your account.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.3 Right to Erasure (Right to be Forgotten)
                </h3>
                <p className="text-gray-700">
                  You can request deletion of your personal data, unless we are
                  required to keep it for legal reasons.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.4 Right to Data Portability
                </h3>
                <p className="text-gray-700">
                  You can request a copy of your data in a readable and
                  transferable format.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  9.5 Right to Withdraw Consent
                </h3>
                <p className="text-gray-700">
                  You can withdraw your consent at any time (especially for Gmail
                  connection).
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="text-gray-700">
                <strong>To exercise these rights, contact us at:</strong>{" "}
                eliyanjacquet99@gmail.com
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Google API Services - Limited Use Disclosure
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-gray-700 font-semibold mb-2">
                Google API Services User Data Policy Compliance
              </p>
              <p className="text-gray-700">
                App Sender's use and transfer of information received from Google APIs
                will adhere to{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>

            <p className="text-gray-700 mb-4">
              This Application uses Google's Gmail API to allow you to send emails
              directly from your Gmail account. Access to your Gmail data is
              strictly limited to the following functionalities:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li>Sending job application emails on your behalf</li>
              <li>Scheduling emails for later sending</li>
              <li>Detecting responses to your sent emails</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              10.1 What We Do NOT Do With Your Gmail Data
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li>
                We do not read the content of your received emails for purposes
                other than detecting responses to your applications
              </li>
              <li>We do not share your Gmail data with third parties</li>
              <li>We do not use your Gmail data for advertising purposes</li>
              <li>
                We do not store the full content of your emails beyond what is
                necessary for the service to function
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              10.2 Revoking Access
            </h3>
            <p className="text-gray-700">
              You can revoke our Application's access to your Gmail account at any
              time via your Google account security settings:{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://myaccount.google.com/permissions
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Cookies
            </h2>
            <p className="text-gray-700 mb-3">
              The Application may use cookies or similar technologies to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze Application usage</li>
              <li>Improve performance</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>You can refuse tracking cookies</strong> via the Application
              settings or your browser, although this may affect some features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Children
            </h2>
            <p className="text-gray-700">
              The Application is <strong>not intended for minors</strong> (under
              16 years old). We do not intentionally collect personal data from
              minors. If you discover that a minor has used the Application,
              please notify us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Changes to This Policy
            </h2>
            <p className="text-gray-700">
              We may update this privacy policy at any time. Any material changes
              will be communicated via the Application, and we will request your
              consent if necessary. Your continued use of the Application after
              changes means you accept the new policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Contact and Complaints
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.1 Contact Us
            </h3>
            <p className="text-gray-700 mb-2">
              For any questions about this policy or to exercise your rights:
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> eliyanjacquet99@gmail.com
              </p>
              <p className="text-gray-700">
                <strong>Response time:</strong> We will respond within 30 days
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
              14.2 Complaints to the Supervisory Authority
            </h3>
            <p className="text-gray-700 mb-2">
              If you believe your rights are not being respected, you can file a
              complaint with the{" "}
              <strong>
                Commission Nationale de l'Informatique et des Libertés (CNIL)
              </strong>
              :
            </p>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">
                <strong>CNIL</strong>
              </p>
              <p className="text-gray-700">3 Place de Fontenoy</p>
              <p className="text-gray-700">75007 Paris, France</p>
              <p className="text-gray-700">
                <strong>Website:</strong>{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  https://www.cnil.fr
                </a>
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. GDPR Compliance
            </h2>
            <p className="text-gray-700">
              This Application fully complies with the General Data Protection
              Regulation (GDPR) and French data protection legislation.
            </p>
          </section>

          <hr className="my-8" />

          <div className="text-center text-gray-600">
            <p>
              <strong>Version:</strong> 1.0
            </p>
            <p>
              <strong>Effective date:</strong> November 12, 2025
            </p>
            <p>
              <strong>Next scheduled review:</strong> November 12, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyEn;
