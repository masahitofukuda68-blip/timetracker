const defaultTasks = [
  { id: 1, name: '企画書の構成を考える', estimate: '25分', xp: 50, done: false },
  { id: 2, name: 'メールを整理する', estimate: '15分', xp: 30, done: false },
  { id: 3, name: '読書をする', estimate: '30分', xp: 60, done: false }
];

const stored = JSON.parse(localStorage.getItem('focusly-state') || 'null');
const state = stored || { xp: 0, streak: 0, tasks: defaultTasks, history: [], week: [35, 55, 30, 75, 44, 18, 0] };
let activeTaskId = null;
let timerStartedAt = null;
let elapsedBeforePause = 0;
let timerInterval = null;

const $ = (id) => document.getElementById(id);
const save = () => localStorage.setItem('focusly-state', JSON.stringify(state));
const formatTime = (seconds) => [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
const currentElapsed = () => elapsedBeforePause + (timerStartedAt ? Math.floor((Date.now() - timerStartedAt) / 1000) : 0);

function renderTasks() {
  const list = $('taskList');
  list.innerHTML = state.tasks.length ? state.tasks.map((task) => `
    <label class="task-item ${task.done ? 'completed' : ''}">
      <input class="task-check" type="checkbox" data-task-id="${task.id}" ${task.done ? 'checked' : ''}>
      <span class="task-content"><span class="task-name">${task.name}</span><span class="task-meta">目安 ${task.estimate}</span></span>
      <span class="task-xp">+${task.xp} XP</span>
    </label>`).join('') : '<div class="empty-state">タスクがありません。新しいクエストを追加しましょう。</div>';
  list.querySelectorAll('.task-check').forEach((input) => input.addEventListener('change', () => completeTask(Number(input.dataset.taskId), input.checked)));
}

function renderRewards() {
  const level = Math.floor(state.xp / 100) + 1;
  const progress = state.xp % 100;
  $('xpNumber').textContent = state.xp;
  $('levelNumber').textContent = level;
  $('levelLabel').textContent = String(level).padStart(2, '0');
  $('xpTrackFill').style.width = `${progress}%`;
  $('nextLevelText').textContent = `あと ${100 - progress} XP`;
  $('streakCount').textContent = `${state.streak}日`;
  $('rewardMessage').textContent = state.xp ? `レベル ${level} まであと少し。今日の集中を積み上げよう。` : '最初のクエストを完了して、XPを手に入れよう。';
}

function renderHistory() {
  $('historyList').innerHTML = state.history.length ? state.history.slice(0, 6).map((item) => `<div class="history-item"><strong>${item.name}</strong><span>${item.date}　${formatTime(item.seconds)}　+${item.xp} XP</span></div>`).join('') : '<div class="empty-state">達成したタスクがここに表示されます。</div>';
  const total = state.history.reduce((sum, item) => sum + item.seconds, 0);
  $('totalTimeLabel').textContent = `合計 ${Math.floor(total / 3600)}時間${Math.floor(total / 60) % 60}分`;
}

function renderWeek() { $('weekChart').innerHTML = state.week.map((value, index) => `<span class="bar ${index === 4 ? 'active' : ''}" style="height:${Math.max(value, 8)}%"></span>`).join(''); }
function renderTimer() { $('timerDisplay').textContent = formatTime(currentElapsed()); $('timerTrackFill').style.width = `${Math.min(currentElapsed() / 1500 * 100, 100)}%`; }
function showToast(message) { const toast = $('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }

function selectTask(id) { activeTaskId = id; const task = state.tasks.find((item) => item.id === id); $('activeTaskName').textContent = task ? task.name : 'タスクを選んで始めよう'; }
function completeTask(id, checked) {
  const task = state.tasks.find((item) => item.id === id); if (!task) return;
  task.done = checked;
  if (checked) { state.xp += task.xp; state.streak = Math.max(state.streak, 1); showToast(`「${task.name}」達成！ +${task.xp} XP`); }
  else state.xp = Math.max(0, state.xp - task.xp);
  save(); renderTasks(); renderRewards();
}

function stopTimer(markComplete = false) {
  const seconds = currentElapsed(); clearInterval(timerInterval); timerInterval = null; timerStartedAt = null; elapsedBeforePause = seconds; $('startButtonText').textContent = 'タイマーを再開'; $('timerStatus').textContent = 'PAUSED'; $('stopButton').disabled = !seconds;
  if (markComplete && activeTaskId && seconds > 0) { const task = state.tasks.find((item) => item.id === activeTaskId); if (task) { state.xp += task.xp + (seconds >= 1500 ? 25 : 0); state.streak = Math.max(state.streak, 1); state.history.unshift({ name: task.name, seconds, xp: task.xp + (seconds >= 1500 ? 25 : 0), date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }) }); task.done = true; save(); renderTasks(); renderRewards(); renderHistory(); showToast(`集中完了！ +${task.xp + (seconds >= 1500 ? 25 : 0)} XP`); } }
}

$('startButton').addEventListener('click', () => { if (!activeTaskId) { selectTask(state.tasks.find((task) => !task.done)?.id); if (!activeTaskId) return showToast('まずタスクを追加してください'); } if (timerStartedAt) { stopTimer(); } else { timerStartedAt = Date.now(); $('startButtonText').textContent = '一時停止'; $('timerStatus').textContent = 'FOCUSING'; $('stopButton').disabled = false; timerInterval = setInterval(renderTimer, 1000); } });
$('stopButton').addEventListener('click', () => stopTimer(true));
$('taskList').addEventListener('click', (event) => { const item = event.target.closest('.task-item'); if (item && !event.target.classList.contains('task-check')) selectTask(Number(item.querySelector('input').dataset.taskId)); });
function closeTaskModal() { $('taskModal').hidden = true; }
$('addTaskButton').addEventListener('click', () => { $('taskModal').hidden = false; $('taskNameInput').focus(); });
$('closeModalButton').addEventListener('click', closeTaskModal);
$('taskModal').addEventListener('click', (event) => { if (event.target === $('taskModal')) closeTaskModal(); });
$('taskForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get('name')).trim();
  const estimate = Number(form.get('estimate'));
  const xp = Number(form.get('xp'));
  if (!name || !Number.isInteger(estimate) || estimate < 1 || !Number.isInteger(xp) || xp < 1) return;
  state.tasks.push({ id: Date.now(), name, estimate: `${estimate}分`, xp, done: false });
  save(); renderTasks(); event.currentTarget.reset(); $('taskEstimateInput').value = 25; $('taskXpInput').value = 50; closeTaskModal(); showToast('新しいクエストを追加しました');
});
$('resetDataButton').addEventListener('click', () => { if (confirm('すべての記録をリセットしますか？')) { localStorage.removeItem('focusly-state'); location.reload(); } });
$('todayLabel').textContent = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
renderTasks(); renderRewards(); renderHistory(); renderWeek(); renderTimer();