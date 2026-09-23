import "./styles.css";
import { useArchivePage } from "./state/useArchivePage";

const project = {
  id: "hxyfront-62009",
  sourceNo: 2,
  port: 62009,
  title: "地毯修复纹样档案 · 返修与二次验收台",
  prompt:
    "验收后 7 天内可对单个工序发起返修：选工序、填原因并关联本档案破损区。工序已有未结返修、超期、已归档或破损区不属本档案时整次拒绝，原工序与色卡不变；返修只退回所选工序及后续，前面工序保留，已用色卡不返还，二次验收按剩余工序推进。",
};

function App() {
  const page = useArchivePage();
  const { selected } = page;

  const metricValues = [
    String(page.metrics.pendingReworks),
    String(page.metrics.archiveCount),
    String(page.metrics.swatchCount),
    `${page.metrics.completionRate}%`,
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        {["待返修", "纹样档案", "色卡数量", "完工率"].map((metric, index) => (
          <article key={metric}>
            <small>{metric}</small>
            <strong>{metricValues[index]}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>产地筛选</h2>
          <div className="chips">
            {page.origins.map((item) => (
              <button
                key={item}
                className={item === page.origin ? "chip active" : "chip"}
                onClick={() => page.setOrigin(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h2 className="aside-subtitle">档案列表</h2>
          <div className="archive-list">
            {page.filtered.map((archive) => (
              <button
                key={archive.id}
                className={
                  archive.id === selected?.id ? "archive-item active" : "archive-item"
                }
                onClick={() => page.selectArchive(archive.id)}
              >
                <b>{archive.id}</b>
                <span>
                  {archive.origin} · {archive.era}
                </span>
                {archive.reworks.some((r) => r.closedAt === null) && (
                  <i className="badge badge-rework">返修中</i>
                )}
              </button>
            ))}
            {page.filtered.length === 0 && <p className="empty">该产地暂无档案</p>}
          </div>
        </aside>

        {selected && (
          <section className="panel detail-panel">
            <div className="heading">
              <div>
                <p>
                  {selected.origin} · {selected.material} · {selected.dyeType}
                </p>
                <h2>
                  {selected.id}
                  <span className={`badge status-${page.selectedStatus}`}>
                    {page.selectedStatus}
                  </span>
                </h2>
              </div>
              <button
                className="primary"
                onClick={page.advanceStep}
                disabled={page.pendingStepCount === 0 || selected.archived}
              >
                {page.pendingStepCount > 0
                  ? `推进下一工序（余 ${page.pendingStepCount}）`
                  : "工序已全部完成"}
              </button>
            </div>

            <div className="info-grid">
              <div>
                <small>年代</small>
                <span>{selected.era}</span>
              </div>
              <div>
                <small>结密度</small>
                <span>{selected.knotDensity}</span>
              </div>
              <div>
                <small>首次验收</small>
                <span>{selected.acceptedAt ?? "未验收"}</span>
              </div>
              <div>
                <small>二次验收</small>
                <span>{selected.secondAcceptedAt ?? "—"}</span>
              </div>
              <div>
                <small>返修窗口</small>
                <span>
                  {page.windowLeft === null
                    ? "未验收"
                    : page.windowLeft >= 0
                      ? `剩余 ${page.windowLeft} 天`
                      : "已超期"}
                </span>
              </div>
              <div>
                <small>备注</small>
                <span>{selected.note}</span>
              </div>
            </div>

            <div className="detail-columns">
              <div>
                <h3>纹样局部标记图</h3>
                <div className="pattern-map">
                  {selected.damageAreas.map((area) => (
                    <span
                      key={area.id}
                      className="marker"
                      style={{ left: `${area.x}%`, top: `${area.y}%` }}
                      title={area.name}
                    >
                      {area.name}
                    </span>
                  ))}
                </div>

                <h3>材料色卡</h3>
                <div className="swatches">
                  {selected.swatches.map((swatch) => (
                    <span key={swatch.id} className="swatch">
                      <i style={{ background: swatch.hex }} />
                      {swatch.name}
                      <em>{swatch.used ? "已用·不返还" : "未用"}</em>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3>工序进度</h3>
                <ol className="steps">
                  {selected.steps.map((step, index) => (
                    <li key={step.id} className={step.status}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>{step.name}</span>
                      {page.stepHasOpenRework(step.id) && (
                        <i className="badge badge-rework">返修中</i>
                      )}
                      <em>{step.status === "done" ? "已完成" : "待返工"}</em>
                    </li>
                  ))}
                </ol>

                <h3>返修记录</h3>
                <div className="reworks">
                  {selected.reworks.length === 0 && <p className="empty">暂无返修记录</p>}
                  {selected.reworks.map((rework) => {
                    const step = selected.steps.find((s) => s.id === rework.stepId);
                    const area = selected.damageAreas.find(
                      (d) => d.id === rework.damageAreaId
                    );
                    return (
                      <article key={rework.id}>
                        <b>{rework.id}</b>
                        <p>
                          {step?.name ?? rework.stepId} · {area?.name ?? "未知破损区"} ·{" "}
                          {rework.reason}
                        </p>
                        <small>
                          {rework.createdAt} 开立
                          {rework.closedAt ? ` · ${rework.closedAt} 结单` : " · 未结"}
                        </small>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rework-form">
              <h3>发起返修（验收后 7 天内，单工序）</h3>
              <div className="field-grid">
                <label>
                  <span>返修工序</span>
                  <select
                    value={page.form.stepId}
                    onChange={(e) => page.updateForm({ stepId: e.target.value })}
                  >
                    <option value="">选择工序</option>
                    {selected.steps.map((step) => (
                      <option key={step.id} value={step.id}>
                        {step.name}
                        {page.stepHasOpenRework(step.id) ? "（已有未结返修）" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>关联破损区（限本档案）</span>
                  <select
                    value={page.form.damageAreaId}
                    onChange={(e) => page.updateForm({ damageAreaId: e.target.value })}
                  >
                    <option value="">选择破损区</option>
                    {selected.damageAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-wide">
                  <span>返修原因</span>
                  <input
                    placeholder="填写返修原因"
                    value={page.form.reason}
                    onChange={(e) => page.updateForm({ reason: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button className="primary" onClick={page.submitRework}>
                  提交返修单
                </button>
                {page.rejection && <p className="message error">✕ {page.rejection}</p>}
                {page.notice && <p className="message ok">✓ {page.notice}</p>}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
