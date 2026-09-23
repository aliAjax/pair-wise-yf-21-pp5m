// 页面状态：产地筛选、档案选中、返修表单与二次验收动作。
// 业务判断委托 domain/reworkRules，读写委托 data/archiveStore。

import { useEffect, useMemo, useState } from "react";
import {
  applyReacceptance,
  canReaccept,
  completeNextPendingStep,
  completionRate,
  evaluateRework,
  openReworkCount,
  type CarpetArchive,
  type ReworkRejectCode,
} from "../domain/reworkRules";
import { loadArchives, saveArchives, upsertArchive } from "../data/archiveStore";

export const ORIGIN_ALL = "全部";
export const ORIGINS = ["波斯", "安纳托利亚", "高加索", "藏毯"];

export interface ReworkFormState {
  stepId: string;
  reason: string;
  zoneId: string;
}

const EMPTY_FORM: ReworkFormState = { stepId: "", reason: "", zoneId: "" };

export function useReworkConsole() {
  const [archives, setArchives] = useState<CarpetArchive[]>(() => loadArchives());
  const [origin, setOrigin] = useState<string>(ORIGIN_ALL);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<ReworkFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<ReworkRejectCode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      origin === ORIGIN_ALL
        ? archives
        : archives.filter((a) => a.origin === origin),
    [archives, origin]
  );

  const selected = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  // 其他档案的破损区，供返修单选择以校验“破损区不属本档案”的整次拒绝
  const foreignZones = useMemo(
    () =>
      archives
        .filter((a) => a.id !== selected?.id)
        .flatMap((a) =>
        a.damageZones.map((z) => ({
          id: z.id,
          label: `${a.id} · ${z.label}（非本档案）`,
        }))
      ),
    [archives, selected?.id]
  );

  // 切换档案时清空表单与提示，避免把上一档案的返修单带过去
  useEffect(() => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setRejection(null);
    setNotice(null);
  }, [selected?.id]);

  // 待返修数与完工率随产地筛选更新
  const metrics = useMemo(
    () => ({
      openReworks: filtered.reduce((n, a) => n + openReworkCount(a), 0),
      archiveCount: filtered.length,
      cardCount: filtered.reduce((n, a) => n + a.colorCards.length, 0),
      completion: completionRate(filtered),
    }),
    [filtered]
  );

  const commit = (next: CarpetArchive) => {
    setArchives((prev) => {
      const updated = upsertArchive(prev, next);
      saveArchives(updated);
      return updated;
    });
  };

  const updateForm = (patch: Partial<ReworkFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setFormError(null);
    setRejection(null);
  };

  const submitRework = () => {
    if (!selected) return;
    setFormError(null);
    setRejection(null);
    setNotice(null);

    if (!form.stepId) return setFormError("请选择需要返修的工序");
    if (!form.reason.trim()) return setFormError("请填写返修原因");
    if (!form.zoneId) return setFormError("请关联本档案的破损区");

    const result = evaluateRework(selected, form, new Date());
    if (!result.ok) {
      // 整次拒绝：不落库，原工序与色卡不变
      setRejection(result.code);
      return;
    }
    const stepName =
      selected.steps.find((s) => s.id === form.stepId)?.name ?? form.stepId;
    commit(result.archive);
    setForm(EMPTY_FORM);
    setNotice(
      `已登记返修：${stepName} 及其后续工序退回待办，前面工序保留，已用色卡不返还。`
    );
  };

  const advanceStep = () => {
    if (!selected) return;
    setNotice(null);
    commit(completeNextPendingStep(selected));
  };

  const reaccept = () => {
    if (!selected || !canReaccept(selected)) return;
    commit(applyReacceptance(selected, new Date()));
    setNotice("二次验收完成：未结返修已核销，验收时间重置，返修窗口重新起算。");
  };

  return {
    archives: filtered,
    origin,
    setOrigin,
    originOptions: [ORIGIN_ALL, ...ORIGINS],
    selected,
    selectArchive: setSelectedId,
    foreignZones,
    metrics,
    form,
    updateForm,
    formError,
    rejection,
    notice,
    submitRework,
    advanceStep,
    reaccept,
    canReaccept: selected ? canReaccept(selected) : false,
  };
}
