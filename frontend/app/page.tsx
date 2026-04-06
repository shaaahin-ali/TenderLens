"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BackgroundPaths } from "@/components/ui/background-paths";
import ValidatorView from "@/components/ValidatorView";
import { BentoGrid } from "@/components/ui/bento-grid";
import { BrainCircuit, Filter, ShieldAlert, AlertOctagon } from "lucide-react";

export default function Home() {
  const [showValidator, setShowValidator] = useState(false);

  const tenderItems = [
    {
      title: "Semantic AI Matching",
      meta: "Core",
      description: "Match complex vendor proposals against RFP requirements with deep contextual understanding.",
      icon: <BrainCircuit className="w-4 h-4 text-blue-500" />,
      status: "Active",
      tags: ["AI", "NLP"],
      colSpan: 2,
      hasPersistentHover: true,
    },
    {
      title: "Hedge Detection",
      meta: "Smart",
      description: "Automatically flag non-committal language and vague vendor responses.",
      icon: <Filter className="w-4 h-4 text-emerald-500" />,
      status: "Automated",
      tags: ["Analysis", "Language"],
    },
    {
      title: "Risk Analysis",
      meta: "Real-time",
      description: "Evaluate compliance risks instantly and prioritize high-risk deviations.",
      icon: <ShieldAlert className="w-4 h-4 text-purple-500" />,
      tags: ["Security", "Compliance"],
      colSpan: 1,
    },
    {
      title: "Disqualification Logic",
      meta: "Strict",
      description: "Implement hard rules to automatically filter out unqualified proposals.",
      icon: <AlertOctagon className="w-4 h-4 text-red-500" />,
      status: "Enforced",
      tags: ["Rules", "Filtering"],
      colSpan: 2,
    },
  ];

  return (
    <div className="relative min-h-screen bg-white dark:bg-neutral-950 text-slate-950 dark:text-white overflow-hidden">
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
            <BackgroundPaths
              title="TenderLens"
              onGetStarted={() => setShowValidator(true)}
            />
            <div className="pb-24 pt-12 relative z-10 bg-white dark:bg-neutral-950">
              <div className="text-center mb-12 px-4">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-slate-950 dark:text-white mb-4">
                  Powerful Features
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto">
                  Everything you need to validate proposals and ensure compliance seamlessly.
                </p>
              </div>
              <BentoGrid items={tenderItems} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="validator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-10 w-full min-h-screen bg-[#0a0c14]"
          >
            <ValidatorView />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
