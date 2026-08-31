export type PendingKieJob = {
  resumeKey: string;
  taskId: string;
  model: string;
  createdAt: number;
  resultUrl?: string;
};

const STORAGE_KEY = "little-friend-kie-jobs-v1";
const MAX_AGE = 24 * 60 * 60 * 1_000;

function readAll(): PendingKieJob[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((job) => job?.resumeKey && job?.taskId) : [];
  } catch { return []; }
}

function writeAll(jobs: PendingKieJob[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs)); } catch { /* the active request can still finish in memory */ }
}

export function findPendingKieJob(resumeKey: string, now = Date.now()) {
  const jobs = readAll();
  const fresh = jobs.filter((job) => now - job.createdAt < MAX_AGE);
  if (fresh.length !== jobs.length) writeAll(fresh);
  return fresh.find((job) => job.resumeKey === resumeKey);
}

export function savePendingKieJob(job: PendingKieJob) {
  writeAll([...readAll().filter((item) => item.resumeKey !== job.resumeKey), job]);
}

export function updatePendingKieResult(resumeKey: string, resultUrl: string) {
  writeAll(readAll().map((job) => job.resumeKey === resumeKey ? { ...job, resultUrl } : job));
}

export function completePendingKieJob(resumeKey: string) {
  writeAll(readAll().filter((job) => job.resumeKey !== resumeKey));
}

export function clearPendingKieJobs() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
}
