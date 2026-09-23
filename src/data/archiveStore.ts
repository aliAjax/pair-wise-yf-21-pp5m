/**
 * 档案存取层：种子数据 + localStorage 持久化。
 * 页面状态层只通过这里读写档案，不直接碰存储细节。
 */

import type { CarpetArchive } from "../domain/reworkRules";
import { toIsoDate } from "../domain/reworkRules";

const STORAGE_KEY = "hxyfront-62009.archives.v1";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIsoDate(d);
}

function seedArchives(): CarpetArchive[] {
  return [
    {
      id: "CAR-092",
      origin: "波斯",
      era: "约1960s",
      knotDensity: "38 结/cm²",
      material: "羊毛",
      dyeType: "植物染",
      note: "边缘磨损待补线",
      damageAreas: [
        { id: "D-092-1", name: "边缘磨损", x: 16, y: 74 },
        { id: "D-092-2", name: "流苏缺失", x: 84, y: 18 },
      ],
      steps: [
        { id: "S-092-1", name: "清洗", status: "done", swatchIds: [] },
        { id: "S-092-2", name: "补线", status: "done", swatchIds: ["SW-092-1"] },
        { id: "S-092-3", name: "染色", status: "done", swatchIds: ["SW-092-2"] },
        { id: "S-092-4", name: "整烫", status: "done", swatchIds: [] },
      ],
      swatches: [
        { id: "SW-092-1", name: "茜草红", hex: "#7c2d12", used: true },
        { id: "SW-092-2", name: "琥珀金", hex: "#b45309", used: true },
        { id: "SW-092-3", name: "靛青", hex: "#0f766e", used: false },
      ],
      acceptedAt: daysAgo(3), // 验收后 7 天内，可正常返修
      secondAcceptedAt: null,
      archived: false,
      reworks: [],
    },
    {
      id: "CAR-117",
      origin: "安纳托利亚",
      era: "约1940s",
      knotDensity: "42 结/cm²",
      material: "羊毛",
      dyeType: "植物染",
      note: "中心纹样缺口",
      damageAreas: [{ id: "D-117-1", name: "中心纹样缺口", x: 50, y: 46 }],
      steps: [
        { id: "S-117-1", name: "清洗", status: "done", swatchIds: [] },
        { id: "S-117-2", name: "补线", status: "done", swatchIds: ["SW-117-1"] },
        { id: "S-117-3", name: "染色", status: "done", swatchIds: ["SW-117-1"] },
        { id: "S-117-4", name: "整烫", status: "done", swatchIds: [] },
      ],
      swatches: [
        { id: "SW-117-1", name: "砖红", hex: "#9a3412", used: true },
        { id: "SW-117-2", name: "米白", hex: "#e7e5e4", used: false },
      ],
      acceptedAt: daysAgo(10), // 已超 7 天返修期
      secondAcceptedAt: null,
      archived: false,
      reworks: [],
    },
    {
      id: "CAR-138",
      origin: "藏毯",
      era: "约1980s",
      knotDensity: "30 结/cm²",
      material: "羊毛",
      dyeType: "矿物染",
      note: "局部褪色，需匹配靛蓝色卡",
      damageAreas: [{ id: "D-138-1", name: "局部褪色", x: 62, y: 60 }],
      steps: [
        { id: "S-138-1", name: "清洗", status: "done", swatchIds: [] },
        { id: "S-138-2", name: "补线", status: "done", swatchIds: ["SW-138-1"] },
        { id: "S-138-3", name: "染色", status: "pending", swatchIds: [] },
        { id: "S-138-4", name: "整烫", status: "pending", swatchIds: [] },
      ],
      swatches: [
        { id: "SW-138-1", name: "藏红", hex: "#b45309", used: true },
        { id: "SW-138-2", name: "靛蓝", hex: "#1e3a8a", used: false },
      ],
      acceptedAt: null, // 尚未验收
      secondAcceptedAt: null,
      archived: false,
      reworks: [],
    },
    {
      id: "CAR-150",
      origin: "高加索",
      era: "约1920s",
      knotDensity: "36 结/cm²",
      material: "羊毛",
      dyeType: "植物染",
      note: "虫蛀孔洞已修复归档",
      damageAreas: [{ id: "D-150-1", name: "虫蛀孔洞", x: 34, y: 30 }],
      steps: [
        { id: "S-150-1", name: "清洗", status: "done", swatchIds: [] },
        { id: "S-150-2", name: "补线", status: "done", swatchIds: ["SW-150-1"] },
        { id: "S-150-3", name: "染色", status: "done", swatchIds: ["SW-150-1"] },
        { id: "S-150-4", name: "整烫", status: "done", swatchIds: [] },
      ],
      swatches: [{ id: "SW-150-1", name: "石榴红", hex: "#7c2d12", used: true }],
      acceptedAt: daysAgo(30),
      secondAcceptedAt: null,
      archived: true, // 已归档，返修整次拒绝
      reworks: [],
    },
    {
      id: "CAR-163",
      origin: "波斯",
      era: "约1970s",
      knotDensity: "40 结/cm²",
      material: "丝毛混纺",
      dyeType: "植物染",
      note: "染色工序返修中",
      damageAreas: [
        { id: "D-163-1", name: "边角褪色", x: 22, y: 24 },
        { id: "D-163-2", name: "中部色差", x: 55, y: 52 },
      ],
      steps: [
        { id: "S-163-1", name: "清洗", status: "done", swatchIds: [] },
        { id: "S-163-2", name: "补线", status: "done", swatchIds: ["SW-163-1"] },
        { id: "S-163-3", name: "染色", status: "pending", swatchIds: ["SW-163-2"] },
        { id: "S-163-4", name: "整烫", status: "pending", swatchIds: [] },
      ],
      swatches: [
        { id: "SW-163-1", name: "茜草红", hex: "#7c2d12", used: true },
        { id: "SW-163-2", name: "靛青", hex: "#0f766e", used: true },
        { id: "SW-163-3", name: "藤黄", hex: "#ca8a04", used: false },
      ],
      acceptedAt: daysAgo(5),
      secondAcceptedAt: null,
      archived: false,
      reworks: [
        {
          id: "RW-CAR-163-01",
          stepId: "S-163-3", // 染色已有未结返修，再次返修该工序会被拒绝
          reason: "靛蓝色差偏大，需重新调色",
          damageAreaId: "D-163-2",
          createdAt: daysAgo(1),
          closedAt: null,
        },
      ],
    },
  ];
}

let cache: CarpetArchive[] | null = null;

function load(): CarpetArchive[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CarpetArchive[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // 本地存储不可用时退回种子数据
  }
  return seedArchives();
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // 忽略持久化失败，内存数据仍然有效
  }
}

export function listArchives(): CarpetArchive[] {
  if (cache === null) {
    cache = load();
  }
  return cache;
}

export function getArchive(id: string): CarpetArchive | undefined {
  return listArchives().find((a) => a.id === id);
}

export function saveArchive(next: CarpetArchive): void {
  cache = listArchives().map((a) => (a.id === next.id ? next : a));
  persist();
}

export function resetArchives(): void {
  cache = seedArchives();
  persist();
}
