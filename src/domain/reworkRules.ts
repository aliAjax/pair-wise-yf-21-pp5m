// 返修规则：纯领域逻辑，不依赖存储与页面状态。
// 验收后 7 天内可对单个工序发起返修；返修只退回所选工序及后续，
// 前面工序保留，已用色卡不返还；二次验收按剩余工序推进。

export type StepStatus = "done" | "pending";
export type ArchiveStatus = "accepted" | "archived";

export interface ColorCard {
  id: string;
  name: string;
  hex: string;
}

export interface DamageZone {
  id: string;
  label: string;
  x: number; // 纹样标记图上的百分比坐标
  y: number;
}

export interface ReworkRecord {
  id: string;
  reason: string;
  zoneId: string;
  createdAt: string; // ISO 时间
  resolvedAt: string | null; // 二次验收后核销
}

export interface RepairStep {
  id: string;
  name: string;
  status: StepStatus;
  usedCards: string[]; // 已用色卡 id，返修退回时不返还
  rework: ReworkRecord | null;
}

export interface CarpetArchive {
  id: string;
  origin: string;
  era: string;
  density: string;
  material: string;
  dyeType: string;
  status: ArchiveStatus;
  acceptedAt: string; // ISO 验收时间，返修窗口由此起算
  damageZones: DamageZone[];
  colorCards: ColorCard[];
  steps: RepairStep[];
}

export const REWORK_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReworkInput {
  stepId: string;
  reason: string;
  zoneId: string;
}

export type ReworkRejectCode =
  | "ARCHIVE_CLOSED" // 已归档
  | "WINDOW_EXPIRED" // 超出验收后 7 天窗口
  | "STEP_HAS_OPEN_REWORK" // 工序已有未结返修
  | "ZONE_NOT_IN_ARCHIVE"; // 破损区不属于本档案

export type ReworkResult =
  | { ok: true; archive: CarpetArchive }
  | { ok: false; code: ReworkRejectCode };

export const REJECT_TEXT: Record<ReworkRejectCode, string> = {
  ARCHIVE_CLOSED: "档案已归档，整次返修申请被拒绝，原工序与色卡不变。",
  WINDOW_EXPIRED: "已超过验收后 7 天返修窗口，整次申请被拒绝，原工序与色卡不变。",
  STEP_HAS_OPEN_REWORK: "该工序已有未结返修，整次申请被拒绝，原工序与色卡不变。",
  ZONE_NOT_IN_ARCHIVE: "所选破损区不属于本档案，整次申请被拒绝，原工序与色卡不变。",
};

export function isWithinReworkWindow(archive: CarpetArchive, now: Date): boolean {
  const deadline = new Date(archive.acceptedAt).getTime() + REWORK_WINDOW_DAYS * DAY_MS;
  return now.getTime() <= deadline;
}

export function remainingReworkDays(archive: CarpetArchive, now: Date): number {
  const deadline = new Date(archive.acceptedAt).getTime() + REWORK_WINDOW_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((deadline - now.getTime()) / DAY_MS));
}

export function hasOpenRework(step: RepairStep): boolean {
  return step.rework !== null && step.rework.resolvedAt === null;
}

export function openReworkCount(archive: CarpetArchive): number {
  return archive.steps.filter(hasOpenRework).length;
}

export function pendingStepCount(archive: CarpetArchive): number {
  return archive.steps.filter((s) => s.status === "pending").length;
}

/**
 * 返修申请校验与落地。任一规则不满足即整次拒绝，档案原样返回由调用方丢弃，
 * 原工序与色卡均不变。通过时仅退回所选工序及后续，前面工序保留，
 * 各工序已用色卡保留记录、不返还库存。
 */
export function evaluateRework(
  archive: CarpetArchive,
  input: ReworkInput,
  now: Date
): ReworkResult {
  if (archive.status === "archived") {
    return { ok: false, code: "ARCHIVE_CLOSED" };
  }
  if (!isWithinReworkWindow(archive, now)) {
    return { ok: false, code: "WINDOW_EXPIRED" };
  }
  const stepIndex = archive.steps.findIndex((s) => s.id === input.stepId);
  const step = stepIndex >= 0 ? archive.steps[stepIndex] : undefined;
  if (!step || hasOpenRework(step)) {
    // 工序不存在或已有未结返修，均视为该工序不可返修
    return { ok: false, code: "STEP_HAS_OPEN_REWORK" };
  }
  if (!archive.damageZones.some((z) => z.id === input.zoneId)) {
    return { ok: false, code: "ZONE_NOT_IN_ARCHIVE" };
  }

  const rework: ReworkRecord = {
    id: `RW-${archive.id}-${input.stepId}-${now.getTime()}`,
    reason: input.reason.trim(),
    zoneId: input.zoneId,
    createdAt: now.toISOString(),
    resolvedAt: null,
  };

  const steps = archive.steps.map((s, i) => {
    if (i < stepIndex) return s; // 前面工序保留
    return {
      ...s,
      status: "pending" as StepStatus, // 所选工序及后续退回待办
      rework: i === stepIndex ? rework : s.rework,
      // usedCards 原样保留：已用色卡不返还
    };
  });

  return { ok: true, archive: { ...archive, steps } };
}

/** 二次验收推进：按顺序完成下一道待办工序（剩余工序逐道推进）。 */
export function completeNextPendingStep(archive: CarpetArchive): CarpetArchive {
  const idx = archive.steps.findIndex((s) => s.status === "pending");
  if (idx === -1) return archive;
  const steps = archive.steps.map((s, i) =>
    i === idx ? { ...s, status: "done" as StepStatus } : s
  );
  return { ...archive, steps };
}

/** 存在未结返修且全部工序完成后，才允许二次验收。 */
export function canReaccept(archive: CarpetArchive): boolean {
  return (
    archive.status !== "archived" &&
    openReworkCount(archive) > 0 &&
    archive.steps.every((s) => s.status === "done")
  );
}

/** 二次验收：核销全部未结返修，验收时间重置，返修窗口重新起算。 */
export function applyReacceptance(archive: CarpetArchive, now: Date): CarpetArchive {
  const steps = archive.steps.map((s) =>
    hasOpenRework(s) && s.rework
      ? { ...s, rework: { ...s.rework, resolvedAt: now.toISOString() } }
      : s
  );
  return { ...archive, steps, acceptedAt: now.toISOString() };
}

/** 完工率：已完成工序 / 全部工序（随传入的档案集合变化，供产地筛选复用）。 */
export function completionRate(archives: CarpetArchive[]): number {
  const steps = archives.flatMap((a) => a.steps);
  if (steps.length === 0) return 0;
  const done = steps.filter((s) => s.status === "done").length;
  return Math.round((done / steps.length) * 100);
}
