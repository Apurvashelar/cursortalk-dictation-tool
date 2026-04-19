import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  LockKeyhole,
  Mic,
  MonitorCog,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { VoiceFlowMark } from "../components/VoiceFlowMark";

type Feature = {
  title: string;
  body: string;
  tone?: "default" | "accent" | "dark";
  span?: "wide" | "tall" | "normal";
  icon: typeof Mic;
};

type WorkflowStep = {
  id: string;
  title: string;
  body: string;
  tag: string;
};

type UseCase = {
  title: string;
  outcome: string;
  detail: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

const marqueeItems = [
  "Gmail",
  "Slack",
  "Notion",
  "Teams",
  "Salesforce",
  "Google Docs",
  "Zendesk",
  "Linear",
  "Outlook",
  "Internal Tools",
];

const features: Feature[] = [
  {
    icon: Zap,
    title: "Faster than typing",
    body: "Move from spoken thought to polished text without losing speed in the middle of real work.",
    span: "wide",
  },
  {
    icon: MonitorCog,
    title: "One desktop layer across every app",
    body: "Use dictation where your teams already work instead of forcing a separate composition workflow.",
    tone: "accent",
  },
  {
    icon: Sparkles,
    title: "Cleanup that sounds like you on a good day",
    body: "Turn rough transcripts into cleaner business writing for follow-ups, notes, summaries, and response drafting.",
    span: "tall",
  },
  {
    icon: NotebookPen,
    title: "Learns the language of the business",
    body: "Support operational language, names, product terminology, and organization-specific phrasing.",
  },
  {
    icon: Workflow,
    title: "Built for production workflows",
    body: "Designed for teams handling documentation, support, revenue operations, and high-volume internal communication.",
  },
  {
    icon: LockKeyhole,
    title: "Enterprise-ready trust posture",
    body: "Present privacy, desktop control, and deployment confidence clearly to both buyers and users.",
    tone: "dark",
    span: "wide",
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    id: "01",
    title: "Trigger dictation instantly",
    body: "Start speaking from a focused desktop experience that is designed to stay out of the way of the actual work.",
    tag: "Desktop",
  },
  {
    id: "02",
    title: "Transcribe and refine",
    body: "Speech becomes text, then gets cleaned into a more structured and usable draft instead of a raw transcript dump.",
    tag: "Real time",
  },
  {
    id: "03",
    title: "Send polished output into workflow",
    body: "Move the finished text into email, CRM updates, documentation, support systems, and internal tools.",
    tag: "Cross-app",
  },
];

const useCases: UseCase[] = [
  {
    title: "Sales and account teams",
    outcome: "Capture call context and produce cleaner CRM notes or follow-ups faster after conversations.",
    detail: "Less manual cleanup, more continuity from spoken context to customer-facing action.",
  },
  {
    title: "Internal operations",
    outcome: "Draft updates, decisions, summaries, and process notes without stopping to type every detail.",
    detail: "Useful where teams switch constantly between meetings, planning, and internal documentation.",
  },
  {
    title: "Support and service workflows",
    outcome: "Create clearer case notes and draft responses more quickly in high-volume environments.",
    detail: "Improves speed while keeping writing quality and consistency more controlled.",
  },
  {
    title: "Leadership communication",
    outcome: "Turn thought streams into cleaner memos, internal messages, and executive drafts.",
    detail: "Best for people who think faster than they type and need polished output quickly.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "What does the website position this product as?",
    answer:
      "A serious desktop dictation product for professional and enterprise workflows, with a premium self-serve download path and enterprise-safe messaging.",
  },
  {
    question: "Does it fit into existing tools?",
    answer:
      "Yes. The page is designed around cross-application usage so visitors immediately understand that dictation supports the apps their teams already rely on.",
  },
  {
    question: "Is the experience desktop-first?",
    answer:
      "Yes. The page intentionally treats the desktop app as the hero product rather than presenting this as a generic browser AI tool.",
  },
  {
    question: "Why emphasize trust so early?",
    answer:
      "Because enterprise buyers and serious professional users need more than speed. They need confidence in reliability, privacy posture, and operational fit.",
  },
  {
    question: "Who is this best suited for?",
    answer:
      "Teams and individuals who generate a high volume of written communication from meetings, calls, notes, summaries, and daily operational work.",
  },
];

function ProductMockup() {
  return (
    <div className="mk-mockup">
      <div className="mk-mockup-bar">
        <div className="mk-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="mk-mono mk-mockup-app">Compose panel</span>
        <div className="mk-live-indicator">
          <div className="mk-wave-bars" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <span className="mk-mono">REC</span>
        </div>
      </div>

      <div className="mk-mockup-body">
        <div className="mk-mockup-column">
          <div className="mk-section-tag mk-section-tag-warn">Raw dictation</div>
          <p className="mk-raw-copy">
            “Please send the updated rollout summary to operations and add a note that we can start
            the pilot next week if the security review closes on schedule.”
          </p>
          <div className="mk-mockup-meta mk-mono">Live transcript · desktop capture · instant</div>
        </div>

        <div className="mk-mockup-column mk-mockup-column-accent">
          <div className="mk-section-tag mk-section-tag-good">Polished output</div>
          <p className="mk-clean-copy">
            Please send the updated rollout summary to the operations team and note that we can
            begin the pilot next week if the security review closes on schedule.
          </p>
          <div className="mk-mockup-meta mk-mono">Ready for email, notes, CRM, and documentation</div>
        </div>
      </div>

      <div className="mk-stat-row">
        <div className="mk-stat-cell">
          <div className="mk-mono mk-stat-label">Speed</div>
          <div className="mk-stat-value">3×</div>
        </div>
        <div className="mk-stat-cell">
          <div className="mk-mono mk-stat-label">Workflow</div>
          <div className="mk-stat-value">Desktop</div>
        </div>
        <div className="mk-stat-cell">
          <div className="mk-mono mk-stat-label">Output</div>
          <div className="mk-stat-value">Polished</div>
        </div>
        <div className="mk-stat-cell">
          <div className="mk-mono mk-stat-label">Fit</div>
          <div className="mk-stat-value">Enterprise</div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body, tone = "default", span = "normal" }: Feature) {
  return (
    <article className={`mk-feature mk-feature-${tone} mk-feature-${span}`}>
      <div className="mk-feature-icon">
        <Icon size={18} strokeWidth={2} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openQuestion, setOpenQuestion] = useState(items[0]?.question ?? "");

  return (
    <div className="mk-faq-list">
      {items.map((item) => {
        const isOpen = openQuestion === item.question;

        return (
          <article className={`mk-faq-item${isOpen ? " is-open" : ""}`} key={item.question}>
            <button
              aria-expanded={isOpen}
              className="mk-faq-trigger"
              onClick={() => setOpenQuestion(isOpen ? "" : item.question)}
              type="button"
            >
              <span>{item.question}</span>
              <ChevronDown size={18} strokeWidth={2} />
            </button>
            <div className="mk-faq-answer">
              <p>{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function MarketingLandingPage() {
  return (
    <div className="marketing-page mk-theme">
      <nav className="mk-nav">
        <div className="mk-shell mk-nav-inner">
          <a className="mk-brand" href="#">
            <div className="mk-brand-mark">
              <VoiceFlowMark className="h-4 w-4" />
            </div>
            <span>VoiceFlow Enterprise</span>
          </a>

          <div className="mk-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#security">Security</a>
            <a href="#faq">FAQ</a>
          </div>

          <a className="mk-button mk-button-primary mk-button-small" href="#download">
            Download
          </a>
        </div>
      </nav>

      <main>
        <section className="mk-hero">
          <div className="mk-hero-glow mk-hero-glow-one" aria-hidden="true" />
          <div className="mk-hero-glow mk-hero-glow-two" aria-hidden="true" />
          <div className="mk-hero-grid" aria-hidden="true" />

          <div className="mk-shell mk-hero-inner">
            <div className="mk-hero-topline">
              <span className="mk-badge">
                <ShieldCheck size={13} strokeWidth={2} />
                Desktop-native · Enterprise-ready · Cross-application
              </span>
            </div>

            <h1 className="mk-display">
              Dictate across your desktop.
              <span>Ship cleaner writing faster.</span>
            </h1>

            <p className="mk-hero-copy">
              A premium desktop dictation experience for teams and professionals who need faster
              input, cleaner first drafts, and a workflow that fits the software they already use.
            </p>

            <div className="mk-hero-actions">
              <a className="mk-button mk-button-primary mk-button-large" href="#download">
                <Download size={18} strokeWidth={2} />
                Download for Mac
              </a>
              <a className="mk-button mk-button-secondary mk-button-large" href="#download">
                <Download size={18} strokeWidth={2} />
                Download for Windows
              </a>
            </div>

            <p className="mk-mono mk-hero-subnote">
              DESKTOP APP · ENTERPRISE POSITIONING · READY FOR REAL WORKFLOWS
            </p>

            <div className="mk-hero-mockup">
              <ProductMockup />
            </div>
          </div>
        </section>

        <section className="mk-marquee">
          <div className="mk-shell">
            <p className="mk-mono mk-marquee-label">Works across the tools teams already use</p>
          </div>
          <div className="mk-marquee-mask">
            <div className="mk-marquee-track">
              {[...marqueeItems, ...marqueeItems].map((item, index) => (
                <div className="mk-marquee-item" key={`${item}-${index}`}>
                  <span>{item}</span>
                  <span className="mk-marquee-divider">·</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-section" id="features">
          <div className="mk-shell">
            <div className="mk-section-head">
              <p className="mk-mono mk-kicker">Features</p>
              <h2 className="mk-display mk-section-title">
                A sharper product story for enterprise desktop dictation.
              </h2>
              <p className="mk-section-copy">
                The goal is to make the product feel real, premium, and operationally credible
                before someone scrolls halfway down the page.
              </p>
            </div>

            <div className="mk-bento">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="mk-section mk-section-surface" id="how-it-works">
          <div className="mk-shell">
            <div className="mk-section-head mk-section-head-center">
              <p className="mk-mono mk-kicker">How It Works</p>
              <h2 className="mk-display mk-section-title">
                From spoken thought to usable text in a clear three-step flow.
              </h2>
            </div>

            <div className="mk-timeline">
              <div className="mk-timeline-line" aria-hidden="true" />
              {workflowSteps.map((step) => (
                <article className="mk-timeline-step" key={step.id}>
                  <div className="mk-timeline-node">{step.id}</div>
                  <div className="mk-timeline-card">
                    <div className="mk-timeline-card-top">
                      <h3>{step.title}</h3>
                      <span className="mk-step-tag">{step.tag}</span>
                    </div>
                    <p>{step.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-section mk-section-dark" id="security">
          <div className="mk-dark-glow mk-dark-glow-right" aria-hidden="true" />
          <div className="mk-dark-glow mk-dark-glow-left" aria-hidden="true" />

          <div className="mk-shell mk-security-grid">
            <div>
              <p className="mk-mono mk-kicker mk-kicker-accent">Security And Readiness</p>
              <h2 className="mk-display mk-section-title">
                Built to feel trustworthy before a buyer ever talks to sales.
              </h2>
              <p className="mk-section-copy mk-section-copy-dark">
                Enterprise buyers want more than a fast demo. They want confidence that the product
                fits desktop workflows, respects privacy expectations, and feels mature enough for
                day-to-day operational use.
              </p>

              <div className="mk-check-list">
                <div>
                  <Check size={16} strokeWidth={2.6} />
                  <span>Desktop-first product story</span>
                </div>
                <div>
                  <Check size={16} strokeWidth={2.6} />
                  <span>Cross-application workflow fit</span>
                </div>
                <div>
                  <Check size={16} strokeWidth={2.6} />
                  <span>Private-by-design messaging</span>
                </div>
                <div>
                  <Check size={16} strokeWidth={2.6} />
                  <span>Enterprise-safe visual tone</span>
                </div>
              </div>
            </div>

            <div className="mk-compare-card">
              <p className="mk-mono mk-compare-label">Operational profile</p>
              <div className="mk-compare-block">
                <div className="mk-compare-row">
                  <span>Workflow type</span>
                  <strong>Desktop productivity</strong>
                </div>
                <div className="mk-compare-row">
                  <span>Primary value</span>
                  <strong>Faster clean writing</strong>
                </div>
                <div className="mk-compare-row">
                  <span>Trust posture</span>
                  <strong>Professional and controlled</strong>
                </div>
                <div className="mk-compare-row">
                  <span>Buyer fit</span>
                  <strong>Teams, IT, operations, leadership</strong>
                </div>
              </div>
              <div className="mk-compare-stat">
                <div className="mk-compare-number">3×</div>
                <p>faster idea capture than typing-heavy workflows</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mk-section">
          <div className="mk-shell">
            <div className="mk-section-head">
              <p className="mk-mono mk-kicker">Use Cases</p>
              <h2 className="mk-display mk-section-title">
                Show where the product fits instead of describing it in the abstract.
              </h2>
            </div>

            <div className="mk-usecase-grid">
              {useCases.map((item) => (
                <article className="mk-usecase-card" key={item.title}>
                  <h3>{item.title}</h3>
                  <p className="mk-usecase-outcome">{item.outcome}</p>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mk-section mk-section-surface" id="download">
          <div className="mk-shell mk-download-shell">
            <div className="mk-section-head mk-section-head-center">
              <p className="mk-mono mk-kicker">Download</p>
              <h2 className="mk-display mk-section-title">
                Start dictating in under a minute.
              </h2>
              <p className="mk-section-copy">
                The site stays premium and enterprise-safe while still making it easy for someone
                to install the desktop app immediately.
              </p>
            </div>

            <div className="mk-download-grid">
              <a className="mk-download-card" href="/">
                <div className="mk-download-top">
                  <Download size={24} strokeWidth={2} />
                  <ArrowRight size={16} strokeWidth={2} />
                </div>
                <h3>macOS</h3>
                <p>Universal build for Apple Silicon and Intel.</p>
                <div className="mk-download-meta">
                  <span>Desktop app</span>
                  <span>Production-ready</span>
                </div>
              </a>

              <a className="mk-download-card" href="/">
                <div className="mk-download-top">
                  <Download size={24} strokeWidth={2} />
                  <ArrowRight size={16} strokeWidth={2} />
                </div>
                <h3>Windows</h3>
                <p>Built for modern desktop usage and team rollout.</p>
                <div className="mk-download-meta">
                  <span>Cross-app workflow</span>
                  <span>Enterprise positioning</span>
                </div>
              </a>
            </div>

            <div className="mk-download-notes">
              <span>
                <Check size={14} strokeWidth={2.4} />
                Desktop-first
              </span>
              <span>
                <Check size={14} strokeWidth={2.4} />
                Fast install
              </span>
              <span>
                <Check size={14} strokeWidth={2.4} />
                Enterprise-ready presentation
              </span>
            </div>
          </div>
        </section>

        <section className="mk-section" id="faq">
          <div className="mk-shell mk-faq-shell">
            <div className="mk-section-head mk-section-head-center">
              <p className="mk-mono mk-kicker">FAQ</p>
              <h2 className="mk-display mk-section-title">
                Answer the trust and workflow questions up front.
              </h2>
            </div>

            <FaqAccordion items={faqs} />
          </div>
        </section>

        <section className="mk-final-cta">
          <div className="mk-shell mk-final-cta-inner">
            <h2 className="mk-display">
              Stop typing everything.
              <span>Start shipping cleaner writing faster.</span>
            </h2>
            <p>
              A more distinctive, editorial, product-led website direction for your desktop
              dictation app.
            </p>
            <div className="mk-hero-actions">
              <a className="mk-button mk-button-primary mk-button-large" href="#download">
                Download app
              </a>
              <a className="mk-button mk-button-secondary mk-button-large" href="mailto:sales@example.com">
                Contact sales
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mk-footer">
        <div className="mk-shell mk-footer-inner">
          <div className="mk-footer-brand">
            <VoiceFlowMark className="h-4 w-4" />
            <span>VoiceFlow Enterprise</span>
          </div>
          <p>Desktop dictation designed for professional and enterprise workflows.</p>
        </div>
      </footer>
    </div>
  );
}
