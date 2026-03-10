import React from 'react';
import './Pages.css';

export const TermsPage: React.FC = () => {
  return (
    <div className="page">
      <div className="page-hero page-hero-compact">
        <h1 className="page-title">Terms of Service</h1>
        <p className="page-subtitle">Last updated: March 10, 2026</p>
      </div>

      <div className="page-content legal-content">
        <section className="page-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Elysium Rising ("the Service"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not
            access or use the Service. These Terms constitute a legally binding agreement between
            you and Elysium Rising ("we," "us," or "our").
          </p>
        </section>

        <section className="page-section">
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years of age to use the Service. By using the Service, you
            represent and warrant that you meet this age requirement. If you are under 18, you
            represent that your parent or legal guardian has reviewed and agreed to these Terms
            on your behalf.
          </p>
        </section>

        <section className="page-section">
          <h2>3. Account Registration</h2>
          <p>
            To access certain features of the Service, you must create an account using Google
            Single Sign-On (SSO). You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your account. You agree to
            notify us immediately of any unauthorized access to or use of your account.
          </p>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without
            notice, for conduct that we determine, in our sole discretion, violates these Terms or
            is harmful to other users, us, or third parties, or for any other reason.
          </p>
        </section>

        <section className="page-section">
          <h2>4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
            <li>Harass, threaten, or intimidate other users.</li>
            <li>Use offensive, vulgar, or profane language in character names, aliases, or any user-generated content.</li>
            <li>Attempt to exploit, hack, reverse-engineer, or disrupt the Service or its servers.</li>
            <li>Use automated scripts, bots, or other tools to interact with the Service in a manner not intended by its design.</li>
            <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity.</li>
            <li>Sell, trade, or transfer your account or any in-game items or currency for real-world money or value outside of official channels.</li>
          </ul>
        </section>

        <section className="page-section">
          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service — including but not limited to
            text, graphics, logos, icons, images, audio clips, digital downloads, and software —
            are the exclusive property of Elysium Rising or its licensors and are protected by
            copyright, trademark, and other intellectual property laws.
          </p>
          <p>
            The <em>Towers of Elysium</em> book trilogy, its characters, settings, and narrative
            content are the intellectual property of Stephen Salaka. All game content derived from
            the books is used under license and may not be reproduced, distributed, or transmitted
            without express written permission.
          </p>
        </section>

        <section className="page-section">
          <h2>6. Virtual Currency &amp; Purchases</h2>
          <p>
            The Service may offer virtual currency ("Elysium Shards") and other virtual goods for
            purchase with real money. Elysium Shards are digital goods and <strong>all sales are
            final</strong>. Refund requests are handled on a case-by-case basis at the sole
            discretion of the operator and are not guaranteed.
          </p>
          <p>
            Elysium Shards have no real-world monetary value and cannot be exchanged, transferred,
            or redeemed for cash, cash equivalents, or any form of credit. Purchases of Elysium
            Shards should be considered voluntary contributions to the ongoing development and
            maintenance of the game.
          </p>
          <p>
            The Service is provided on an as-is basis and may be interrupted, modified, or
            discontinued at any time without prior notice. The Service may experience downtime,
            data loss, or permanent shutdown. We make no warranty or guarantee regarding the
            availability, continuity, or reliability of the Service.
          </p>
          <p>
            In the event that the Service is permanently shut down or discontinued, all virtual
            currency, virtual goods, and any associated account data will be forfeited. No
            compensation, refund, or credit of any kind will be provided in such an event.
          </p>
        </section>

        <section className="page-section">
          <h2>7. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
            WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
        </section>

        <section className="page-section">
          <h2>8. Limitation of Liability</h2>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL ELYSIUM RISING, ITS
            OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE
            OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY.
          </p>
        </section>

        <section className="page-section">
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. If we make material changes,
            we will notify you through the Service or by other means. Your continued use of the
            Service after such changes constitutes your acceptance of the new Terms.
          </p>
        </section>

        <section className="page-section">
          <h2>10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which Elysium Rising operates, without regard to its conflict of
            law provisions.
          </p>
        </section>

        <section className="page-section">
          <h2>11. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:support@does-god-exist.org">support@does-god-exist.org</a>.
          </p>
        </section>
        <section className="page-section" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="/" className="btn-secondary">Return to Home</a>
        </section>
      </div>
    </div>
  );
};
