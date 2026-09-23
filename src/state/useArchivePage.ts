/**
 * 页面状态层：组合存取层与返修规则，向组件暴露页面状态与动作。
 */

import { useMemo, useState } from "react";
import {
  applyRework,
  archiveStatus,
  completeNextStep,
  computeMetrics,
  filterByOrigin,
  hasOpenRework,
  openReworks,
  reworkWindowLeft,
  type CarpetArchive,
  type ReworkInput,
} from "../domain/reworkRules";
import { getArchive, listArchives, saveArchive } from "../data/archiveStore";

export const ORIGIN_FILTERS = ["全部", "波斯", "安纳托利亚", "高加索", "藏毯"] as const;

const EMPTY_FORM: ReworkInput = { stepId: "", reason: "", damageAreaId: "" };

export interface ArchivePageState {
  origin: string;
  origins: readonly string[];
  filtered: CarpetArchive[];
  metrics: ReturnType<typeof computeMetrics>;
  selected: CarpetArchive | null;
  selectedStatus: string | null;
  windowLeft: number | null;
  form: ReworkInput;
  rejection: string | null;
  notice: string | null;
  setOrigin: (origin: string) => void;
  selectArchive: (id: string) => void;
  updateForm: (patch: Partial<ReworkInput>) => void;
  submitRework: () => void;
  advanceStep: () => void;
  stepHasOpenRework: (stepId: string) => boolean;
  pendingStepCount: number;
}

export function useArchivePage(): ArchivePageState {
  const [version, setVersion] = useState(0);
  const [origin, setOrigin] = useState<string>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ReworkInput>(EMPTY_FORM);
  const [rejection, setRejection] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const archives = useMemo(() => listArchives(), [version]);
  const filtered = useMemo(() => filterByOrigin(archives, origin), [archives, origin]);
  // 待返修数与完工率随产地筛选更新
  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  const selected =
    filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  const refresh = () => setVersion((v) => v + 1);

  const selectArchive = (id: string) => {
    setSelectedId(id);
    setForm(EMPTY_FORM);
    setRejection(null);
    setNotice(null);
  };

  const updateForm = (patch: Partial<ReworkInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setRejection(null);
  };

  const submitRework = () => {
    if (!selected) return;
    const current = getArchive(selected.id) ?? selected;
    const result = applyRework(current, form);
    if (!result.check.ok) {
      // 整次拒绝：不写回，原工序与色卡不变
      setRejection(result.check.message);
      setNotice(null);
      return;
    }
    saveArchive(result.archive);
    const rework = result.archive.reworks[result.archive.reworks.length - 1];
    const step = result.archive.steps.find((s) => s.id === rework.stepId);
    setNotice(
      `返修单 ${rework.id} 已开立：退回「${step?.name ?? rework.stepId}」及后续工序，前面工序保留，已用色卡不返还`
    );
    setRejection(null);
    setForm(EMPTY_FORM);
    refresh();
  };

  const advanceStep = () => {
    if (!selected) return;
    const current = getArchive(selected.id) ?? selected;
    const hadOpenRework = openReworks(current).length > 0;
    const next = completeNextStep(current);
    if (next === current) return;
    saveArchive(next);
    if (next.secondAcceptedAt && next.secondAcceptedAt !== current.secondAcceptedAt) {
      setNotice("剩余工序已全部完成，二次验收通过，未结返修已结单");
    } else if (next.acceptedAt && next.acceptedAt !== current.acceptedAt) {
      setNotice("全部工序完成，首次验收通过，7 天内可发起返修");
    } else if (hadOpenRework) {
      setNotice(null);
    }
    refresh();
  };

  return {
    origin,
    origins: ORIGIN_FILTERS,
    filtered,
    metrics,
    selected,
    selectedStatus: selected ? archiveStatus(selected) : null,
    windowLeft: selected ? reworkWindowLeft(selected, new Date()) : null,
    form,
    rejection,
    notice,
    setOrigin,
    selectArchive,
    updateForm,
    submitRework,
    advanceStep,
    stepHasOpenRework: (stepId: string) =>
      selected ? hasOpenRework(selected, stepId) : false,
    pendingStepCount: selected
      ? selected.steps.filter((s) => s.status === "pending").length
      : 0,
  };
}
