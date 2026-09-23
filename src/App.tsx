import "./styles.css";
import {
  REJECT_TEXT,
  REWORK_WINDOW_DAYS,
  hasOpenRework,
  isWithinReworkWindow,
  openReworkCount,
  pendingStepCount,
  remainingReworkDays,
  type CarpetArchive,
  type RepairStep,
} from "./domain/reworkRules";
import { useReworkConsole } from "./state/useReworkConsole";

const project = {
  id: "hxyfront-62009",
  port: 62009,
  title: "地毯修复纹样档案 · 返修与二次验收台",
  prompt:
    "验收后 7 天内可对单个工序发起返修：选工序、填原因并关联本档案破损区。返修只退回所选工序及后续，前面工序保留，已用色卡不返还；二次验收按剩余工序推进。",
};

const NOW = new Date();

function archiveStatusLabel(archive: CarpetArchive): string {
  if (archive.status === "archived") return "已归档";
  if (openReworkCount(archive) > 0) return "返修中";
  return "已验收";
}

function windowLabel(archive: CarpetArchive): string {
  if (archive.status === "archived") return "档案已归档，不再受理返修";
  if (!isWithinReworkWindow(archive, NOW)) return "返修窗口已超期";
  return `验收后 ${REWORK_WINDOW_DAYS} 天内可返修 · 剩余 ${remainingReworkDays(archive, NOW)} 天`;
}

function stepStatusLabel(step: RepairStep): string {
  if (step.status === "done") return "已完成";
  if (hasOpenRework(step)) return "待返工";
  return "待办";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN");
}

function PatternMap({
  archive,
  activeZoneId,
  onPick,
}: {
  archive: CarpetArchive;
  activeZoneId: string;
  onPick: (zoneId: string) => void;
}) {
  return (
    <svg
      className="pattern-map"
      viewBox="0 0 100 70"
      role="img"
      aria-label={`${archive.id} 纹样局部标记图`}
    >
      <rect x="2" y="2" width="96" height="66" rx="3" className="rug-body" />
      <rect x="8" y="8" width="84" height="54" rx="2" className="rug-border" />
      <ellipse cx="50" cy="35" rx="18" ry="13" className="rug-medallion" />
      <ellipse cx="50" cy="35" rx="8" ry="5.5" className="rug-medallion-inner" />
      {archive.damageZones.map((zone, i) => (
        <g
          key={zone.id}
          className={`zone-marker ${zone.id === activeZoneId ? "active" : ""}`}
          onClick={() => onPick(zone.id)}
        >
          <circle cx={zone.x} cy={zone.y} r="4.5" className="zone-pulse" />
          <circle cx={zone.x} cy={zone.y} r="2.4" className="zone-dot" />
          <text x={zone.x} y={zone.y - 6.5} className="zone-label">
            {`Z${i + 1} ${zone.label}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

function App() {
  const console_ = useReworkConsole();
  const { selected, metrics, form } = console_;

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        <article>
          <small>待返修</small>
          <strong>{metrics.openReworks}</strong>
        </article>
        <article>
          <small>纹样档案</small>
          <strong>{metrics.archiveCount}</strong>
        </article>
        <article>
          <small>色卡数量</small>
          <strong>{metrics.cardCount}</strong>
        </article>
        <article>
          <small>完工率</small>
          <strong>{metrics.completion}%</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>产地筛选</h2>
          <div className="chips">
            {console_.originOptions.map((item) => (
              <button
                key={item}
                className={item === console_.origin ? "chip-active" : ""}
                onClick={() => console_.setOrigin(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h2 className="aside-subtitle">档案列表</h2>
          <div className="archive-list">
            {console_.archives.map((archive) => (
              <button
                key={archive.id}
                className={`archive-item ${
                  archive.id === selected?.id ? "archive-active" : ""
                }`}
                onClick={() => console_.selectArchive(archive.id)}
              >
                <b>{archive.id}</b>
                <span>
                  {archive.origin} · {archiveStatusLabel(archive)}
                </span>
                {openReworkCount(archive) > 0 && (
                  <i className="badge badge-warn">
                    待返修 {openReworkCount(archive)}
                  </i>
                )}
              </button>
            ))}
            {console_.archives.length === 0 && <p>该产地暂无档案</p>}
          </div>
        </aside>

        {selected && (
          <section className="panel console-panel">
            <div className="heading">
              <div>
                <p>返修与二次验收</p>
                <h2>
                  {selected.id}
                  <em
                    className={`badge ${
                      selected.status === "archived" ? "badge-muted" : "badge-ok"
                    }`}
                  >
                    {archiveStatusLabel(selected)}
                  </em>
                </h2>
              </div>
              <div className="acceptance-info">
                <span>验收时间 {formatDate(selected.acceptedAt)}</span>
                <strong>{windowLabel(selected)}</strong>
              </div>
            </div>

            <div className="field-grid readonly-grid">
              <div>
                <span>地毯产地</span>
                <b>{selected.origin}</b>
              </div>
              <div>
                <span>年代</span>
                <b>{selected.era}</b>
              </div>
              <div>
                <span>结密度</span>
                <b>{selected.density}</b>
              </div>
              <div>
                <span>材质</span>
                <b>{selected.material}</b>
              </div>
              <div>
                <span>染色类型</span>
                <b>{selected.dyeType}</b>
              </div>
              <div>
                <span>破损区域</span>
                <b>{selected.damageZones.map((z) => z.label).join("、")}</b>
              </div>
            </div>

            <div className="console-grid">
              <div>
                <h3>纹样局部标记图</h3>
                <PatternMap
                  archive={selected}
                  activeZoneId={form.zoneId}
                  onPick={(zoneId) => console_.updateForm({ zoneId })}
                />
                <div className="chips">
                  {selected.damageZones.map((zone) => (
                    <button
                      key={zone.id}
                      className={zone.id === form.zoneId ? "chip-active" : ""}
                      onClick={() => console_.updateForm({ zoneId: zone.id })}
                    >
                      {zone.label}
                    </button>
                  ))}
                </div>

                <h3>材料色卡</h3>
                <div className="swatches">
                  {selected.colorCards.map((card) => {
                    const used = selected.steps.some((s) =>
                      s.usedCards.includes(card.id)
                    );
                    return (
                      <div key={card.id} className="swatch">
                        <i style={{ background: card.hex }} />
                        <span>{card.name}</span>
                        {used && <em className="badge badge-muted">已用·不返还</em>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rework-form">
                <h3>返修申请单</h3>
                <label>
                  <span>返修工序</span>
                  <select
                    value={form.stepId}
                    onChange={(e) => console_.updateForm({ stepId: e.target.value })}
                  >
                    <option value="">请选择工序</option>
                    {selected.steps.map((step) => (
                      <option key={step.id} value={step.id}>
                        {step.name}
                        {hasOpenRework(step) ? "（已有未结返修）" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>返修原因</span>
                  <textarea
                    rows={3}
                    placeholder="填写返修原因"
                    value={form.reason}
                    onChange={(e) => console_.updateForm({ reason: e.target.value })}
                  />
                </label>
                <label>
                  <span>关联破损区</span>
                  <select
                    value={form.zoneId}
                    onChange={(e) => console_.updateForm({ zoneId: e.target.value })}
                  >
                    <option value="">请选择本档案破损区</option>
                    <optgroup label="本档案破损区">
                      {selected.damageZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="其他档案破损区（应被拒绝）">
                      {console_.foreignZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <button className="primary" onClick={console_.submitRework}>
                  提交返修申请
                </button>
                {console_.formError && (
                  <p className="form-error">{console_.formError}</p>
                )}
                {console_.rejection && (
                  <p className="alert" role="alert">
                    {REJECT_TEXT[console_.rejection]}
                  </p>
                )}
                {console_.notice && <p className="notice">{console_.notice}</p>}
              </div>
            </div>

            <h3>工序进度</h3>
            <div className="steps">
              {selected.steps.map((step, index) => {
                const isNext =
                  step.status === "pending" &&
                  selected.steps.findIndex((s) => s.status === "pending") === index;
                const zoneLabel = step.rework
                  ? selected.damageZones.find((z) => z.id === step.rework?.zoneId)
                      ?.label ?? step.rework.zoneId
                  : null;
                return (
                  <article
                    key={step.id}
                    className={`step step-${step.status} ${
                      hasOpenRework(step) ? "step-rework" : ""
                    }`}
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <div className="step-body">
                      <h4>
                        {step.name}
                        <em
                          className={`badge ${
                            step.status === "done" ? "badge-ok" : "badge-warn"
                          }`}
                        >
                          {stepStatusLabel(step)}
                        </em>
                      </h4>
                      {step.usedCards.length > 0 && (
                        <p>
                          已用色卡：
                          {step.usedCards
                            .map(
                              (id) =>
                                selected.colorCards.find((c) => c.id === id)?.name ??
                                id
                            )
                            .join("、")}
                          （不返还）
                        </p>
                      )}
                      {step.rework && (
                        <p>
                          返修：{step.rework.reason} · 关联 {zoneLabel} ·{" "}
                          {step.rework.resolvedAt
                            ? `已结（${formatDate(step.rework.resolvedAt)}）`
                            : "未结"}
                        </p>
                      )}
                    </div>
                    {isNext && (
                      <button onClick={console_.advanceStep}>完成此工序</button>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="reaccept-bar">
              <span>
                {openReworkCount(selected) > 0
                  ? `未结返修 ${openReworkCount(selected)} 项 · 剩余工序 ${pendingStepCount(selected)} 道`
                  : "当前无未结返修"}
              </span>
              <button
                className="primary"
                disabled={!console_.canReaccept}
                onClick={console_.reaccept}
              >
                {console_.canReaccept
                  ? "完成二次验收"
                  : `二次验收（剩余 ${pendingStepCount(selected)} 道工序）`}
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
