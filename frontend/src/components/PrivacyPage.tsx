import React from 'react';
import './Pages.css';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="page">
      <div className="page-hero page-hero-compact">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="page-subtitle">Last updated: February 2026</p>
      </div>

      <div className="page-content legal-content">
        <section className="page-section">
          <h2>1. Introduction</h2>
          <p>
            Elysium Rising ("we," "us," or "our") respects your privacy and is committed to
            protecting your personal data. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you use our game and website
            (the "Service").
          </p>
        </section>

        <section className="page-section">
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> When you sign in via Google SSO, we receive your Google display name, email address, and profile picture URL.</li>
            <li><strong>Profile Information:</strong> Any alias, avatar selections, or preferences you configure within the Service.</li>
            <li><strong>Character Data:</strong> Character names, class selections, and gameplay statistics.</li>
            <li><strong>Support Communications:</strong> Messages you send through our support system.</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> Gameplay activity, session duration, features used, and in-game actions.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, screen resolution, and device identifiers.</li>
            <li><strong>Log Data:</strong> IP address, access times, pages viewed, and referring URLs.</li>
          </ul>
        </section>

        <section className="page-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve the Service.</li>
            <li>Create and manage your account.</li>
            <li>Process transactions and manage virtual currency.</li>
            <li>Communicate with you about updates, promotions, and support responses.</li>
            <li>Monitor and analyze usage patterns and trends to enhance the user experience.</li>
            <li>Detect, investigate, and prevent fraudulent transactions, cheating, and other illegal activities.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        <section className="page-section">
          <h2>4. Sharing of Information</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul>
            <li><strong>Service Providers:</strong> Third-party services that assist us in operating the Service (e.g., Google Cloud, Firebase, Stripe for payments).</li>
            <li><strong>Legal Requirements:</strong> When required by law, regulation, legal process, or governmental request.</li>
            <li><strong>Protection of Rights:</strong> When we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
          </ul>
        </section>

        <section className="page-section">
          <h2>5. Data Security</h2>
          <p>
            We implement reasonable technical and organizational measures to protect your personal
            data against unauthorized access, alteration, disclosure, or destruction. However, no
            method of transmission over the Internet or electronic storage is 100% secure, and we
            cannot guarantee absolute security.
          </p>
        </section>

        <section className="page-section">
          <h2>6. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to
            provide you with the Service. We may retain certain information after account
            deletion as required by law or for legitimate business purposes (e.g., fraud
            prevention, dispute resolution).
          </p>
        </section>

        <section className="page-section">
          <h2>7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data (subject to legal exceptions).</li>
            <li>Object to or restrict processing of your data.</li>
            <li>Request portability of your data.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:support@elysiumrising.com">support@elysiumrising.com</a>.
          </p>
        </section>

        <section className="page-section">
          <h2>8. Children's Privacy</h2>
          <p>
            The Service is not directed to children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected information from a
            child under 13, please contact us immediately and we will take steps to delete such
            information.
          </p>
        </section>

        <section className="page-section">
          <h2>9. Third-Party Services</h2>
          <p>
            The Service integrates with third-party services including Google (authentication),
            Firebase (backend services), and Stripe (payment processing). These services have
            their own privacy policies, and we encourage you to review them:
          </p>
          <ul>
            <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
            <li><a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase Privacy Policy</a></li>
            <li><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a></li>
          </ul>
        </section>

        <section className="page-section">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            changes by posting the new policy on this page and updating the "Last updated" date.
            Your continued use of the Service after changes are posted constitutes your acceptance
            of the updated policy.
          </p>
        </section>

        <section className="page-section">
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:support@does-god-exist.org">support@does-god-exist.org</a>.
          </p>
        </section>
      </div>
    </div>
  );
};
