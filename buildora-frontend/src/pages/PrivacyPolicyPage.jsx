import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { SiteFooter } from '../components/SiteFooter';

const LAST_UPDATED = '28 September 2026';

// Legal details not yet in the project. Replace each value before relying on this page in production.
const PLACEHOLDERS = {
  companyName: '[LEGAL COMPANY NAME]',
  contactEmail: '[PRIVACY CONTACT EMAIL]',
  postalAddress: '[REGISTERED BUSINESS ADDRESS]',
  hostingProviders: '[HOSTING PROVIDERS]',
  responseTime: '[RESPONSE TIME, e.g. 30 days]',
};

function Placeholder({ children }) {
  return (
    <mark className="rounded border border-dashed border-amber-300 bg-amber-50 px-1 font-medium text-amber-900" title="Placeholder: to be completed">
      {children}
    </mark>
  );
}

const SECTIONS = [
  ['information-we-collect', 'Information we collect'],
  ['business-account-information', 'Business account information'],
  ['customer-information', 'Customer information'],
  ['whatsapp-data', 'WhatsApp data (Meta WhatsApp Cloud API)'],
  ['how-we-use-data', 'How we use data'],
  ['storage-and-security', 'Data storage and security'],
  ['third-party-services', 'Third-party services'],
  ['meta-data-handling', 'Meta / WhatsApp data handling'],
  ['data-retention', 'Data retention'],
  ['data-deletion', 'User data deletion'],
  ['your-rights', 'Your rights'],
  ['contact', 'Contact information'],
  ['policy-updates', 'Policy updates'],
];

function Section({ id, n, children }) {
  const title = SECTIONS.find(([key]) => key === id)[1];
  return (
    <section id={id} className="scroll-mt-24 border-t border-neutral-100 pt-8">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
        <span className="mr-2 text-brand-600">{n}.</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-neutral-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const Strong = ({ children }) => <span className="font-medium text-neutral-800">{children}</span>;

export default function PrivacyPolicyPage() {
  const email = <Placeholder>{PLACEHOLDERS.contactEmail}</Placeholder>;

  // Direct links like /privacy-policy#data-deletion: the section only exists after render.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900">
            <ArrowLeft className="size-4" /> Back to Buildora
          </Link>
        </div>
      </header>

      <div className="relative overflow-hidden border-b border-neutral-100">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-brand-100),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-sm font-medium text-brand-600">Legal</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 max-w-2xl text-lg text-pretty text-neutral-600">
            How Buildora collects, uses, stores and protects information, including data from WhatsApp.
          </p>
          <p className="mt-4 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_1fr] lg:gap-14">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">On this page</p>
            <ol className="mt-3 space-y-2 text-sm">
              {SECTIONS.map(([id, title]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-neutral-600 hover:text-brand-600">
                    {title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="min-w-0 max-w-3xl space-y-8">
          <div className="space-y-4 text-[15px] leading-relaxed text-neutral-600">
            <p>
              Buildora (“Buildora”, “we”, “us”) is a business management and website platform operated by{' '}
              <Placeholder>{PLACEHOLDERS.companyName}</Placeholder>. It lets small businesses create an online store, list
              products, take orders, and manage customer conversations on WhatsApp from one dashboard.
            </p>
            <p>
              This policy covers two groups of people: <Strong>business owners</Strong> who use Buildora to run their business,
              and <Strong>their customers</Strong> who visit a Buildora store, place an order, or message a business on
              WhatsApp. For customer information, Buildora processes the data on behalf of the business you are dealing with.
            </p>
          </div>

          <Section id="information-we-collect" n={1}>
            <p>We only collect information needed to provide the service:</p>
            <List
              items={[
                <><Strong>Information you give us</Strong> — business details, products, store settings, orders, and messages you send.</>,
                <><Strong>Information from WhatsApp</Strong> — messages and delivery statuses received through the Meta WhatsApp Cloud API when a business connects its WhatsApp number (see section 4).</>,
                <><Strong>Information stored in your browser</Strong> — Buildora uses your browser’s local storage to remember the business you selected, your shopping cart, the store you are browsing, and your sign-in session. We do not use advertising or analytics cookies.</>,
              ]}
            />
          </Section>

          <Section id="business-account-information" n={2}>
            <p>When a business is created or managed on Buildora, we store:</p>
            <List
              items={[
                'Business name, category, description, location, contact phone number and logo.',
                'Store settings such as tagline, theme colour and whether the store is published.',
                'Product details: names, descriptions, prices, categories and images.',
                'Payment settings the business chooses to show customers, such as a UPI ID, payee name, QR code image and payment instructions.',
                'WhatsApp connection details described in section 4.',
              ]}
            />
            <p>
              Buildora does not process card or bank payments. Customers pay the business directly (for example by UPI), and
              Buildora only records the payment reference or screenshot a customer submits so the business can confirm it.
            </p>
          </Section>

          <Section id="customer-information" n={3}>
            <p>Depending on how a customer interacts with a business on Buildora, we may store:</p>
            <List
              items={[
                <><Strong>Store sign-in:</Strong> name, phone number, and optionally an email address.</>,
                <><Strong>Orders:</Strong> items ordered, prices, delivery name, phone number, delivery address (address, area, city, PIN code), order notes, and order status history.</>,
                <><Strong>Payment confirmation:</Strong> the payment reference and, if provided, a payment screenshot submitted for the business to verify.</>,
                <><Strong>WhatsApp conversations:</Strong> the customer’s WhatsApp phone number, WhatsApp profile name, and the messages exchanged with the business (see section 4).</>,
              ]}
            />
            <p>This information is visible only to the business the customer interacts with, and is used to fulfil orders and respond to messages.</p>
          </Section>

          <Section id="whatsapp-data" n={4}>
            <p>
              Businesses can connect their own WhatsApp Business number to Buildora through Meta’s WhatsApp Embedded Signup.
              Buildora then uses the <Strong>Meta WhatsApp Cloud API</Strong> to receive and send messages for that business.
              Through this integration we store:
            </p>
            <List
              items={[
                <><Strong>Connection details:</Strong> the WhatsApp Business Account ID, phone number ID, display phone number and verified business name returned by Meta.</>,
                <><Strong>Access credentials:</Strong> the access token Meta issues to the business for Buildora, and the registration PIN Buildora sets for the number. Both are stored encrypted and are never shown in the browser.</>,
                <><Strong>Messages:</Strong> the text of incoming and outgoing messages, the message type, delivery and read statuses, timestamps, and the sender’s WhatsApp number and profile name.</>,
              ]}
            />
            <p>
              For photos, voice notes and other media, Buildora records only the message type (for example “Photo”); it does not
              download or store the media file.
            </p>
          </Section>

          <Section id="how-we-use-data" n={5}>
            <p>We use information only to operate Buildora for businesses and their customers:</p>
            <List
              items={[
                'To create and display a business’s online store and products.',
                'To let customers place orders and let businesses manage and update them.',
                'To show WhatsApp conversations in the business’s Buildora inbox and send the replies the business writes.',
                'To connect, verify and maintain the business’s WhatsApp number with Meta.',
                'To keep the service secure, prevent abuse, and fix problems.',
              ]}
            />
            <p>We do not sell personal information, and we do not use WhatsApp messages or customer data for advertising.</p>
          </Section>

          <Section id="storage-and-security" n={6}>
            <p>Buildora data is stored in a MongoDB database. We protect it with measures that include:</p>
            <List
              items={[
                'Encrypting each business’s WhatsApp access token and registration PIN with AES-256-GCM before storing them.',
                'Storing only a hash of sign-in session tokens, never the token itself.',
                'Keeping the Meta app secret and access tokens on our servers only; they are never sent to the browser.',
                'Verifying the signature of webhooks received from Meta.',
                'Sending data between your browser and Buildora over HTTPS.',
              ]}
            />
            <p>No method of storage or transmission is completely secure, but we work to protect your information and limit access to it.</p>
          </Section>

          <Section id="third-party-services" n={7}>
            <p>Buildora relies on these third parties to provide the service:</p>
            <List
              items={[
                <><Strong>Meta Platforms</Strong> — WhatsApp Cloud API for messaging, and Facebook Login for connecting a WhatsApp Business account. Meta’s own privacy policy applies to your use of WhatsApp and Facebook.</>,
                <><Strong>MongoDB</Strong> — database used to store Buildora data.</>,
                <><Strong>Hosting</Strong> — Buildora’s website and servers are hosted by <Placeholder>{PLACEHOLDERS.hostingProviders}</Placeholder>.</>,
                <><Strong>Google Fonts</Strong> — used to load the website’s fonts, which means your browser requests font files from Google.</>,
              ]}
            />
            <p>These providers only receive the information needed to perform their service.</p>
          </Section>

          <Section id="meta-data-handling" n={8}>
            <List
              items={[
                'Buildora accesses a WhatsApp Business account only after its owner connects it through Meta’s Embedded Signup and grants the requested permissions (whatsapp_business_management and whatsapp_business_messaging).',
                'Data received from Meta is used only to provide messaging features to that business in Buildora, in line with Meta’s Platform Terms and WhatsApp Business policies.',
                'We do not sell data obtained from Meta or share it with third parties for their own purposes.',
                'A business can disconnect WhatsApp at any time from Dashboard → WhatsApp. This stops Buildora from receiving new messages for that number and deletes the stored access token. A business can also remove Buildora’s access from its Meta Business settings.',
              ]}
            />
          </Section>

          <Section id="data-retention" n={9}>
            <List
              items={[
                'Business, product, order and conversation data is kept while the business uses Buildora, so the business can see its history.',
                'When WhatsApp is disconnected, the access token and connection details are deleted. Past conversations stay in the business’s inbox, and the encrypted registration PIN and the ID of the registered number are kept so the same number can be reconnected.',
                'Customer sign-in sessions expire after 30 days and are then deleted automatically.',
                'Data is deleted on request as described in section 10.',
              ]}
            />
          </Section>

          <Section id="data-deletion" n={10}>
            <p>You can ask us to delete your data at any time:</p>
            <ol className="list-decimal space-y-1.5 pl-5 marker:text-neutral-400">
              <li>Email {email} with the subject “Data deletion request”.</li>
              <li>
                Include the business name, or the phone number you used with Buildora or WhatsApp, so we can find your data.
              </li>
              <li>
                We will confirm the request and delete the business’s or customer’s data within{' '}
                <Placeholder>{PLACEHOLDERS.responseTime}</Placeholder>, except where we must keep information to meet a legal
                obligation.
              </li>
            </ol>
            <p>
              Businesses can also disconnect WhatsApp themselves (Dashboard → WhatsApp) to delete the stored WhatsApp access
              token immediately. Customers who messaged a business on WhatsApp can contact that business directly, or email us.
            </p>
          </Section>

          <Section id="your-rights" n={11}>
            <p>Depending on where you live, you may have the right to:</p>
            <List
              items={[
                'Access the personal information we hold about you.',
                'Correct information that is inaccurate or incomplete.',
                'Ask us to delete your information.',
                'Object to or restrict certain processing, or withdraw consent you have given.',
              ]}
            />
            <p>
              To use any of these rights, email {email}. If your information was provided by a business using Buildora, we may
              ask that business to help with your request.
            </p>
          </Section>

          <Section id="contact" n={12}>
            <p>For questions about this policy or your data, contact:</p>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm leading-relaxed">
              <div className="font-semibold text-neutral-900">
                <Placeholder>{PLACEHOLDERS.companyName}</Placeholder> (Buildora)
              </div>
              <div className="mt-1">Email: {email}</div>
              <div>
                Address: <Placeholder>{PLACEHOLDERS.postalAddress}</Placeholder>
              </div>
            </div>
          </Section>

          <Section id="policy-updates" n={13}>
            <p>
              We may update this policy when Buildora changes or when required. We will post the new version on this page and
              change the “Last updated” date above. If the changes are significant, we will let businesses know in Buildora.
            </p>
          </Section>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}
