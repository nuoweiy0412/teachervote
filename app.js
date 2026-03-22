import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = "https://lyhxlpfxnppgoceaoujr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6Joyu6hVOz0Ce6Tu5wgGWQ_aETQ5_7A";
const TOTAL_VOTERS = 15;
const REQUIRED_VOTES = 10;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const teachersEl = document.getElementById("teachers");
const counterEl = document.getElementById("counter");
const submitBtn = document.getElementById("submitBtn");
const voterCodeEl = document.getElementById("voterCode");
const messageEl = document.getElementById("message");
const progressEl = document.getElementById("progress");
const resultsEl = document.getElementById("results");
let teachers = [];
let selected = new Set();
function setMessage(text) {
  messageEl.textContent = text || "";
}
function renderTeachers() {
  teachersEl.innerHTML = "";
  teachers.forEach((t) => {
    const item = document.createElement("label");
    item.className = "teacher";
    item.innerHTML = `
      <input type="checkbox" data-id="${t.id}" />
      <span>${t.name}</span>
    `;
    const checkbox = item.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (selected.size >= REQUIRED_VOTES) {
          checkbox.checked = false;
          return;
        }
        selected.add(t.id);
      } else {
        selected.delete(t.id);
      }
      updateCounter();
    });
    teachersEl.appendChild(item);
  });
}
function updateCounter() {
  counterEl.textContent = `已选 ${selected.size} / ${REQUIRED_VOTES}`;
  submitBtn.disabled = selected.size !== REQUIRED_VOTES;
}
async function loadTeachers() {
  const { data, error } = await supabase
    .from("teachers")
    .select("id,name")
    .order("name", { ascending: true });
  if (error) {
    setMessage("加载老师名单失败。");
    return;
  }
  teachers = data || [];
  renderTeachers();
  updateCounter();
}
async function loadProgress() {
  const { data, error } = await supabase.rpc("get_progress", {
    p_total: TOTAL_VOTERS,
  });
  if (error) {
    progressEl.textContent = "加载进度失败。";
    return;
  }
  progressEl.textContent = `${data.current} / ${data.total} 已投票`;
}
async function loadResults() {
  const { data, error } = await supabase.rpc("get_results", {
    p_total: TOTAL_VOTERS,
  });
  if (error) {
    resultsEl.textContent = "加载结果失败。";
    return;
  }
  if (!data.ready) {
    resultsEl.textContent = `未公布（${data.current}/${data.total} 已投票）`;
    return;
  }
  const rows = data.results || [];
  resultsEl.innerHTML = rows
    .map((r) => `<div>${r.name}：${r.votes} 票</div>`)
    .join("");
}
submitBtn.addEventListener("click", async () => {
  const code = voterCodeEl.value.trim().toUpperCase();
  if (!code) {
    setMessage("请输入投票码。");
    return;
  }
  setMessage("正在提交...");
  const { data } = await supabase.rpc("submit_ballot", {
    p_voter_code: code,
    p_teacher_ids: Array.from(selected),
  });
  if (!data || !data.ok) {
    const err = data?.error || "UNKNOWN";
    setMessage(`提交失败：${err}`);
    return;
  }
  setMessage("提交成功。");
  selected.clear();
  renderTeachers();
  updateCounter();
  await loadProgress();
  await loadResults();
});
await loadTeachers();
await loadProgress();
await loadResults();
