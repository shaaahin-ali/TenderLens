"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import ValidatorView from "@/components/ValidatorView";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import {
  BrainCircuit,
  Filter,
  ShieldAlert,
  AlertOctagon,
  FileSearch,
  ClipboardCheck,
  TrendingUp,
  Globe,
  Lock,
  Zap,
  BookOpen,
  Building2,
  Scale,
  ChevronRight,
  FileText,
  Contact,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Data ────────────────────────────────────────────────────────────────────

const featureItems: BentoItem[] = [
  {
    title: "Semantic AI Matching",
    meta: "Core Engine",
    description:
      "Match complex vendor proposals against RFP requirements with deep contextual understanding — beyond simple keyword search.",
    icon: <BrainCircuit className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Active",
    tags: ["AI", "NLP", "Embedding"],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: "Hedge Detection",
    meta: "Smart Filter",
    description:
      "Automatically flag non-committal language and vague vendor responses like \"we aim to\" or \"where possible\".",
    icon: <Filter className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Automated",
    tags: ["Language", "Analysis"],
  },
  {
    title: "Risk Classification",
    meta: "Real-time",
    description:
      "Evaluate compliance risks instantly and prioritize HIGH_RISK and DISQUALIFYING deviations before full review.",
    icon: <ShieldAlert className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Live",
    tags: ["Security", "Compliance"],
  },
  {
    title: "Disqualification Logic",
    meta: "Strict Rules",
    description:
      "Implement hard rules to automatically filter out unqualified proposals based on mandatory legal or technical requirements.",
    icon: <AlertOctagon className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Enforced",
    tags: ["Rules", "Filtering"],
    colSpan: 2,
  },
];

const useCaseItems: BentoItem[] = [
  {
    title: "Government Procurement",
    meta: "Public Sector",
    description:
      "Streamline tender reviews for government agencies with strict compliance mandates and audit-ready reports.",
    icon: <Building2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Supported",
    tags: ["Government", "Audit"],
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: "Legal & Contracts",
    meta: "Law Firms",
    description:
      "Validate supplier contracts against RFP terms to identify legal exposure and non-compliance before signing.",
    icon: <Scale className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Trusted",
    tags: ["Legal", "Risk"],
  },
  {
    title: "Fast Turnaround",
    meta: "< 60 seconds",
    description:
      "Full proposal analysis in under a minute — replacing days of manual review with instant AI-powered insights.",
    icon: <Zap className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Instant",
    tags: ["Speed", "Efficiency"],
  },
  {
    title: "Enterprise Ready",
    meta: "Scalable",
    description:
      "Built for high-volume procurement teams handling dozens of proposals simultaneously with consistent scoring.",
    icon: <Globe className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />,
    status: "Production",
    tags: ["Enterprise", "Scale"],
    colSpan: 2,
  },
];

const stats = [
  { label: "Requirements Analyzed", value: "10K+", color: "text-neutral-900 dark:text-white" },
  { label: "Avg Analysis Time", value: "< 60s", color: "text-neutral-900 dark:text-white" },
  { label: "Accuracy Rate", value: "94%", color: "text-neutral-900 dark:text-white" },
  { label: "Risk Categories", value: "3 Tiers", color: "text-neutral-900 dark:text-white" },
];

const steps = [
  {
    num: "01",
    icon: <FileSearch className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />,
    title: "Upload your RFP",
    desc: "Drop in any PDF tender document. Our AI extracts all mandatory requirements automatically — no manual tagging needed.",
    color: "from-neutral-200/50 to-transparent dark:from-neutral-800/50 dark:to-transparent",
    border: "border-neutral-200 dark:border-neutral-800",
  },
  {
    num: "02",
    icon: <BookOpen className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />,
    title: "Upload Vendor Proposal",
    desc: "Add the vendor's response PDF. TenderLens maps every proposal claim against each extracted requirement.",
    color: "from-neutral-200/50 to-transparent dark:from-neutral-800/50 dark:to-transparent",
    border: "border-neutral-200 dark:border-neutral-800",
  },
  {
    num: "03",
    icon: <ClipboardCheck className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />,
    title: "Get Instant Results",
    desc: "Review a detailed compliance report with per-requirement verdicts, risk scores, hedge phrase flags, and a downloadable summary.",
    color: "from-neutral-200/50 to-transparent dark:from-neutral-800/50 dark:to-transparent",
    border: "border-neutral-200 dark:border-neutral-800",
  },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Navbar({ onLaunch }: { onLaunch: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200/80 dark:border-white/10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
            <FileText size={13} className="text-white dark:text-neutral-900" />
          </div>
          <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
            TenderLens
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
          <a href="#features" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-neutral-900 dark:hover:text-white transition-colors">How it works</a>
          <a href="#use-cases" className="hover:text-neutral-900 dark:hover:text-white transition-colors">Use Cases</a>
        </nav>

        <button
          onClick={onLaunch}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          Launch App
          <ChevronRight size={14} />
        </button>
      </div>
    </header>
  );
}

function StatsBar() {
  return (
    <section className="py-8 border-t border-b border-neutral-100/80 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-900/40">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center gap-1"
            >
              <span className={cn("text-3xl font-bold tracking-tighter", s.color)}>
                {s.value}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
            Simple 3-Step Process
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
            From raw PDF to a structured compliance verdict in under 60 seconds.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={cn(
                "group relative p-6 rounded-xl overflow-hidden transition-all duration-300",
                "border bg-white dark:bg-black",
                "hover:-translate-y-0.5 hover:shadow-lg",
                step.border
              )}
            >
              {/* gradient bg */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", step.color)} />

              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    {step.icon}
                  </div>
                  <span className="font-mono text-2xl font-bold text-neutral-200 dark:text-neutral-800 group-hover:text-neutral-300 dark:group-hover:text-neutral-700 transition-colors">
                    {step.num}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white text-[15px] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn(
            "relative p-10 md:p-14 rounded-2xl overflow-hidden text-center",
            "border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50"
          )}
        >
          {/* dot pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]" />

          <div className="relative z-10">
            <span className="inline-block mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
              100% Free · No Account Required
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-4">
              Start Validating Now
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto mb-8">
              No sign-up. No cloud. Just upload your PDFs and get a
              compliance report powered by semantic AI — completely free.
            </p>
            <button
              onClick={onLaunch}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Launch Validator
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-100/80 dark:border-white/10 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-neutral-900 dark:bg-white flex items-center justify-center">
            <FileText size={11} className="text-white dark:text-neutral-900" />
          </div>
          <span className="font-bold text-sm text-neutral-900 dark:text-white">TenderLens</span>
        </div>

        <p className="text-xs text-neutral-400 text-center">
          Built with semantic AI · Runs entirely offline · No data stored
        </p>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg border border-neutral-200/80 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/20 transition-all"
          >
            <Contact size={14} />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg border border-neutral-200/80 dark:border-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/20 transition-all"
          >
            <Network size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── Trust / Proof badges ─────────────────────────────────────────────────────

function TrustBadges() {
  const badges = [
    { icon: <Lock size={13} />, label: "Offline & Private" },
    { icon: <Zap size={13} />, label: "< 60s Analysis" },
    { icon: <TrendingUp size={13} />, label: "94% Accuracy" },
    { icon: <ShieldAlert size={13} />, label: "3-Tier Risk Classification" },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-8">
      {badges.map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200/80 dark:border-white/10 bg-white/50 dark:bg-white/5 text-xs text-neutral-600 dark:text-neutral-400 font-medium backdrop-blur-sm"
        >
          <span className="text-neutral-700 dark:text-neutral-300">{b.icon}</span>
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [showValidator, setShowValidator] = useState(false);

  return (
    <div className="relative min-h-screen bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {!showValidator ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 overflow-y-auto"
          >
            {/* Sticky Nav */}
            <Navbar onLaunch={() => setShowValidator(true)} />

            {/* Hero */}
            <div className="pt-14">
              <BackgroundPaths
                title="TenderLens"
                onGetStarted={() => setShowValidator(true)}
              />
            </div>

            {/* Trust Badges — inside hero area */}
            <div className="relative z-10 bg-white dark:bg-neutral-950 -mt-6 pb-2">
              <TrustBadges />
            </div>

            {/* Stats Bar */}
            <StatsBar />

            {/* Features Bento Grid */}
            <section id="features" className="py-20 relative z-10 bg-neutral-50/50 dark:bg-neutral-950">
              <div className="text-center mb-12 px-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                    What We Do
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-4">
                    Powerful Features
                  </h2>
                  <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
                    Everything you need to validate proposals and ensure compliance — without reading a single page manually.
                  </p>
                </motion.div>
              </div>
              <BentoGrid items={featureItems} />
            </section>

            {/* How It Works */}
            <div className="relative z-10 bg-white dark:bg-neutral-900/40">
              <HowItWorks />
            </div>

            {/* Use Cases Bento Grid */}
            <section id="use-cases" className="py-20 relative z-10 bg-neutral-50/50 dark:bg-neutral-950">
              <div className="text-center mb-12 px-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-900 dark:text-neutral-100 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                    Built For Everyone
                  </span>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white mb-4">
                    Use Cases
                  </h2>
                  <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
                    From government procurement to private enterprise — TenderLens adapts to your compliance workflow.
                  </p>
                </motion.div>
              </div>
              <BentoGrid items={useCaseItems} />
            </section>

            {/* CTA Section */}
            <div className="relative z-10 bg-white dark:bg-neutral-950">
              <CTASection onLaunch={() => setShowValidator(true)} />
            </div>

            {/* Footer */}
            <div className="relative z-10 bg-white dark:bg-neutral-950">
              <Footer />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="validator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-10 w-full min-h-screen bg-white dark:bg-neutral-950"
          >
            <ValidatorView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
