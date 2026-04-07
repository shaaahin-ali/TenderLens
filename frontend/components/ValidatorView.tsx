"use client";

import React, { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck,
  FileText,
  Info,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Verdict = "MET" | "MET_BUT_VAGUE" | "PARTIAL" | "NOT_MET";
type RiskLevel = "DISQUALIFYING" | "HIGH_RISK" | "STANDARD";
type ValidationMode = "strict" | "lenient";

interface ResultItem {
  id: number;
  requirement: string;
  category: string;
  risk_level: RiskLevel;
  verdict: Verdict;
  base_verdict: Verdict;
  semantic_similarity: number;
  compliance_score: number;
  is_vague: boolean;
  has_conditions: boolean;
  hedge_phrases_found: string[];
  conditions_found: string[];
  best_match_excerpt: string;
  explicit_commitment_found: boolean;
  commitment_phrases_found: string[];
  weak_commitment: boolean;
  verdict_reasons: string[];
  why_this_matters: string;
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

interface CriticalFailure {
  title: string;
  message: string;
  labels: string[];
  count: number;
}

interface CategoryBreakdownItem {
  category: string;
  score: number;
  total: number;
  met: number;
  partial: number;
  not_met: number;
  weak_commitments: number;
}

interface TopIssue {
  title: string;
  detail: string;
  severity: string;
}

interface ValidationResponse {
  status: string;
  mode: ValidationMode;
  overall_status: "PASSED" | "DISQUALIFIED";
  overall_score: number;
  critical_failure: CriticalFailure | null;
  disqualifying_failures: DisqFailure[];
  category_breakdown: CategoryBreakdownItem[];
  top_issues: TopIssue[];
  summary: Summary;
  results: ResultItem[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function parseApiResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return { detail: text || `HTTP ${response.status}` };
}

function getErrorDetail(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof (payload as { detail?: unknown }).detail === "string"
  ) {
    return (payload as { detail: string }).detail;
  }
  return undefined;
}

function isValidationResponse(payload: unknown): payload is ValidationResponse {
  if (!payload || typeof payload !== "object") return false;
  const obj = payload as Partial<ValidationResponse>;
  return Boolean(obj.summary && obj.mode && obj.results);
}

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

function scoreColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function textColor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          {label}
        </span>
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
          {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", scoreColor(value))}
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
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        cfg.color,
        cfg.bg,
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        cfg.color,
        cfg.bg,
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
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file && file.type === "application/pdf") onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200",
        dragging
          ? "border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-800"
          : file
            ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-900",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".pdf"
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          if (nextFile) onFile(nextFile);
        }}
      />
      <div className="flex flex-col items-center gap-2">
        <span
          className={cn(
            "text-3xl transition-colors",
            file
              ? "text-neutral-900 dark:text-white"
              : "text-neutral-400 dark:text-neutral-500",
          )}
        >
          {file ? <FileCheck size={36} /> : icon}
        </span>
        <p
          className={cn(
            "text-sm font-semibold",
            file
              ? "text-neutral-900 dark:text-white"
              : "text-neutral-600 dark:text-neutral-400",
          )}
        >
          {file ? file.name : label}
        </p>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ValidationMode;
  onChange: (mode: ValidationMode) => void;
}) {
  const items: Array<{
    value: ValidationMode;
    title: string;
    description: string;
  }> = [
    {
      value: "lenient",
      title: "Lenient Mode",
      description: "Qualified language becomes Partial",
    },
    {
      value: "strict",
      title: "Strict Mode",
      description: "Qualified language becomes Not Met",
    },
  ];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid gap-1 sm:grid-cols-2">
        {items.map((item) => {
          const active = item.value === mode;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={cn(
                "rounded-xl px-3 py-2 text-left transition-all",
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
              )}
            >
              <div className="text-xs font-semibold uppercase tracking-widest">
                {item.title}
              </div>
              <div
                className={cn(
                  "mt-1 text-xs",
                  active
                    ? "text-white/80 dark:text-neutral-700"
                    : "text-neutral-500 dark:text-neutral-500",
                )}
              >
                {item.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: ResultItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-neutral-200 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <td className="px-4 py-3 font-mono text-xs text-neutral-500">
          {result.id}
        </td>
        <td className="px-4 py-3">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-200">
            {result.requirement}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <RiskBadge risk={result.risk_level ?? "STANDARD"} />
            <span className="inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              {result.category || "General"}
            </span>
            {result.weak_commitment && (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Weak language
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <VerdictBadge verdict={result.verdict} />
            {result.base_verdict !== result.verdict && (
              <span className="text-[11px] text-neutral-500">
                Base semantic verdict:{" "}
                {VERDICT_CONFIG[result.base_verdict]?.label ??
                  result.base_verdict}
              </span>
            )}
          </div>
        </td>
        <td className="min-w-[120px] px-4 py-3">
          <div className="flex flex-col gap-2">
            <ScoreBar
              label="Semantic"
              value={result.semantic_similarity ?? 0}
            />
            <ScoreBar label="Compliance" value={result.compliance_score ?? 0} />
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          {expanded ? (
            <ChevronUp size={14} className="ml-auto text-neutral-500" />
          ) : (
            <ChevronDown size={14} className="ml-auto text-neutral-500" />
          )}
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td
              colSpan={5}
              className="border-b border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/60"
            >
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 px-6 py-4"
              >
                {result.best_match_excerpt && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      Match Excerpt
                    </p>
                    <p className="border-l-2 border-neutral-300 pl-3 text-sm italic leading-relaxed text-neutral-600 dark:border-neutral-600 dark:text-neutral-400">
                      &ldquo;{result.best_match_excerpt}&rdquo;
                    </p>
                  </div>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      Why This Verdict
                    </p>
                    <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                      {result.verdict_reasons.map((reason, index) => (
                        <li
                          key={`${result.id}-reason-${index}`}
                          className="flex gap-2"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      Why This Matters
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {result.why_this_matters}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      Commitment Check
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        result.explicit_commitment_found
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {result.explicit_commitment_found
                        ? "Explicit commitment found"
                        : "Missing explicit commitment"}
                    </p>
                    {result.commitment_phrases_found.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {result.commitment_phrases_found.map(
                          (phrase, index) => (
                            <span
                              key={`${result.id}-commitment-${index}`}
                              className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
                            >
                              {phrase}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      Hedge Phrases
                    </p>
                    {result.hedge_phrases_found.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.hedge_phrases_found.map((phrase, index) => (
                          <span
                            key={`${result.id}-hedge-${index}`}
                            className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                          >
                            {phrase}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        No weaker phrasing detected.
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950/60">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                      Conditions Detected
                    </p>
                    {result.conditions_found.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.conditions_found.map((condition, index) => (
                          <span
                            key={`${result.id}-condition-${index}`}
                            className="rounded border border-neutral-400/30 bg-neutral-500/10 px-2 py-0.5 text-xs text-neutral-700 dark:text-neutral-300"
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        No limiting conditions detected.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ValidatorView() {
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ValidationMode>("lenient");
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

  function handleModeChange(nextMode: ValidationMode) {
    setMode(nextMode);
    setResults(null);
    setPropStatus({ type: "", msg: "" });
  }

  async function uploadRFP() {
    if (!rfpFile) {
      setRfpStatus({ type: "err", msg: "Please select an RFP PDF first." });
      return;
    }
    setRfpStatus({ type: "loading", msg: "Extracting requirements..." });
    const formData = new FormData();
    formData.append("file", rfpFile);
    try {
      const response = await fetch(`${API_BASE}/upload-rfp`, {
        method: "POST",
        body: formData,
      });
      const data = (await parseApiResponse(response)) as {
        total?: number;
        detail?: string;
      };
      if (!response.ok) throw new Error(data.detail || "Upload failed");
      setRfpStatus({
        type: "ok",
        msg: `${data.total} requirements extracted.`,
      });
      setRfpDone(true);
      setResults(null);
      setPropStatus({ type: "", msg: "" });
    } catch (error: unknown) {
      setRfpStatus({
        type: "err",
        msg: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function validateProposal() {
    if (!proposalFile) {
      setPropStatus({
        type: "err",
        msg: "Please select a proposal PDF first.",
      });
      return;
    }
    setPropStatus({
      type: "loading",
      msg: "Running semantic matching and explainability checks...",
    });
    const formData = new FormData();
    formData.append("file", proposalFile);
    formData.append("mode", mode);
    try {
      const response = await fetch(`${API_BASE}/validate`, {
        method: "POST",
        body: formData,
      });
      const data = (await parseApiResponse(response)) as
        | ValidationResponse
        | { detail?: string };
      if (!response.ok) {
        throw new Error(
          getErrorDetail(data) || `Validation failed (${response.status})`,
        );
      }
      if (!isValidationResponse(data)) {
        throw new Error("Validation response format is invalid.");
      }
      setResults(data);
      setPropStatus({
        type: "ok",
        msg: `${data.summary.total} requirements analyzed in ${data.mode} mode.`,
      });
    } catch (error: unknown) {
      setPropStatus({
        type: "err",
        msg: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
              <FileText
                size={14}
                className="text-white dark:text-neutral-900"
              />
            </div>
            <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
              TenderLens
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Semantic AI · Offline
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Compliance Validator
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Upload an RFP and vendor proposal to validate compliance with
              semantic matching, explainability, and procurement-aware scoring.
            </p>
          </div>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                1
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Upload RFP Document
              </h3>
            </div>
            <UploadZone
              id="rfp-file"
              label="Click or drag and drop"
              icon={<Upload size={32} />}
              hint="PDF files only · RFP / Tender Document"
              file={rfpFile}
              onFile={setRfpFile}
            />
            <button
              onClick={uploadRFP}
              disabled={rfpStatus.type === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {rfpStatus.type === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Extracting...
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
                      : "text-neutral-600 dark:text-neutral-400",
                )}
              >
                {rfpStatus.msg}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  rfpDone
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
                )}
              >
                2
              </div>
              <h3
                className={cn(
                  "font-semibold transition-colors",
                  rfpDone
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 dark:text-neutral-500",
                )}
              >
                Upload Vendor Proposal
              </h3>
            </div>
            <UploadZone
              id="proposal-file"
              label="Click or drag and drop"
              icon={<Upload size={32} />}
              hint={`PDF files only · Vendor Response · ${mode === "strict" ? "Strict" : "Lenient"} mode active`}
              file={proposalFile}
              onFile={setProposalFile}
              disabled={!rfpDone}
            />
            <button
              onClick={validateProposal}
              disabled={!rfpDone || propStatus.type === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {propStatus.type === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing...
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
                      : "text-neutral-600 dark:text-neutral-400",
                )}
              >
                {propStatus.msg}
              </p>
            )}
          </motion.div>
        </div>

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {results.critical_failure ? (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert
                      className="mt-0.5 shrink-0 text-red-500 dark:text-red-400"
                      size={20}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-red-700 dark:text-red-300">
                        {results.critical_failure.title}
                      </h4>
                      <p className="mt-1 text-xs text-red-600/90 dark:text-red-300/80">
                        {results.critical_failure.message}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {results.disqualifying_failures.map((failure) => (
                          <li
                            key={failure.id}
                            className="text-xs text-red-600/90 dark:text-red-300/80"
                          >
                            Req #{failure.id}: {failure.requirement} (
                            {failure.verdict.replaceAll("_", " ")})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <ShieldCheck
                    className="shrink-0 text-emerald-500 dark:text-emerald-400"
                    size={20}
                  />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Vendor passed all disqualifying checks. Results below were
                    analyzed in {results.mode} mode.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  {
                    label: "Total",
                    value: results.summary.total,
                    color: "text-neutral-900 dark:text-white",
                  },
                  {
                    label: "Met",
                    value: results.summary.met,
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    label: "Vague",
                    value: results.summary.met_but_vague,
                    color: "text-amber-600 dark:text-amber-400",
                  },
                  {
                    label: "Partial",
                    value: results.summary.partial,
                    color: "text-neutral-600 dark:text-neutral-400",
                  },
                  {
                    label: "Not Met",
                    value: results.summary.not_met,
                    color: "text-red-600 dark:text-red-400",
                  },
                  {
                    label: "Conditional",
                    value: results.summary.with_conditions,
                    color: "text-neutral-500 dark:text-neutral-300",
                  },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <span className="text-xs font-medium text-neutral-500">
                      {tile.label}
                    </span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn("text-2xl font-bold", tile.color)}
                    >
                      {tile.value}
                    </motion.span>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-neutral-400" />
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        Overall Compliance Score
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        textColor(results.overall_score),
                      )}
                    >
                      {results.overall_score}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${results.overall_score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        scoreColor(results.overall_score),
                      )}
                    />
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    {results.mode === "strict"
                      ? "Strict mode treats qualified or non-committal language as non-compliant."
                      : "Lenient mode keeps qualified language visible as partial compliance instead of full compliance."}
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Top 3 Weakest Areas
                    </span>
                    <span className="text-xs text-neutral-500">
                      Auto insight
                    </span>
                  </div>
                  <div className="space-y-3">
                    {results.top_issues.map((issue, index) => (
                      <div
                        key={`${issue.title}-${index}`}
                        className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-950/50"
                      >
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {index + 1}. {issue.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {issue.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
                    Category-wise Score Breakdown
                  </span>
                  <span className="text-xs text-neutral-500">
                    {results.category_breakdown.length} categories
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {results.category_breakdown.map((item) => (
                    <div
                      key={item.category}
                      className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                            {item.category}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {item.total} requirements · {item.weak_commitments}{" "}
                            weak commitments
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-xl font-bold",
                            textColor(item.score),
                          )}
                        >
                          {item.score}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            scoreColor(item.score),
                          )}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-neutral-100 px-2 py-2 text-xs dark:bg-neutral-800">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {item.met}
                          </div>
                          <div className="text-neutral-500">Met</div>
                        </div>
                        <div className="rounded-lg bg-neutral-100 px-2 py-2 text-xs dark:bg-neutral-800">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {item.partial}
                          </div>
                          <div className="text-neutral-500">Partial</div>
                        </div>
                        <div className="rounded-lg bg-neutral-100 px-2 py-2 text-xs dark:bg-neutral-800">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {item.not_met}
                          </div>
                          <div className="text-neutral-500">Not met</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="flex flex-wrap items-center gap-3"
                id="download-bar"
              >
                <a
                  href={`${API_BASE}/download-csv`}
                  download="compliance_report.csv"
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition-all hover:border-neutral-400 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-700"
                >
                  <Download size={14} />
                  Download CSV
                </a>
                <a
                  href={`${API_BASE}/download-pdf`}
                  download="compliance_report.pdf"
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  <FileText size={14} />
                  Download PDF Report
                </a>
                <span className="ml-1 text-xs text-neutral-500">
                  {results.results.length} requirements analyzed ·{" "}
                  {new Date().toLocaleTimeString()}
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
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
                        <th className="w-10 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                          #
                        </th>
                        <th className="min-w-[260px] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                          Requirement
                        </th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                          Verdict
                        </th>
                        <th className="min-w-[130px] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                          Scores
                        </th>
                        <th className="w-6 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((result) => (
                        <ResultRow key={result.id} result={result} />
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
