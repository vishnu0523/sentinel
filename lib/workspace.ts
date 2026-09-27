import { findings as examples } from "./seed/architecture";
import type { Finding } from "./types";
import type { LabRun } from "./lab";
import type { SourceReview } from "./source-review";
export interface Workspace {
  version: 2;
  findings: Finding[];
  runs: LabRun[];
  source: SourceReview | null;
  tasks: Record<string, string>;
  notes: Record<string, string>;
  scope: {
    assessor: string;
    reference: string;
    environment: string;
    confirmed: boolean;
  };
}
export function initialWorkspace(): Workspace {
  return {
    version: 2,
    findings: examples.map((f) => ({
      ...f,
      verification: "unverified",
      status: "open",
      evidenceIds: [],
      checkIds: [],
      retest: {
        status: "not-retested",
        notes: "Requires validation against the pinned target revision.",
      },
    })),
    runs: [],
    source: null,
    tasks: {},
    notes: {},
    scope: {
      assessor: "SIH assessment team",
      reference: "",
      environment: "Local source checkout and in-process fixtures",
      confirmed: false,
    },
  };
}
