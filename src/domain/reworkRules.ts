/**
 * 返修规则（纯领域逻辑，不依赖 React / 存取层）
 *
 * 业务约定：
 * - 验收后 7 天内可对单个工序发起返修，需选工序、填原因并关联本档案破损区；
 * - 工序已有未结返修、超期、已归档、破损区不属本档案时整次拒绝，原工序与色卡不变；
 * - 返修只退回所选工序及后续工序，前面工序保留，已用色卡不返还；
 * - 二次验收按剩余工序推进，剩余工序全部完成后结掉未结返修。
 */

export const REWORK_WINDOW_DAYS = 7;

export type StepStatus = "done" | "pending";

export interface DamageArea {
  id: string;
  name: string;
  /** 纹样局部标记图上的百分比坐标 */
  x: number;
  y: number;
}

export interface ProcessStep {
  id: string;
  name: string;
  status: StepStatus;
  /** 本工序已用掉的色卡 id（返修不退还） */
  swatchIds: string[];
}

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  used: boolean;
}

export interface ReworkRecord {
  id: string;
  stepId: string;
  reason: string;
  damageAreaId: string;
  createdAt: string; // YYYY-MM-DD
  closedAt: string | null;
}

export interface CarpetArchive {
  id: string;
  origin: string;
  era: string;
  knotDensity: string;
  material: string;
  dyeType: string;
  note: string;
  damageAreas: DamageArea[];
  steps: ProcessStep[];
  swatches: ColorSwatch[];
  acceptedAt: string | null; // 首次验收日期
  secondAcceptedAt: string | null; // 二次验收日期
  archived: boolean;
  reworks: ReworkRecord[];
}

export interface ReworkInput {
  stepId: string;
  reason: string;
  damageAreaId: string;
}

export type ReworkRejectCode =
  | "ARCHIVED"
  | "NOT_ACCEPTED"
  | "EXPIRED"
  | "STEP_NOT_FOUND"
  | "STEP_HAS_OPEN_REWORK"
  | "DAMAGE_AREA_NOT_FOUND"
  | "REASON_REQUIRED";

export type ReworkCheck =
  | { ok: true }
  | { ok: false; code: ReworkRejectCode; message: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysSince(isoDate: string, today: Date): number {
  return Math.floor((today.getTime() - new Date(isoDate).getTime()) / DAY_MS);
}

/** 最近一次验收日期（二次验收优先），用于计算返修窗口 */
export function lastAcceptedAt(archive: CarpetArchive): string | null {
  return archive.secondAcceptedAt ?? archive.acceptedAt;
}

export function hasOpenRework(archive: CarpetArchive, stepId: string): boolean {
  return archive.reworks.some((r) => r.stepId === stepId && r.closedAt === null);
}

export function openReworks(archive: CarpetArchive): ReworkRecord[] {
  return archive.reworks.filter((r) => r.closedAt === null);
}

/** 返修窗口剩余天数，未验收返回 null */
export function reworkWindowLeft(archive: CarpetArchive, today: Date): number | null {
  const accepted = lastAcceptedAt(archive);
  if (!accepted) return null;
  return REWORK_WINDOW_DAYS - daysSince(accepted, today);
}

/**
 * 校验一次返修申请。任一规则不满足即整次拒绝。
 */
export function validateRework(
  archive: CarpetArchive,
  input: ReworkInput,
  today: Date = new Date()
): ReworkCheck {
  if (archive.archived) {
    return { ok: false, code: "ARCHIVED", message: "档案已归档，整次返修拒绝" };
  }
  const accepted = lastAcceptedAt(archive);
  if (!accepted) {
    return { ok: false, code: "NOT_ACCEPTED", message: "档案尚未验收，不能发起返修" };
  }
  if (daysSince(accepted, today) > REWORK_WINDOW_DAYS) {
    return {
      ok: false,
      code: "EXPIRED",
      message: `已超出验收后 ${REWORK_WINDOW_DAYS} 天返修期，整次返修拒绝`,
    };
  }
  const step = archive.steps.find((s) => s.id === input.stepId);
  if (!step) {
    return { ok: false, code: "STEP_NOT_FOUND", message: "所选工序不存在于本档案" };
  }
  if (hasOpenRework(archive, step.id)) {
    return { ok: false, code: "STEP_HAS_OPEN_REWORK", message: "该工序已有未结返修，整次返修拒绝" };
  }
  if (!archive.damageAreas.some((d) => d.id === input.damageAreaId)) {
    return { ok: false, code: "DAMAGE_AREA_NOT_FOUND", message: "破损区不属于本档案，整次返修拒绝" };
  }
  if (!input.reason.trim()) {
    return { ok: false, code: "REASON_REQUIRED", message: "请填写返修原因" };
  }
  return { ok: true };
}

/**
 * 应用返修：校验通过才改动；拒绝时原样返回（原工序与色卡不变）。
 * 通过时只把所选工序及后续退回 pending，前面工序保留，已用色卡不返还。
 */
export function applyRework(
  archive: CarpetArchive,
  input: ReworkInput,
  today: Date = new Date()
): { archive: CarpetArchive; check: ReworkCheck } {
  const check = validateRework(archive, input, today);
  if (!check.ok) {
    return { archive, check };
  }
  const stepIndex = archive.steps.findIndex((s) => s.id === input.stepId);
  const steps = archive.steps.map((s, i) =>
    i >= stepIndex ? { ...s, status: "pending" as StepStatus } : s
  );
  const rework: ReworkRecord = {
    id: `RW-${archive.id}-${String(archive.reworks.length + 1).padStart(2, "0")}`,
    stepId: input.stepId,
    reason: input.reason.trim(),
    damageAreaId: input.damageAreaId,
    createdAt: toIsoDate(today),
    closedAt: null,
  };
  return {
    archive: {
      ...archive,
      steps,
      secondAcceptedAt: null, // 重新进入二次验收流程
      reworks: [...archive.reworks, rework],
    },
    check,
  };
}

/**
 * 推进一道待办工序（二次验收按剩余工序逐步推进）。
 * 全部完成时：未验收过记首次验收；有未结返修则记二次验收并结单。
 */
export function completeNextStep(
  archive: CarpetArchive,
  today: Date = new Date()
): CarpetArchive {
  if (archive.archived) return archive;
  const nextIndex = archive.steps.findIndex((s) => s.status === "pending");
  if (nextIndex === -1) return archive;
  const steps = archive.steps.map((s, i) =>
    i === nextIndex ? { ...s, status: "done" as StepStatus } : s
  );
  const allDone = steps.every((s) => s.status === "done");
  let { acceptedAt, secondAcceptedAt, reworks } = archive;
  if (allDone) {
    const todayIso = toIsoDate(today);
    if (!acceptedAt) {
      acceptedAt = todayIso;
    } else if (reworks.some((r) => r.closedAt === null)) {
      secondAcceptedAt = todayIso;
      reworks = reworks.map((r) => (r.closedAt ? r : { ...r, closedAt: todayIso }));
    }
  }
  return { ...archive, steps, acceptedAt, secondAcceptedAt, reworks };
}

export type ArchiveStatus = "已归档" | "返修中" | "二次验收完成" | "已验收" | "修复中";

export function archiveStatus(archive: CarpetArchive): ArchiveStatus {
  if (archive.archived) return "已归档";
  if (openReworks(archive).length > 0) return "返修中";
  if (archive.secondAcceptedAt) return "二次验收完成";
  if (archive.acceptedAt) return "已验收";
  return "修复中";
}

export function filterByOrigin(archives: CarpetArchive[], origin: string): CarpetArchive[] {
  return origin === "全部" ? archives : archives.filter((a) => a.origin === origin);
}

export interface ArchiveMetrics {
  pendingReworks: number;
  archiveCount: number;
  swatchCount: number;
  completionRate: number; // 0-100
}

/** 指标按传入的档案集合计算，调用方传入筛选后的列表即随产地筛选更新 */
export function computeMetrics(archives: CarpetArchive[]): ArchiveMetrics {
  const pendingReworks = archives.reduce((n, a) => n + openReworks(a).length, 0);
  const swatchCount = archives.reduce((n, a) => n + a.swatches.length, 0);
  const totalSteps = archives.reduce((n, a) => n + a.steps.length, 0);
  const doneSteps = archives.reduce(
    (n, a) => n + a.steps.filter((s) => s.status === "done").length,
    0
  );
  return {
    pendingReworks,
    archiveCount: archives.length,
    swatchCount,
    completionRate: totalSteps === 0 ? 0 : Math.round((doneSteps / totalSteps) * 100),
  };
}
