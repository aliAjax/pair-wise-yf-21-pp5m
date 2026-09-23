// 档案存取：种子数据、localStorage 持久化与集合更新。
// 规则判断一律交给 domain/reworkRules，本文件只做读写。

import type { CarpetArchive, RepairStep, StepStatus } from "../domain/reworkRules";

const STORAGE_KEY = "hxyfront-62009.archives.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

const STEP_NAMES = ["清洗除尘", "配线染色", "补织缺损", "纹样梳理", "整平定型"];

function buildSteps(
  usedCards: string[][],
  overrides: Partial<Record<number, Partial<RepairStep>>> = {}
): RepairStep[] {
  return STEP_NAMES.map((name, i) => ({
    id: `S${i + 1}`,
    name,
    status: "done" as StepStatus,
    usedCards: usedCards[i] ?? [],
    rework: null,
    ...(overrides[i] ?? {}),
  }));
}

function seed(): CarpetArchive[] {
  return [
    {
      id: "CAR-092",
      origin: "波斯",
      era: "约1960s",
      density: "结密度 38",
      material: "羊毛",
      dyeType: "植物染",
      status: "accepted",
      acceptedAt: daysAgo(2), // 窗口内，可返修
      damageZones: [
        { id: "CAR-092-Z1", label: "边缘磨损", x: 12, y: 76 },
        { id: "CAR-092-Z2", label: "流苏缺失", x: 84, y: 14 },
      ],
      colorCards: [
        { id: "C-01", name: "茜草红", hex: "#7c2d12" },
        { id: "C-02", name: "靛蓝", hex: "#1e3a8a" },
        { id: "C-03", name: "羊毛本白", hex: "#e7e0d2" },
      ],
      steps: buildSteps([[], ["C-01", "C-02"], ["C-01", "C-03"], [], []]),
    },
    {
      id: "CAR-117",
      origin: "安纳托利亚",
      era: "约1930s",
      density: "结密度 42",
      material: "羊毛",
      dyeType: "植物染",
      status: "accepted",
      acceptedAt: daysAgo(9), // 已超期，返修应被拒绝
      damageZones: [{ id: "CAR-117-Z1", label: "中心纹样缺口", x: 50, y: 46 }],
      colorCards: [
        { id: "C-04", name: "赭石黄", hex: "#b45309" },
        { id: "C-05", name: "石榴红", hex: "#9f1239" },
      ],
      steps: buildSteps([[], ["C-04"], ["C-05"], [], []]),
    },
    {
      id: "CAR-138",
      origin: "藏毯",
      era: "约1950s",
      density: "结密度 36",
      material: "羊毛",
      dyeType: "矿物染",
      status: "archived", // 已归档，返修应被拒绝
      acceptedAt: daysAgo(20),
      damageZones: [{ id: "CAR-138-Z1", label: "局部褪色", x: 62, y: 30 }],
      colorCards: [
        { id: "C-06", name: "靛蓝", hex: "#1d4ed8" },
        { id: "C-07", name: "藏红", hex: "#7f1d1d" },
      ],
      steps: buildSteps([[], ["C-06"], ["C-07"], [], []]),
    },
    {
      id: "CAR-151",
      origin: "高加索",
      era: "约1940s",
      density: "结密度 40",
      material: "羊毛",
      dyeType: "植物染",
      status: "accepted",
      acceptedAt: daysAgo(4), // 窗口内，但补织缺损已有未结返修
      damageZones: [
        { id: "CAR-151-Z1", label: "虫蛀孔洞", x: 30, y: 56 },
        { id: "CAR-151-Z2", label: "边缘松散", x: 74, y: 82 },
      ],
      colorCards: [
        { id: "C-08", name: "羊毛本白", hex: "#e7e0d2" },
        { id: "C-09", name: "靛蓝", hex: "#1e3a8a" },
        { id: "C-10", name: "赭石黄", hex: "#b45309" },
      ],
      steps: buildSteps(
        [[], ["C-09"], ["C-08", "C-10"], [], []],
        {
          2: {
            status: "pending",
            rework: {
              id: "RW-CAR-151-S3-seed",
              reason: "补织处色差明显，需重新配线",
              zoneId: "CAR-151-Z1",
              createdAt: daysAgo(1),
              resolvedAt: null,
            },
          },
          3: { status: "pending" },
          4: { status: "pending" },
        }
      ),
    },
    {
      id: "CAR-163",
      origin: "波斯",
      era: "约1970s",
      density: "结密度 44",
      material: "丝毛混纺",
      dyeType: "植物染",
      status: "accepted",
      acceptedAt: daysAgo(1), // 窗口内，可返修
      damageZones: [{ id: "CAR-163-Z1", label: "中心奖章裂纹", x: 48, y: 52 }],
      colorCards: [
        { id: "C-11", name: "茜草红", hex: "#7c2d12" },
        { id: "C-12", name: "墨绿", hex: "#14532d" },
      ],
      steps: buildSteps([[], ["C-11"], ["C-12"], [], []]),
    },
  ];
}

export function loadArchives(): CarpetArchive[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CarpetArchive[];
      }
    }
  } catch {
    // 无存储环境或数据损坏时回落到种子数据
  }
  return seed();
}

export function saveArchives(archives: CarpetArchive[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  } catch {
    // 写入失败不阻断页面内状态
  }
}

export function upsertArchive(
  archives: CarpetArchive[],
  next: CarpetArchive
): CarpetArchive[] {
  return archives.map((a) => (a.id === next.id ? next : a));
}
