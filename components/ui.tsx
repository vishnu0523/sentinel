"use client";
import { Fingerprint, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Finding } from "@/lib/types";
import { cvssScore, severityFromScore } from "@/lib/cvss";
export function date(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`tag ${tone}`}>
      <span />
      {children}
    </span>
  );
}
export function Button({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`button ${primary ? "primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
export function Empty({
  icon: Icon = Fingerprint,
  title,
  text,
  action,
}: {
  icon?: typeof Fingerprint;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={32} strokeWidth={1.4} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Heading({
  label,
  title,
  action,
}: {
  label?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {label && <span className="overline">{label}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function Severity({ finding }: { finding: Finding }) {
  const score = cvssScore(finding.cvss);
  return (
    <Pill tone={severityFromScore(score)}>
      {severityFromScore(score)} <b>{score.toFixed(1)}</b>
    </Pill>
  );
}
export function SearchInput({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-input">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button
          className="icon-button"
          aria-label="Clear search"
          onClick={() => setQuery("")}
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}
export function Metric({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof Fingerprint;
  tone: string;
}) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </div>
  );
}
