"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Verdict = "MET" | "MET_BUT_VAGUE" | "PARTIAL" | "NOT_MET";
type RiskLevel = "DISQUALIFYING" | "HIGH_RISK" | "STANDARD";

interface ResultItem {
  id: number;
  requirement: string;
  category: string;
  risk_level: RiskLevel;
  verdict: Verdict;
  semantic_similarity: number;
  compliance_score: number;
  is_vague: boolean;
  has_conditions: boolean;
  hedge_phrases_found: string[];
  conditions_found: string[];
  best_match_excerpt: string;
}

interface Summary {
  total: number;
  met: number;
  partial: number;
  not_met: number;
  met_but_vague: number;
  with_conditions: number;
}

interface DisqFailure {
  id: number;
  requirement: string;
  verdict: string;
}

interface ValidationResponse {
  status: string;
  overall_status: "PASSED" | "DISQUALIFIED";
  disqualifying_failures: DisqFailure[];
  summary: Summary;
  results: ResultItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = "http://127.0.0.1:8000";

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  MET: {
    label: "Met",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    icon: <CheckCircle2 size={12} />,
  },
  MET_BUT_VAGUE: {
    label: "Met (Vague)",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    icon: <AlertTriangle size={12} />,
  },
  PARTIAL: {
    label: "Partial",
    color: "text-neutral-600 dark:text-neutral-400",
    bg: "bg-neutral-500/10 border-neutral-500/30",
    icon: <Activity size={12} />,
  },
  NOT_MET: {
    label: "Not Met",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    icon: <XCircle size={12} />,
  },
};

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bg: string }
> = {
  DISQUALIFYING: {
    label: "Disqualifying",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
  },
  HIGH_RISK: {
    label: "High Risk",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
  },
  STANDARD: {
    label: "Standard",
    color: "text-neutral-500 dark:text-neutral-400",
    bg: "bg-neutral-500/10 border-neutral-500/30",
  },
};

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
          {label}
        </span>
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{value}%</span>
      </div>
      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cfg = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.NOT_MET;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        cfg.color,
        cfg.bg
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const cfg = RISK_CONFIG[risk] ?? RISK_CONFIG.STANDARD;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        cfg.color,
        cfg.bg
      )}
    >
      {cfg.label}
    </span>
  );
}

function UploadZone({
  id,
  label,
  icon,
  hint,
  file,
  onFile,
  disabled,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint: string;
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type === "application/pdf") onFile(f);
    },
    [onFile]
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
        dragging
          ? "border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-800"
          : file
          ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
          : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div className="flex flex-col items-center gap-2">
        <span
          className={cn(
            "text-3xl transition-colors",
            file ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
          )}
        >
          {file ? <FileCheck size={36} /> : icon}
        </span>
        <p
          className={cn(
            "text-sm font-semibold",
            file ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
          )}
        >
          {file ? file.name : label}
        </p>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
    </div>
  );
}

function ResultRow({ r }: { r: ResultItem }) {
  const [expanded, setExpanded] = useState(false);
  const semColor =
    r.semantic_similarity >= 75
      ? "bg-emerald-500"
      : r.semantic_similarity >= 50
      ? "bg-amber-500"
      : "bg-red-500";
  const compColor =
    r.compliance_score >= 75
      ? "bg-emerald-500"
      : r.compliance_score >= 50
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <>
      <tr
        className="border-b border-neutral-200 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <td className="py-3 px-4 text-neutral-500 font-mono text-xs">{r.id}</td>
        <td className="py-3 px-4">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200 leading-snug line-clamp-2">
            {r.requirement}
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <RiskBadge risk={r.risk_level ?? "STANDARD"} />
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700">
              {r.category || "General"}
            </span>
            {r.is_vague && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30">
                ⚠ Vague
              </span>
            )}
            {r.has_conditions && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 border-neutral-500/30">
                🔵 Conditional
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <VerdictBadge verdict={r.verdict} />
        </td>
        <td className="py-3 px-4 min-w-[120px]">
          <div className="flex flex-col gap-2">
            <ScoreBar
              label="Semantic"
              value={r.semantic_similarity ?? 0}
              color={semColor}
            />
            <ScoreBar
              label="Compliance"
              value={r.compliance_score ?? 0}
              color={compColor}
            />
          </div>
        </td>
        <td className="py-3 px-4 text-right">
          {expanded ? (
            <ChevronUp size={14} className="text-neutral-500 ml-auto" />
          ) : (
            <ChevronDown size={14} className="text-neutral-500 ml-auto" />
          )}
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td
              colSpan={5}
              className="bg-neutral-50/50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800"
            >
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-4 space-y-3"
              >
                {r.best_match_excerpt && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                      Match Excerpt
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 italic leading-relaxed border-l-2 border-neutral-300 dark:border-neutral-600 pl-3">
                      &ldquo;{r.best_match_excerpt}&rdquo;
                    </p>
                  </div>
                )}
                {r.is_vague && r.hedge_phrases_found?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-500 font-semibold mb-1">
                      Hedge Phrases
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.hedge_phrases_found.map((p, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-700 dark:text-amber-300 text-xs italic"
                        >
                          &ldquo;{p}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {r.has_conditions && r.conditions_found?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-600 dark:text-neutral-500 font-semibold mb-1">
                      Conditions Detected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.conditions_found.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-neutral-500/10 border border-neutral-500/30 rounded text-neutral-700 dark:text-neutral-300 text-xs italic"
                        >
                          &ldquo;{c}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!r.best_match_excerpt &&
                  !r.is_vague &&
                  !r.has_conditions && (
                    <p className="text-xs text-neutral-500 italic">
                      No additional details available.
                    </p>
                  )}
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Validator View ──────────────────────────────────────────────────────

export default function ValidatorView() {
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  const [rfpStatus, setRfpStatus] = useState<{
    type: "" | "ok" | "err" | "loading";
    msg: string;
  }>({ type: "", msg: "" });
  const [propStatus, setPropStatus] = useState<{
    type: "" | "ok" | "err" | "loading";
    msg: string;
  }>({ type: "", msg: "" });

  const [rfpDone, setRfpDone] = useState(false);
  const [results, setResults] = useState<ValidationResponse | null>(null);

  // ── Step 1: Upload RFP ──
  async function uploadRFP() {
    if (!rfpFile) {
      setRfpStatus({ type: "err", msg: "⚠ Please select an RFP PDF first." });
      return;
    }
    setRfpStatus({ type: "loading", msg: "Extracting requirements…" });
    const fd = new FormData();
    fd.append("file", rfpFile);
    try {
      const res = await fetch(`${API_BASE}/upload-rfp`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setRfpStatus({
        type: "ok",
        msg: `✓ ${data.total} requirements extracted.`,
      });
      setRfpDone(true);
    } catch (err: unknown) {
      setRfpStatus({
        type: "err",
        msg: `✗ ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }

  // ── Step 2: Validate Proposal ──
  async function validateProposal() {
    if (!proposalFile) {
      setPropStatus({
        type: "err",
        msg: "⚠ Please select a proposal PDF first.",
      });
      return;
    }
    setPropStatus({
      type: "loading",
      msg: "Running semantic matching + analysis…",
    });
    const fd = new FormData();
    fd.append("file", proposalFile);
    try {
      const res = await fetch(`${API_BASE}/validate`, {
        method: "POST",
        body: fd,
      });
      const data: ValidationResponse = await res.json();
      if (!res.ok)
        throw new Error((data as unknown as { detail: string }).detail || "Validation failed");
      setResults(data);
      setPropStatus({
        type: "ok",
        msg: `✓ ${data.summary.total} requirements analyzed.`,
      });
    } catch (err: unknown) {
      setPropStatus({
        type: "err",
        msg: `✗ ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }

  const complianceScore = results
    ? Math.round(
        ((results.summary.met * 1.0 +
          results.summary.met_but_vague * 0.75 +
          results.summary.partial * 0.5) /
          results.summary.total) *
          100
      )
    : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* ─── Header ─── */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
              <FileText size={14} className="text-white dark:text-neutral-900" />
            </div>
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white">
              TenderLens
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Semantic AI · Offline
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* ─── Page title ─── */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Compliance Validator
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Upload an RFP and vendor proposal to validate compliance with
            semantic AI matching.
          </p>
        </div>

        {/* ─── Step Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-white flex items-center justify-center text-xs font-bold text-white dark:text-neutral-900">
                1
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">Upload RFP Document</h3>
            </div>
            <UploadZone
              id="rfp-file"
              label="Click or drag & drop"
              icon={<Upload size={32} />}
              hint="PDF files only · RFP / Tender Document"
              file={rfpFile}
              onFile={setRfpFile}
            />
            <button
              id="rfp-btn"
              onClick={uploadRFP}
              disabled={rfpStatus.type === "loading"}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-neutral-900 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {rfpStatus.type === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Extracting…
                </>
              ) : (
                "Extract Requirements"
              )}
            </button>
            {rfpStatus.msg && (
              <p
                className={cn(
                  "text-xs",
                  rfpStatus.type === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : rfpStatus.type === "err"
                    ? "text-red-600 dark:text-red-400"
                    : "text-neutral-600 dark:text-neutral-400"
                )}
              >
                {rfpStatus.msg}
              </p>
            )}
          </motion.div>

          {/* Step 2 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  rfpDone ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
                )}
              >
                2
              </div>
              <h3
                className={cn(
                  "font-semibold transition-colors",
                  rfpDone ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-500"
                )}
              >
                Upload Vendor Proposal
              </h3>
            </div>
            <UploadZone
              id="proposal-file"
              label="Click or drag & drop"
              icon={<Upload size={32} />}
              hint="PDF files only · Vendor Response / Proposal"
              file={proposalFile}
              onFile={setProposalFile}
              disabled={!rfpDone}
            />
            <button
              id="proposal-btn"
              onClick={validateProposal}
              disabled={!rfpDone || propStatus.type === "loading"}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-neutral-900 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {propStatus.type === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing…
                </>
              ) : (
                "Validate Proposal"
              )}
            </button>
            {propStatus.msg && (
              <p
                className={cn(
                  "text-xs",
                  propStatus.type === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : propStatus.type === "err"
                    ? "text-red-600 dark:text-red-400"
                    : "text-neutral-600 dark:text-neutral-400"
                )}
              >
                {propStatus.msg}
              </p>
            )}
          </motion.div>
        </div>

        {/* ─── Results ─── */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Status Banner */}
              {results.overall_status === "DISQUALIFIED" ? (
                <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-red-500 dark:text-red-400 mt-0.5 shrink-0" size={20} />
                    <div>
                      <h4 className="text-red-700 dark:text-red-300 font-bold text-sm">
                        ⛔ Vendor DISQUALIFIED
                      </h4>
                      <p className="text-red-600/80 dark:text-red-400/80 text-xs mt-1">
                        The following mandatory requirements were not met.
                        Failure on any DISQUALIFYING requirement is grounds for
                        immediate bid rejection.
                      </p>
                      <ul className="mt-2 space-y-1">
                        {results.disqualifying_failures.map((f) => (
                          <li
                            key={f.id}
                            className="text-xs text-red-600/90 dark:text-red-300/80 before:content-['✗'] before:mr-2 before:text-red-500 dark:before:text-red-400"
                          >
                            [Req #{f.id}] {f.requirement} —{" "}
                            {f.verdict.replace("_", " ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                  <ShieldCheck className="text-emerald-500 dark:text-emerald-400 shrink-0" size={20} />
                  <p className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
                    ✅ Vendor passed all disqualifying checks. Full compliance
                    review below.
                  </p>
                </div>
              )}

              {/* Summary Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: "Total",
                    val: results.summary.total,
                    color: "text-neutral-900 dark:text-white",
                  },
                  {
                    label: "Met",
                    val: results.summary.met,
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    label: "Vague",
                    val: results.summary.met_but_vague,
                    color: "text-amber-600 dark:text-amber-400",
                  },
                  {
                    label: "Partial",
                    val: results.summary.partial,
                    color: "text-neutral-600 dark:text-neutral-400",
                  },
                  {
                    label: "Not Met",
                    val: results.summary.not_met,
                    color: "text-red-600 dark:text-red-400",
                  },
                  {
                    label: "Conditional",
                    val: results.summary.with_conditions,
                    color: "text-neutral-500 dark:text-neutral-300",
                  },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 flex flex-col gap-1"
                  >
                    <span className="text-xs text-neutral-500 font-medium">
                      {t.label}
                    </span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn("text-2xl font-bold", t.color)}
                    >
                      {t.val}
                    </motion.span>
                  </div>
                ))}
              </div>

              {/* Compliance Score */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-neutral-400" />
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Overall Compliance Score
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      complianceScore >= 70
                        ? "text-emerald-600 dark:text-emerald-400"
                        : complianceScore >= 50
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {complianceScore}%
                  </span>
                </div>
                <div className="h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${complianceScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      complianceScore >= 70
                        ? "bg-emerald-500"
                        : complianceScore >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                  />
                </div>
              </div>

              {/* Download Bar */}
              <div
                id="download-bar"
                className="flex flex-wrap gap-3 items-center"
              >
                <a
                  id="dl-csv"
                  href={`${API_BASE}/download-csv`}
                  download="compliance_report.csv"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-900 dark:text-neutral-200 text-sm font-semibold transition-all shadow-sm"
                >
                  <Download size={14} />
                  Download CSV
                </a>
                <a
                  id="dl-pdf"
                  href={`${API_BASE}/download-pdf`}
                  download="compliance_report.pdf"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-semibold transition-all shadow-sm"
                >
                  <FileText size={14} />
                  Download PDF Report
                </a>
                <span className="text-xs text-neutral-500 ml-1">
                  {results.results.length} requirements analyzed ·{" "}
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              {/* Results Table */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
                    Compliance Results
                  </span>
                  <span className="text-xs text-neutral-500">
                    {results.results.length} requirements · click row to expand
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-100/50 dark:bg-neutral-800/40">
                        <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold w-10">
                          #
                        </th>
                        <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold min-w-[260px]">
                          Requirement
                        </th>
                        <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                          Verdict
                        </th>
                        <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold min-w-[130px]">
                          Scores
                        </th>
                        <th className="py-2.5 px-4 w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((r) => (
                        <ResultRow key={r.id} r={r} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
