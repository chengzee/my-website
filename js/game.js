/* ============================
   FAB 工程師模擬器 — 遊戲引擎
   v2.0 — 月制 + 考績 + 關聯任務 + 去重
   ============================ */
(function () {
  'use strict';

  /* ===== CONFIG ===== */
  const CFG = {
    TICK_MS: 500,           // 500ms per tick
    TICK_ADVANCE: 4,        // 4 game-minutes per tick → 1 day ≈ 60s real → 22 days ≈ 22 min
    DAY_START: 480,         // 08:00
    DAY_END: 960,           // 16:00
    MONTH_DAYS: 22,         // 22 working days per month
    BASE_BONUS: 50000,
    TASK_INTERVAL_MIN: 3,   // real seconds between new tasks
    TASK_INTERVAL_MAX: 7,
    MAX_QUEUE: 6,
    CHAIN_CHANCE: 25,
    SPECIAL_CHANCE: 18,
    // 考績門檻 (completion rate %)
    RATING_S: 88,   // S 級：>=88%
    RATING_A: 72,   // A 級：>=72%
    RATING_B: 55,   // B 級：>=55%
    // 考績獎金
    RATING_BONUS: { S: 80000, A: 40000, B: 15000, C: 0 },
  };

  const TYPE_WEIGHTS = { repair: 35, call: 25, report: 20, meeting: 15, emergency: 5 };
  const TYPE_META = {
    repair:    { icon: '🔧', label: '機台維修', color: '#336699' },
    emergency: { icon: '🚨', label: '緊急停機', color: '#F44336' },
    call:      { icon: '📞', label: '來電通知', color: '#FF9800' },
    report:    { icon: '📋', label: '撰寫報告', color: '#4CAF50' },
    meeting:   { icon: '🤝', label: '廠商會議', color: '#9C27B0' },
  };

  const DIFFICULTY = {
    1: { stars: '⭐',           timeMult: 1.5, bonusMult: 0.7, penaltyMult: 0.5 },
    2: { stars: '⭐⭐',         timeMult: 1.2, bonusMult: 1.0, penaltyMult: 0.8 },
    3: { stars: '⭐⭐⭐',       timeMult: 1.0, bonusMult: 1.3, penaltyMult: 1.2 },
    4: { stars: '⭐⭐⭐⭐',     timeMult: 0.8, bonusMult: 1.8, penaltyMult: 1.5 },
  };

  /* ===== UTILITIES ===== */
  let _id = 0;
  function uid() { return ++_id; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
  function chance(pct) { return Math.random() * 100 < pct; }
  function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = randInt(0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fmt$(n) { return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString(); }
  function fmtTime(mins) { const h = Math.floor(mins / 60); const m = mins % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
  function fmtSec(s) { const m = Math.floor(s / 60); const ss = s % 60; return `${m}:${String(ss).padStart(2, '0')}`; }
  function fmtPct(n) { return Math.round(n) + '%'; }

  /* ===== DATA POOLS ===== */
  const MACHINES = [
    { name: 'CVD',     parts: ['Chamber A', 'Chamber B', 'Showerhead', 'Susceptor', 'Gas Box'] },
    { name: 'PVD',     parts: ['Target', 'Magnetron', 'Shield Kit', 'Clamp Ring', 'Shutter'] },
    { name: 'Etch',    parts: ['Upper Electrode', 'Lower Electrode', 'Focus Ring', 'ESC', 'Gas Ring'] },
    { name: 'Litho Track', parts: ['Coater Cup', 'Developer Nozzle', 'Bake Plate #3', 'EBR Module', 'Robot Arm'] },
    { name: 'CMP',     parts: ['Platen #1', 'Carrier Head', 'Conditioner Disk', 'Slurry Line', 'Retaining Ring'] },
    { name: 'Diffusion', parts: ['Furnace Tube', 'Quartz Boat', 'Injector', 'Heater Zone 3', 'Gas Panel'] },
    { name: 'Implanter', parts: ['Ion Source', 'Analyzer Magnet', 'Scan System', 'Faraday Cup', 'End Station'] },
  ];
  const OPERATORS = ['李小姐', '張先生', '陳班長', '王大哥', '林學妹', '吳工程師', '黃組長', '劉領班', '鄭技術員', '許班長'];
  const MANAGERS = ['林經理', '王課長', '陳副理', '張處長', '周主任', '蔡經理'];
  const VENDORS = [
    { co: 'Applied Materials', person: '陳經理' }, { co: 'TEL', person: '鈴木先生' },
    { co: 'LAM Research', person: 'Kevin' }, { co: 'ASML', person: '趙工程師' },
    { co: 'KLA', person: 'David' }, { co: 'Screen', person: '田中先生' },
    { co: 'Hermes Epitek', person: '林 FAE' }, { co: 'Edwards', person: '何先生' },
  ];
  const MOODS = ['著急地', '冷靜地', '不耐煩地', '慌張地', '無奈地', '焦慮地', '語氣平淡地', '壓低聲音', '嘆了口氣', '有點緊張地'];
  const ERROR_CODES = ['E-1742', 'E-2081', 'E-3155', 'E-0847', 'E-4293', 'E-1156', 'E-5520', 'E-0392', 'E-6018', 'E-7764', 'E-8801', 'E-2347', 'E-0015', 'E-9962'];
  const RECIPES = ['SiN Dep', 'SiO2 Etch', 'TiN PVD', 'PR Coat', 'W-CMP', 'Thermal Ox', 'B+ Implant', 'Cu Seed PVD', 'ALD HfO2', 'Poly Etch', 'HDP CVD', 'TEOS Dep', 'Metal Etch', 'Si3N4 LPCVD'];

  const SPECIAL_EVENTS = [
    { text: '🍕 Pizza Day！廠商送披薩來了，心情大好！', effect: 'bonusMult', value: 1.5, label: '獎金 ×1.5' },
    { text: '👔 老闆巡廠！時間壓力加倍！', effect: 'timeMult', value: 0.7, label: '時限 ×0.7' },
    { text: '🌧️ 暴雨導致交通大亂，半數工程師遲到！', effect: 'spawnMult', value: 0.6, label: '任務更密集' },
    { text: '☕ 值班同事帶了好喝的咖啡，效率提升！', effect: 'bonusMult', value: 1.2, label: '獎金 ×1.2' },
    { text: '📢 ISO 稽核預告：所有報告類獎金加倍！', effect: 'reportBonus', value: 2.0, label: '報告獎金 ×2' },
    { text: '🔌 UPS 測試中，緊急事件機率上升！', effect: 'emergencyUp', value: 15, label: '緊急事件↑' },
    { text: '🎂 今天有同事生日！大家心情不錯～', effect: 'bonusMult', value: 1.1, label: '獎金 ×1.1' },
    { text: '🔥 連續 3 天產能沒達標，主管壓力山大！', effect: 'timeMult', value: 0.8, label: '時限 ×0.8' },
    { text: '🏆 上個月你的 team 拿了最佳設備獎！士氣高漲！', effect: 'bonusMult', value: 1.3, label: '獎金 ×1.3' },
    { text: '🚿 消防灑水測試，部分區域暫時封鎖。', effect: 'spawnMult', value: 0.7, label: '任務略密集' },
    { text: '🌙 今天是大夜班！精神不太好，但獎金有加給。', effect: 'bonusMult', value: 1.4, label: '夜班加給 ×1.4' },
    { text: '😤 主管今天心情極差——上個月 KPI 被老闆點名了。', effect: 'timeMult', value: 0.75, label: '時限 ×0.75' },
    { text: '🚽 你已經忍了 3 個小時沒上廁所...專注力開始下降。', effect: 'timeMult', value: 0.85, label: '專注力↓' },
    { text: '🌃 連續第 3 天值小夜班，你在走廊上差點睡著。', effect: 'timeMult', value: 0.8, label: '疲憊 時限 ×0.8' },
    { text: '💨 隔壁 area 在做 chamber clean，空氣中有股怪味...', effect: 'spawnMult', value: 0.8, label: '注意力分散' },
  ];


  /* ===== ANTI-REPEAT SYSTEM ===== */
  const recentSkeletonIds = [];
  const MAX_RECENT = 8;

  function pickSkeleton(skeletons) {
    // Build pool excluding recently used skeletons
    const available = skeletons.filter((_, i) => !recentSkeletonIds.includes(i));
    const pool = available.length > 0 ? available : skeletons;
    const idx = skeletons.indexOf(pick(pool));
    recentSkeletonIds.push(idx);
    if (recentSkeletonIds.length > MAX_RECENT) recentSkeletonIds.shift();
    return skeletons[idx];
  }


  /* ===== SCENARIO GENERATORS ===== */

  function randMachine() { const m = pick(MACHINES); return { machine: m.name, part: pick(m.parts) }; }
  function randVars() { return { ...randMachine(), operator: pick(OPERATORS), manager: pick(MANAGERS), mood: pick(MOODS), errorCode: pick(ERROR_CODES), recipe: pick(RECIPES), vendor: pick(VENDORS) }; }

  // Context-aware narrative additions based on previous tasks
  function contextPrefix() {
    if (state.dayHistory.length === 0) return '';
    const last = state.dayHistory[state.dayHistory.length - 1];
    const prefixes = [];
    if (last.result === 'failed' || last.result === 'timeout') {
      prefixes.push(
        '（剛才的失敗讓你心情有點沉重...）\n\n',
        '（走廊上隱約聽到有人在討論你剛剛的失誤...）\n\n',
        '（主管剛剛看了你一眼，你不確定他知不知道...）\n\n',
      );
    } else if (last.result === 'success' && last.type === 'emergency') {
      prefixes.push(
        '（剛解完緊急停機的餘韻還在，你的手還有點抖...）\n\n',
        '（同事們投來欽佩的眼光——剛剛那個停機你處理得真好！）\n\n',
      );
    } else if (state.completed >= 5 && state.failed === 0) {
      prefixes.push(
        '（今天狀態不錯，連續成功中！）\n\n',
        '（你在走廊上走路有風，大家都知道你今天表現很好。）\n\n',
      );
    }
    // Night shift / bathroom / fatigue mood
    if (state.specialEvent) {
      if (state.specialEvent.text.includes('大夜班')) {
        prefixes.push(
          '（凌晨 3 點的無塵室，只有機台的嗡嗡聲陪著你...）\n\n',
          '（你打了第 4 個哈欠。無塵室的白色燈光讓人分不清白天黑夜...）\n\n',
          '（走廊上空蕩蕩的，只有你和遠處另一個工程師的身影...）\n\n',
        );
      } else if (state.specialEvent.text.includes('小夜班')) {
        prefixes.push(
          '（又是小夜班。你想起上一次看到夕陽是什麼時候...）\n\n',
          '（進出無塵室第 6 次了，防塵衣裡面全是汗...）\n\n',
        );
      } else if (state.specialEvent.text.includes('廁所')) {
        prefixes.push(
          '（你的膀胱在抗議，但手上這個任務不處理完走不開...）\n\n',
          '（你夾緊雙腿站在機台前，試圖集中注意力...）\n\n',
          '（「忍住...再忍一下...做完這個就去...」）\n\n',
        );
      }
    }
    return prefixes.length > 0 ? pick(prefixes) : '';
  }

  // Reference previous tasks in narratives
  function maybeReferPrevious(v) {
    if (state.dayHistory.length < 2) return '';
    const prevRepairs = state.dayHistory.filter(t => t.type === 'repair' && (t.result === 'success' || t.result === 'partial'));
    const prevFails = state.dayHistory.filter(t => t.result === 'failed' || t.result === 'timeout');
    const refs = [];
    if (prevRepairs.length > 0) {
      const r = pick(prevRepairs);
      refs.push(`\n（你想起今天稍早修過的「${r.title}」...不知道有沒有關聯）`);
    }
    if (prevFails.length > 0 && chance(30)) {
      const f = pick(prevFails);
      refs.push(`\n💬 ${v.manager}：「對了，早上「${f.title}」的事我還沒忘，這次別再出差錯了。」`);
    }
    return refs.length > 0 ? pick(refs) : '';
  }


  /* --- REPAIR Scenarios --- */
  const REPAIR_SKELETONS = [
    (v) => ({
      title: `${v.machine} ${v.part} 溫度異常`,
      narrative: `${contextPrefix()}💬 ${v.operator}（${v.mood}）：\n「工程師你好，${v.machine} ${v.part} 突然跳 alarm ${v.errorCode}，溫度一直飆高！\n${v.recipe} recipe 跑到一半就停了，wafer 還卡在裡面...」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: '你判斷最可能的原因是？', options: [
          { text: '加熱器模組故障（Heater malfunction）', quality: 'best', response: `✅ 檢查確認 ${v.part} 加熱器 PID 控制異常，溫度正回授失效。方向正確！` },
          { text: '溫度感測器漂移（TC drift）', quality: 'good', response: '⚠️ TC 讀數有些偏差，但不是根因。你多花了些時間排查...' },
          { text: '冷卻水流量不足', quality: 'bad', response: '❌ 冷卻水流量正常，方向判斷錯誤。寶貴的時間流失了...' },
          { text: '先 reset alarm 繼續跑看看', quality: 'risky', response: '⚡ 你 reset 了 alarm...機台暫時恢復，但溫度曲線還是不太對。賭一把？' },
        ]},
        { prompt: '確認原因後，你決定怎麼處理？', options: [
          { text: '更換加熱器模組 + 校正', quality: 'best', response: `✅ 更換完成，${v.part} 溫度恢復正常，wafer 順利取出。做得好！` },
          { text: '調整 PID 參數嘗試補償', quality: 'good', response: '⚠️ 參數調整後暫時穩住了，但這只是 workaround...' },
          { text: '通知主管安排整台 PM', quality: 'good', response: '👍 主管同意安排 PM。穩扎穩打，但今天的 lot 就延了。' },
          { text: '先把 wafer 取出再說', quality: 'risky', response: '⚡ 你手動開啟 chamber 取出 wafer...希望沒有 particle 問題。' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} Particle 超標`,
      narrative: `${contextPrefix()}💬 ${v.operator}（${v.mood}）：\n「${v.machine} 跑完 ${v.recipe}，particle check 爆了！\n之前都好好的，這一批突然超標 3 倍...」`,
      steps: [
        { prompt: '你懷疑 particle 來源是？', options: [
          { text: `${v.part} 內部汙染或磨損`, quality: 'best', response: `✅ 拆開 ${v.part} 一看，果然有明顯的沉積物剝落。找到源頭了！` },
          { text: 'Wafer 進機台前就有汙染', quality: 'bad', response: '❌ 追查前段，wafer 進站前是乾淨的。不是這個原因。' },
          { text: '潔淨室環境異常', quality: 'good', response: '⚠️ 潔淨室 particle counter 正常，但你投入了時間確認排除。' },
          { text: '不管了直接跑 seasoning wafer', quality: 'risky', response: '⚡ 你跑了幾片 dummy wafer 試圖清洗...數值有降但還在邊緣。' },
        ]},
        { prompt: '找到來源後，怎麼處理？', options: [
          { text: '拆機清洗 + 更換耗材', quality: 'best', response: '✅ 完整清洗後 particle 回到 spec 內。徹底解決！' },
          { text: '只做快速 wipe down', quality: 'good', response: '⚠️ 快速清洗後數值好轉但不穩定，可能還會復發...' },
          { text: '記錄數據先繼續跑看看', quality: 'bad', response: '❌ 報告出去後被品保抓到，wafer 判 hold 了...' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} Robot 異常`,
      narrative: `${contextPrefix()}💬 ${v.operator}（${v.mood}）：\n「工程師快來！${v.machine} 的 robot arm 動作卡住了！\n正在傳片的時候突然停下來，alarm ${v.errorCode}。\n裡面還有客戶 lot 的 wafer......」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: '你到現場後第一步：', options: [
          { text: '先看 robot alarm log 確認故障點', quality: 'best', response: '✅ Log 顯示 axis-2 encoder error，定位偏移 0.3mm。原因明確！' },
          { text: '目視檢查 robot arm 有無碰撞痕跡', quality: 'good', response: '⚠️ 外觀看起來沒問題，需要進一步查 log 才能定位...' },
          { text: '直接 re-teach robot position', quality: 'risky', response: '⚡ 你嘗試重新 teach point...但不確定偏移原因，可能治標不治本。' },
          { text: '先手動把 wafer 取出來', quality: 'good', response: '⚠️ 小心翼翼地手動取出 wafer，至少保住了這片。但 root cause 還沒查。' },
        ]},
        { prompt: '根據診斷結果，你的處置是：', options: [
          { text: '更換 encoder + 重新校正', quality: 'best', response: '✅ 更換 encoder 後重新 teach & verify，robot 動作恢復正常！' },
          { text: '清潔 encoder 磁頭 + re-teach', quality: 'good', response: '⚠️ 清潔後暫時恢復了，但 encoder 壽命可能所剩不多。' },
          { text: '只做 re-teach 算了', quality: 'bad', response: '❌ 兩小時後同樣問題再次發生，白忙一場...' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} 真空洩漏`,
      narrative: `${contextPrefix()}💬 ${v.operator}（${v.mood}）：\n「${v.machine} ${v.part} 抽真空抽不下去！\nBase pressure 一直卡在 5E-4 Torr，正常應該要到 1E-6 以下。\n${v.recipe} 已經 queue 了好幾批在等...」`,
      steps: [
        { prompt: '你要怎麼定位洩漏點？', options: [
          { text: '用 He leak detector 逐段測試', quality: 'best', response: '✅ He leak detector 在 chamber lid O-ring 位置偵測到明顯訊號。就是這裡！' },
          { text: '噴 IPA 觀察壓力變化', quality: 'good', response: '⚠️ IPA 噴灑後壓力有變動但不明確，範圍太大了...' },
          { text: '先換一整組 O-ring 試試', quality: 'good', response: '⚠️ 全換了...比較暴力但至少能排除 O-ring 問題。' },
          { text: '可能是 gauge 壞了，先換 gauge', quality: 'bad', response: '❌ 換了 gauge，讀值一樣。不是 gauge 的問題。' },
        ]},
        { prompt: '找到洩漏點後：', options: [
          { text: '更換受損 O-ring + 清潔密封面', quality: 'best', response: '✅ 更換後 base pressure 順利降到 8E-7 Torr。完美！' },
          { text: '塗 Apiezon 真空油脂暫時封堵', quality: 'risky', response: '⚡ 真空油脂暫時把壓力壓下來了...不知道能撐多久。' },
          { text: '通知主管安排完整 PM', quality: 'good', response: '👍 PM 排程確認。雖然多停一天但能徹底處理所有密封件。' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} RF 打不起來`,
      narrative: `${contextPrefix()}💬 ${v.operator}（${v.mood}）：\n「${v.machine} 的 RF power 點不起來！\n${v.recipe} 需要用 RF 做 plasma，現在完全沒反應。\nalarm code ${v.errorCode}，reflected power 很高...」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: '你的第一步排查：', options: [
          { text: '檢查 matching network 的調諧位置', quality: 'best', response: '✅ Auto-tune position 明顯偏移，matcher capacitor 可能壞了。方向正確！' },
          { text: '查看 RF generator 的 output power', quality: 'good', response: '⚠️ Generator 有 output，所以不是 generator 的問題。但排除了一個方向。' },
          { text: '可能是 cable 接觸不良', quality: 'good', response: '⚠️ Cable 看起來 OK，但你花了時間拆開確認。' },
          { text: '重開 RF power supply 試試', quality: 'risky', response: '⚡ 重開了...第一次點火成功了！但不知道根因還在不在...' },
        ]},
        { prompt: '定位問題後，你的處理方式：', options: [
          { text: '更換 matching network 模組', quality: 'best', response: '✅ 更換後 RF 穩定點火，reflected power < 1W。完美修復！' },
          { text: '嘗試手動調整 matcher position', quality: 'good', response: '⚠️ 手動調整後勉強能用，但 auto-tune 不太穩定...' },
          { text: '先用 manual mode 跑看看', quality: 'risky', response: '⚡ manual mode 可以跑但參數不穩定，品質有疑慮...' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} 冷卻水異常`,
      narrative: `${contextPrefix()}💬 ${v.operator}（${v.mood}）：\n「${v.machine} ${v.part} 的冷卻水溫度升到 ${randInt(28, 35)}°C 了！\n正常應該是 ${randInt(18, 22)}°C，flow rate 也在掉...\n${v.recipe} 的 uniformity 已經開始偏了。」`,
      steps: [
        { prompt: '你的判斷：', options: [
          { text: '冷卻水管路可能有堵塞或汽泡', quality: 'best', response: '✅ 排水口有明顯的水垢碎片沖出！管路部分堵塞確認。' },
          { text: 'Chiller 本身可能故障', quality: 'good', response: '⚠️ Chiller 設定正常，出水溫度 OK...是下游到機台端的問題。' },
          { text: '可能只是環境溫度太高', quality: 'bad', response: '❌ 潔淨室溫控正常 22°C，不是環境的問題。' },
          { text: '先降低製程溫度來補償', quality: 'risky', response: '⚡ 調了製程溫度...product team 可能會有意見。' },
        ]},
        { prompt: '確認是管路堵塞後：', options: [
          { text: '酸洗管路 + 更換 water filter', quality: 'best', response: '✅ 酸洗後流量恢復正常，水溫也降回 20°C。徹底解決！' },
          { text: '先更換 filter 看看', quality: 'good', response: '⚠️ Filter 換了有些改善，但深層水垢還在...' },
          { text: '用高壓沖洗試試', quality: 'risky', response: '⚡ 高壓沖洗打通了，但一些水垢碎片可能進入了支路...' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} Particle 懸案 — 主管震怒`,
      narrative: `${contextPrefix()}💬 ${v.manager}（鐵青著臉）：\n「${v.machine} 的 particle 問題拖了快 ${randInt(2, 4)} 週了！每次說修好了又復發！\n你到底有沒有在認真查？！」\n\n💬 ${v.operator}（小聲地）：「剛剛又爆了...比上次更高...」\n\n你感覺到辦公室裡同事們的目光都在偷瞄這邊。${maybeReferPrevious(v)}`,
      steps: [
        { prompt: `${v.manager} 在會議上當著所有人的面質問你。你的態度：`, options: [
          { text: '承認之前的排查方向可能有誤，提出新的系統性檢查計畫', quality: 'best', response: `✅ ${v.manager}：「至少你願意面對。給你 3 天，這次不能再出包了。」\n\n你鬆了一口氣...但壓力更大了。` },
          { text: '解釋每次修復後都有做 particle check，數據當時是 OK 的', quality: 'good', response: `⚠️ ${v.manager}：「那為什麼又復發？你有沒有查 root cause？」\n\n你說的是事實，但主管顯然不滿意。` },
          { text: '指出可能是前段或環境問題，不一定是你的機台', quality: 'risky', response: `⚡ ${v.manager}：「少推卸責任！你負責的機台你不查誰查？」\n\n同事們都低下了頭。氣氛凝到冰點。` },
          { text: '沉默不回應', quality: 'bad', response: `❌ ${v.manager}：「不說話是什麼意思？你是不是根本沒在查！」\n\n最糟的選擇。全場安靜到能聽見空調聲。` },
        ]},
        { prompt: '你重新排查後發現，particle 源頭在一個不容易注意到的位置：', options: [
          { text: '徹底拆解 + 更換所有可疑部件 + 48 小時監控', quality: 'best', response: `✅ 48 小時 particle 完全在 spec 內。這次真的解決了。\n\n${v.manager} 沒有誇你，但至少不再瞪你了。` },
          { text: '只處理找到的源頭，省時間', quality: 'good', response: `⚠️ 好轉了，但你心裡不踏實...不知道會不會又復發。` },
          { text: '寫一份很漂亮的報告交差', quality: 'bad', response: `❌ 一週後又爆了。${v.manager}：「你的考績自己想想。」` },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} 氣體流量偏移`,
      narrative: `${contextPrefix()}💬 SPC 系統自動通知：\n「${v.machine} ${v.part} 的 ${pick(['N2', 'Ar', 'O2', 'CF4', 'CHF3', 'SiH4'])} 流量 Out of Control！\n連續 ${randInt(5, 9)} 點超出 UCL，trend 明顯向${pick(['上', '下'])}偏移。」\n\n💬 ${v.manager}：「你看一下，別讓品保先發現。」`,
      steps: [
        { prompt: '你認為偏移原因最可能是：', options: [
          { text: 'MFC (Mass Flow Controller) 精度衰退', quality: 'best', response: '✅ 跑 MFC verify，讀值確實偏移了 8%。該校正了！' },
          { text: 'Gas line 有 particle 影響流量', quality: 'good', response: '⚠️ 有些微影響但不是主因，MFC 本身也有問題。' },
          { text: '可能是 SPC 誤報', quality: 'bad', response: '❌ 人工量測確認流量確實偏移。不是誤報！' },
          { text: '先調整 recipe flow setpoint 補償', quality: 'risky', response: '⚡ 調了 setpoint...暫時解決但 MFC 問題還在惡化中。' },
        ]},
        { prompt: '確認是 MFC 精度問題後：', options: [
          { text: '更換 MFC + 重新校正所有 gas line', quality: 'best', response: '✅ 全部校正完成，SPC chart 漂亮回到中線！' },
          { text: '送 MFC 去原廠校正', quality: 'good', response: '⚠️ 要等 2 週...先用 manual verify 確保品質。' },
          { text: '調 setpoint 蓋過去', quality: 'bad', response: '❌ 品保發現 recipe 被改了...要解釋為什麼沒走 change control。' },
        ]},
      ]
    }),
  ];

  /* --- EMERGENCY Scenarios --- */
  const EMERGENCY_SKELETONS = [
    (v) => ({
      title: '全區 CDA 壓力驟降',
      narrative: `${contextPrefix()}📞 ${v.manager}（語氣急躁）：\n「CDA 壓力從 6.0 bar 掉到 3.2，整個 ${v.machine} area 的機台全部 interlock 了！\nFAC 說不是他們的問題，你趕快去查！客戶那批 wafer 今天一定要出！」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: '你的第一反應：', options: [
          { text: '先遠端看 SCADA 確認壓力趨勢', quality: 'best', response: '✅ SCADA 顯示壓力在 10 分鐘前開始緩降，像是洩漏而非斷源。鎖定範圍了！' },
          { text: '立刻衝去 Sub-Fab 查 CDA 主管路', quality: 'good', response: '⚠️ 你到了 Sub-Fab，聽到 "嘶嘶" 聲音，但需要時間找到準確位置...' },
          { text: '通知 FAC 值班一起去現場', quality: 'good', response: '⚠️ FAC 人員 10 分鐘後才能到，但至少有專業支援。' },
          { text: '讓 operator 手動 bypass interlock 繼續跑', quality: 'risky', response: '🚨 你 bypass 了 interlock...如果壓力再掉可能會有更嚴重的後果！' },
        ]},
        { prompt: '鎖定 Sub-Fab 管路洩漏後：', options: [
          { text: '隔離漏氣段 + 切換到備用管路', quality: 'best', response: '✅ 切換後壓力快速回升到 5.8 bar，機台陸續恢復！危機解除！' },
          { text: '先用 clamp 夾住漏氣點應急', quality: 'good', response: '⚠️ Clamp 暫時止住了，壓力回到 4.5 bar，勉強能跑但不穩定。' },
          { text: '直接關閉 CDA 主閥等 FAC 來修', quality: 'bad', response: '❌ 關了主閥整區停擺...主管臉都綠了。' },
        ]},
      ]
    }),
    (v) => ({
      title: '化學品洩漏警報',
      narrative: `${contextPrefix()}🚨 廣播系統：\n「注意！${v.machine} area 化學品偵測器觸發，疑似 ${pick(['HF', 'H2SO4', 'NH4OH', 'IPA'])} 洩漏。\n請相關人員立即前往確認！」\n\n💬 ${v.operator}（${v.mood}）：「工程師！味道很重，偵測器一直叫！」`,
      steps: [
        { prompt: '到達現場前你先：', options: [
          { text: '穿好完整 PPE（防護衣+面罩+手套）', quality: 'best', response: '✅ 安全第一！全副武裝後進入現場。EHS 看到你的裝備點了點頭。' },
          { text: '先確認 MSDS 和風向', quality: 'good', response: '⚠️ 確認了化學品特性，但進場稍慢了一些。' },
          { text: '直接跑去現場看情況', quality: 'bad', response: '❌ 沒穿 PPE 就進場，被 EHS 攔下來了！浪費時間。' },
          { text: '先疏散現場所有人員', quality: 'good', response: '✅ 安全意識很好，但需要同時安排人去關閉洩漏源。' },
        ]},
        { prompt: '進入現場後發現是管路接頭處滲漏：', options: [
          { text: '關閉該段管路閥門 + 中和處理', quality: 'best', response: '✅ 關閥後洩漏停止，用中和劑處理殘液。通報 EHS 記錄完成。' },
          { text: '用吸附棉先吸 + 等 FAC 來修', quality: 'good', response: '⚠️ 吸附棉控制住擴散了，但管路還在滴。等 FAC 有點被動...' },
          { text: '嘗試自己鎖緊接頭', quality: 'risky', response: '⚡ 你鎖緊了接頭...洩漏停了，但手套被濺到了一點。' },
        ]},
      ]
    }),
    (v) => ({
      title: '區域 UPS 異常',
      narrative: `${contextPrefix()}💡 照明閃了一下！\n\n📞 ${v.manager}：\n「${v.machine} area 的 UPS 切換異常！有 3 台機台瞬間斷電重開了！\n裡面有 wafer 在跑 ${v.recipe}，不知道有沒有報廢...」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: '你的優先行動：', options: [
          { text: '先確認各機台狀態 + wafer 位置', quality: 'best', response: '✅ 逐台確認：2 台已自動 recovery，1 台 wafer 卡在 transfer 中。' },
          { text: '打給 FAC 確認 UPS 是否穩定', quality: 'good', response: '⚠️ FAC 說 UPS 已切回市電，但你不確定是否還會再跳。' },
          { text: '全部停機等 UPS 問題釐清', quality: 'bad', response: '❌ 全部停了...但其實只有 1 台需要人工介入。' },
          { text: '先搶救卡在裡面的 wafer', quality: 'good', response: '⚠️ 你跑去 recovery wafer，但同時有另一台的 alarm 也在叫...' },
        ]},
        { prompt: 'Wafer 卡在 transfer 的那台機台：', options: [
          { text: '手動歸位 robot + 取出 wafer + 重新 init', quality: 'best', response: '✅ 小心操作，wafer 完好取出。機台重新 init 後恢復正常！' },
          { text: '直接重開機台讓它自己 recovery', quality: 'risky', response: '⚡ 重開了...robot 試圖 recovery 但 wafer 位置不對，差點撞片！' },
          { text: '通報異常，等原廠工程師來處理', quality: 'good', response: '👍 安全但要等 2 小時。主管表情很無奈。' },
        ]},
      ]
    }),
    (v) => ({
      title: '有機溶劑偵測器飆高 — 廠區警報',
      narrative: `${contextPrefix()}🚨 廠區環安系統自動警報：\n「注意！${v.machine} area 有機溶劑偵測器讀值超標！\n目前讀值 ${randInt(35, 120)} ppm（警戒值 25 ppm），持續上升中。」\n\n📧 一封 highlight mail 已自動寄出，收件人包括廠長、處長、課長...\n\n💬 ${v.manager}（氣急敗壞）：「是誰在做什麼？！這封 mail 廠長都看到了！」\n\n你剛才在做 ${pick(['PM 的 chamber clean', 'chiller 管路更換後的 IPA 擦拭', '機台裝機後的清潔', 'O-ring 更換時用了 IPA 擦拭密封面'])}...`,
      steps: [
        { prompt: `${v.manager} 在電話裡大吼：「是你觸發的嗎？！」`, options: [
          { text: '「報告，我剛才在做例行清潔，有使用 IPA，可能是揮發造成的。」', quality: 'best', response: `${v.manager}：「你怎麼不先確認 detector 位置就開始用 IPA！」\n\n誠實承認了。至少後續還有辯護空間...\n但你知道，這個 highlight 已經寄出去了。` },
          { text: '「不是我...我不確定是什麼原因造成的。」', quality: 'bad', response: `❌ ${v.manager} 調了監控和刷卡紀錄...\n「${v.machine} area 只有你有進出紀錄。你要解釋一下嗎？」\n\n撒謊被抓到了。情況更糟了。` },
          { text: '「有可能是附近區域飄過來的。」', quality: 'risky', response: `⚡ ${v.manager}：「FAC 說 airflow 是你那區往外吹的，不是外面飄進來的。」\n\n甩鍋失敗...` },
          { text: '「報告，是我操作的，但這是 SOP 內的程序。」', quality: 'good', response: `⚠️ ${v.manager}：「SOP 有寫要通知 EHS 再用嗎？你有通知嗎？」\n\n你翻了一下 SOP...好像真的有這條。` },
        ]},
        { prompt: `廠長要求寫檢討報告。${v.manager} 把你叫進辦公室：`, options: [
          { text: '「我寫完整事件經過 + 改善對策，需要多少我都配合。」', quality: 'best', response: `${v.manager}：「你自己的部分寫清楚就好。」\n\n言下之意——他會在報告裡把責任推給你。\n你知道這就是 FAB 的遊戲規則...這筆考績黑紀錄跑不掉了。` },
          { text: '「主管，SOP 確實沒有明確規範這個情境...」', quality: 'good', response: `⚠️ ${v.manager}：「SOP 不完善是你不反映的問題。好了，報告明天中午前交。」\n\n好吧...吃烤雞就吃烤雞。` },
          { text: '「這應該是共同責任，PM 排程是團隊決定的...」', quality: 'risky', response: `⚡ ${v.manager}：「你在推責任？操作是你做的，手是你的手。」\n\n你想說什麼但吞回去了。辦公室的空氣像凝固了一樣。` },
          { text: '什麼都不說，默默接受', quality: 'good', response: `${v.manager}：「行了，你心裡有數就好。報告明天給我。」\n\n走出辦公室的時候，同事投來同情的眼神。\n你覺得有點委屈，但這就是設備工程師的日常。` },
        ]},
      ]
    }),
    (v) => ({
      title: '排氣系統異常 — 壓差過低',
      narrative: `${contextPrefix()}🚨 FAC 通報：\n「${v.machine} area 的 local scrubber 壓差從 -30 Pa 降到 -8 Pa！\n正常至少要 -15 Pa 以上，不然有毒氣體可能外洩。\n已經通知 EHS 待命了。」\n\n💬 ${v.operator}：「${v.machine} 還在跑 ${v.recipe}，有排氣問題很危險...」`,
      steps: [
        { prompt: '你的應變措施：', options: [
          { text: '立刻停止所有使用該 scrubber 的製程', quality: 'best', response: '✅ 安全第一！停製程後確認沒有外洩。EHS 認可你的決定。' },
          { text: '先看看是 sensor 故障還是真的壓差不夠', quality: 'good', response: '⚠️ 手持壓差計確認確實偏低...但你多花了幾分鐘確認。' },
          { text: '調高風機轉速試圖補償', quality: 'risky', response: '⚡ 風機轉速拉高了，壓差回到 -14 Pa...but 風機在超載運轉。' },
          { text: '只通知 FAC 處理，自己繼續做別的事', quality: 'bad', response: '❌ EHS 問你為什麼沒有第一時間停製程？被記了一筆...' },
        ]},
        { prompt: 'FAC 到場後發現是 scrubber 濾材堵塞：', options: [
          { text: '協助 FAC 更換濾材 + 確認壓差恢復後再開機', quality: 'best', response: '✅ 濾材更換後壓差恢復 -28 Pa。安全確認後製程恢復！' },
          { text: '讓 FAC 自己處理，你先去忙別的任務', quality: 'good', response: '⚠️ FAC 處理好了，但你沒有做最後確認就離開了，流程上有瑕疵。' },
          { text: '建議先用備用 scrubber 繼續跑', quality: 'good', response: '⚠️ 有備用系統可用，但切換需要時間，有些 lot 還是延了。' },
        ]},
      ]
    }),
  ];

  /* --- CALL Scenarios --- */
  const CALL_SKELETONS = [
    (v) => ({
      title: `${v.vendor.co} — 備品交期確認`,
      narrative: `${contextPrefix()}📞 ${v.vendor.co} ${v.vendor.person}：\n「嘿，上次你們要的那個 ${v.part} 備品，原廠報 lead time 8 週。\n你們能等嗎？不然我有副廠的，一週就到，價錢便宜一半。」`,
      steps: [
        { prompt: '你的回覆：', options: [
          { text: '「等原廠好了，品質比較有保障。」', quality: 'good', response: '📱 「好的，我幫你下單了。8 週後到貨。」\n\n穩妥但如果期間機台壞了就沒備品...' },
          { text: '「先用副廠的擋一下。」', quality: 'risky', response: '📱 「OK！一週內到。warranty 只有 3 個月。」\n\n快速但有品質風險...' },
          { text: '「兩邊都下，副廠先用，原廠到了再換。」', quality: 'best', response: '📱 「沒問題，我兩邊都幫你處理。」\n\n最穩的做法。' },
          { text: '「我確認一下再回你。」', quality: 'bad', response: '📱 「好的，但這價格只保留到週五喔。」\n\n拖延了...' },
        ]},
      ]
    }),
    (v) => ({
      title: '客戶端品質問題回報',
      narrative: `${contextPrefix()}📞 ${v.manager}：\n「客戶說昨天出的那批 wafer 有幾片 defect 偏高，\nmap 上看起來集中在 edge 附近。\n你查一下是不是 ${v.machine} 的問題，客戶要求今天回覆。」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: '你決定先查什麼？', options: [
          { text: '調出那批 wafer 的 process log 比對', quality: 'best', response: '✅ Log 顯示其中 3 片在 edge zone 的參數有微小偏移！' },
          { text: '看最近的 particle monitor 數據', quality: 'good', response: '⚠️ Particle 數據在 spec 內但有上升趨勢。可能相關但不是直接原因。' },
          { text: '先回客戶說正在調查中', quality: 'bad', response: '❌ 客戶要求要有具體時間表和初步方向...' },
          { text: '直接去機台跑 test wafer', quality: 'good', response: '⚠️ Test wafer OK...但不能排除是 lot-specific 問題。' },
        ]},
        { prompt: '找到初步原因後，怎麼回覆客戶？', options: [
          { text: '提供完整數據 + root cause + 短期對策', quality: 'best', response: '✅ 客戶：「分析很到位，temporary fix 可以接受。」' },
          { text: '只說原因，對策還在研擬中', quality: 'good', response: '⚠️ 客戶：「原因 OK 但我們需要對策時間表。」' },
          { text: '說機台沒問題，建議客戶自己查', quality: 'bad', response: '❌ 客戶很不高興，主管被打電話追問了...' },
        ]},
      ]
    }),
    (v) => ({
      title: '兄弟廠請求機台資料',
      narrative: `${contextPrefix()}📞 新竹廠 趙工程師：\n「嗨，你們那台 ${v.machine} 跑 ${v.recipe} 的 baseline 數據可以分享一下嗎？\n我們這邊新機剛裝好，急用。」`,
      steps: [
        { prompt: '你的回應：', options: [
          { text: '「OK，我整理好最近 3 個月的數據寄給你。」', quality: 'good', response: '📱 「太感謝了！」\n\n花了點時間整理，但建立了好關係。' },
          { text: '「這需要主管簽核，我幫你走流程。」', quality: 'best', response: '📱 「了解，那麻煩你了。」\n\n走正規流程，不會有資安問題。' },
          { text: '「不好意思，這個不能分享。」', quality: 'bad', response: '📱 「...好吧。」\n\n其實經過核准是可以的...' },
          { text: '「你直接來系統撈就好啊？」', quality: 'risky', response: '📱 「我們連不到你們的系統啊...」尷尬了。' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.vendor.co} 設備升級提案`,
      narrative: `${contextPrefix()}📞 ${v.vendor.co} ${v.vendor.person}：\n「最近我們有個 ${v.machine} 的升級方案，throughput 可以提升 15%。\n安裝只需停機 2 天，這季度有折扣。你們有興趣嗎？」`,
      steps: [
        { prompt: '你的反應：', options: [
          { text: '「聽起來不錯，寄 proposal 過來我評估。」', quality: 'best', response: '📱 「我馬上寄！下週可以來做技術 review 嗎？」\n\n專業處理！' },
          { text: '「我們目前沒有預算。」', quality: 'good', response: '📱 「下一季呢？我可以保留這個價格。」\n\n先擋掉了。' },
          { text: '「2 天停機太久了。」', quality: 'good', response: '📱 「排在 PM 期間一起做呢？」\n\n好主意。' },
          { text: '「我做不了主，你找我們經理。」', quality: 'bad', response: '📱 「好...」\n\n推掉了但顯得被動。' },
        ]},
      ]
    }),
    (v) => ({
      title: 'EHS 安全確認來電',
      narrative: `${contextPrefix()}📞 EHS 安全部 蕭專員：\n「我們收到通報，昨天 ${v.machine} area 有人反映聞到異味。\n你的轄區對吧？給我一份簡短書面說明。」`,
      steps: [
        { prompt: '你的回覆：', options: [
          { text: '「昨天有做 chamber clean，可能是排氣。我寫份說明。」', quality: 'best', response: '📱 「好的，附上 clean 的時間和排氣紀錄就行。」\n\n誠實且有佐證。' },
          { text: '「我不知道有異味的事。」', quality: 'bad', response: '📱 「通報指向你的區域，請確認。」\n\n推託反而被盯更緊。' },
          { text: '「可能是隔壁 area 的，我查一下。」', quality: 'good', response: '📱 「一起查比較好。」\n\n合理但拖了一步。' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.manager} — 明天排假確認`,
      narrative: `${contextPrefix()}📞 ${v.manager}：\n「後天有 ${randInt(2, 4)} 台要 PM，${v.operator} 那天請假。\n你能調一下排班嗎？如果人不夠就要看哪一台 PM 延後。\n但 ${v.machine} 的 PM 絕對不能延。」`,
      steps: [
        { prompt: '你的安排：', options: [
          { text: '協調其他同事支援 + 確認每台 PM 的人力', quality: 'best', response: '✅ 安排好了三個人輪流負責，${v.machine} 排第一順位。主管很滿意。' },
          { text: '先 PM 最重要的那台，其他延後', quality: 'good', response: '⚠️ 只做一台 PM...其他台的 PM 又要排到下個月了。' },
          { text: '看看那天能不能加班', quality: 'risky', response: '⚡ 加班需要提前申請...臨時安排可能違反工時規定。' },
          { text: '跟 ${v.operator} 說不能那天請假', quality: 'bad', response: '❌ 人家早就排好假了...你不能這樣。主管搖了搖頭。' },
        ]},
      ]
    }),
    (v) => ({
      title: '🚽 你真的很想上廁所...',
      narrative: `${contextPrefix()}（你已經在無塵室裡連續待了 ${randInt(3, 5)} 個小時了。）\n（膀胱快要爆炸，但手頭的事情一件接一件。）\n（剛處理完一台機台的問題，正要往出口走——）\n\n📞 ${v.operator}（${v.mood}）：\n「工程師！${v.machine} 又有問題了，alarm ${v.errorCode}！你能過來看一下嗎？」\n\n（出口就在 50 公尺外...但 ${v.machine} 在另一個方向。）`,
      steps: [
        { prompt: '你的膀胱 vs 你的責任感：', options: [
          { text: '「我先看一下是什麼 alarm。」（走向機台...遠離廁所）', quality: 'best', response: `✅ 你咬著牙走向 ${v.machine}...\n\nalarm ${v.errorCode} 其實是一個簡單的 interlock reset 就能解決的問題。\n但你已經走到這裡了。\n\n（回程還要 3 分鐘...忍住...）` },
          { text: '「我 5 分鐘後過去，先讓我處理一下私事。」', quality: 'good', response: `⚠️ ${v.operator}：「噢...好吧。」\n\n你用百米衝刺的速度奔向廁所。\n出來的時候，手機上已經有 3 通未接來電了...` },
          { text: '「你先幫我看一下 alarm code 是什麼？」', quality: 'good', response: `⚠️ ${v.operator}：「${v.errorCode}...我也看不懂這個。」\n\n你試圖遠端指導，同時腳步不由自主地往出口移動。` },
          { text: '（已經忍到極限了）「抱歉我真的很急！馬上回來！」', quality: 'risky', response: `⚡ 你衝出無塵室，在廁所裡感受到前所未有的解脫...\n\n但出來的時候，${v.manager} 站在走廊上：\n「剛才 operator 找你找不到人？」` },
        ]},
      ]
    }),
    (v) => ({
      title: `夜班巡機 — ${v.machine} area`,
      narrative: `${contextPrefix()}（凌晨 ${randInt(1, 4)}:${String(randInt(0, 59)).padStart(2, '0')}，你拖著沉重的腳步進行第 ${randInt(3, 6)} 輪巡機。）\n（無塵室裡只有機台 fan 的嗡嗡聲和偶爾的 alarm 嗶聲。）\n（你打了個哈欠，眼皮很重...）\n\n💬 ${v.machine} 突然跳出 alarm ${v.errorCode}！\n\n畫面上顯示 ${v.recipe} 正在跑。你揉了揉眼睛確認自己沒有看錯。`,
      steps: [
        { prompt: '凌晨 3 點，只有你一個工程師在場。你的精神狀態：', options: [
          { text: '深呼吸，打起精神，先看 alarm log', quality: 'best', response: `✅ 你強撐著精神...log 顯示是 ${v.part} 的一個 soft alarm，可以處理。` },
          { text: '先去泡杯咖啡再來看', quality: 'good', response: `⚠️ 咖啡讓你稍微清醒了，但已經過了 10 分鐘...\nalarm 一直在叫，operator 開始不安了。` },
          { text: '打電話叫白天的學長起床問', quality: 'risky', response: `⚡ 📞「凌晨 3 點...你確定不能自己先看看？」\n學長語氣很不爽。但他還是告訴你怎麼做了。\n你欠他一杯早餐咖啡。` },
          { text: '先 reset 看看會不會消失', quality: 'risky', response: `⚡ Reset 之後安靜了 5 分鐘...然後又跳了。\n你嘆了口氣。今晚果然不會讓你好過。` },
        ]},
        { prompt: '處理完 alarm 後，你看了一下時間——還有 3 個小時才下班：', options: [
          { text: '繼續完成巡機 + 寫好交接紀錄', quality: 'best', response: `✅ 你撐下來了。交接紀錄寫得很完整。\n\n白班同事：「辛苦了，你回去好好睡。」\n你點了點頭，走出廠房的時候天已經亮了。` },
          { text: '找個安靜的角落瞇一下', quality: 'risky', response: `⚡ 你靠在無塵室外的椅子上閉眼...\n突然被電話吵醒。已經過了 40 分鐘！\n「你在哪裡？！${v.machine} 又叫了！」` },
          { text: '打混到交接時間', quality: 'bad', response: `❌ 交接的時候白班同事問你巡機紀錄...
你支支吾吾。${v.manager} 後來也知道了。` },
        ]},
      ]
    }),
    (v) => ({
      title: '倉庫通知取件',
      narrative: `${contextPrefix()}📞 倉管小周：\n「你之前叫的 ${v.machine} ${v.part} 到了喔，來簽收一下。\n對了，有一箱外包裝壓損了，你要不要先拆開確認一下品質？」`,
      steps: [
        { prompt: '你的處理方式：', options: [
          { text: '馬上去取 + 壓損的那箱當場開箱檢查', quality: 'best', response: '✅ 開箱確認：有一件輕微刮傷但不影響功能。記錄在案後入庫。' },
          { text: '叫倉管先幫你拍照紀錄', quality: 'good', response: '⚠️ 倉管拍了照，但你還是得親自去確認...' },
          { text: '晚點再去取', quality: 'bad', response: '❌ 下午再去的時候倉管已經下班了...明天再來。' },
          { text: '壓損的退回換新的', quality: 'risky', response: '⚡ 退回要再等 8 週...期間如果這個 part 壞了就沒備品了。' },
        ]},
      ]
    }),
  ];

  /* --- REPORT Scenarios --- */
  const REPORT_SKELETONS = [
    (v) => ({
      title: `${v.machine} Down Time 報告`,
      narrative: `${contextPrefix()}💬 ${v.manager}：\n「昨天 ${v.machine} 停了 ${randInt(2, 8)} 小時，老闆要看報告。\n把 root cause 跟對策寫清楚，中午前要。」${maybeReferPrevious(v)}`,
      steps: [
        { prompt: 'Root Cause 你選哪個？', options: [
          { text: `${v.part} 耗材壽命到達，未及時更換`, quality: 'best', response: '✅ 查了 PM log 確認耗材已超過建議壽命。Root cause 精準！' },
          { text: `${v.recipe} 參數設定有誤`, quality: 'bad', response: '❌ Recipe 參數確認是正確的...方向搞錯了。' },
          { text: '操作員誤操作導致', quality: 'bad', response: '❌ 操作紀錄顯示流程正常。怪人之前先查機器！' },
          { text: '環境因素（溫濕度異常）', quality: 'good', response: '⚠️ 溫濕度有輕微偏移但在 spec 內，算 contributing factor。' },
        ]},
        { prompt: 'Corrective Action 你建議什麼？', options: [
          { text: '更換耗材 + 建立壽命追蹤系統', quality: 'best', response: '✅ 主管：「不錯，同時預防未來。核准了。」' },
          { text: '先更換耗材即可', quality: 'good', response: '⚠️ 主管：「治標。預防措施呢？補上。」' },
          { text: '增加巡檢頻率', quality: 'good', response: '⚠️ 主管：「OK 但有更直接的做法吧？」' },
          { text: '沒有特別建議，持續監控', quality: 'bad', response: '❌ 主管：「這什麼對策？重寫！」' },
        ]},
      ]
    }),
    (v) => ({
      title: '本週設備週報',
      narrative: `${contextPrefix()}💬 ${v.manager}：\n「週報今天 5 點前要交。重點放在 uptime 和 PM 完成率。\n上週那台 ${v.machine} 的問題也更新一下。」`,
      steps: [
        { prompt: '你在週報中如何呈現 uptime 下降？', options: [
          { text: '如實報告 + 分析原因 + 改善計畫', quality: 'best', response: '✅ 主管：「很好，數據說話。老闆問起來我有依據了。」' },
          { text: '只報數字，不多解釋', quality: 'good', response: '⚠️ 主管：「數字我看得到，分析呢？」' },
          { text: '強調其他機台 uptime 很高來平衡', quality: 'good', response: '⚠️ 主管：「避重就輕啊...」' },
          { text: '調整計算方式讓數字好看', quality: 'bad', response: '❌ 主管：「這算法跟上個月不一樣啊？」' },
        ]},
      ]
    }),
    (v) => ({
      title: '設備事故調查報告',
      narrative: `${contextPrefix()}💬 ${v.manager}：\n「前天 ${v.machine} ${v.part} breakdown 造成 3 片 wafer 報廢。\n需要做 formal investigation report，含 5-Why 分析。\n客戶已經在問了。」`,
      steps: [
        { prompt: '5-Why 分析的第一個 Why：', options: [
          { text: `${v.part} 突然故障`, quality: 'best', response: '✅ 接下來追問：為什麼會突然故障？' },
          { text: '操作流程未遵循', quality: 'bad', response: '❌ 調查發現操作流程有遵循...第一步就歪了。' },
          { text: '運氣不好', quality: 'bad', response: '❌ ......這不是 5-Why 分析。主管白了你一眼。' },
        ]},
        { prompt: '追到第三層 Why 發現是 PM 計畫不完善：', options: [
          { text: '修訂 PM 排程 + 增加預防性更換項目', quality: 'best', response: '✅ 報告完整，客戶認可！' },
          { text: '要求增加人力強化巡檢', quality: 'good', response: '⚠️ 主管：「人力 justify 不容易...」' },
          { text: '建議更換整台機台', quality: 'bad', response: '❌ 主管：「一台幾千萬你說換就換？」' },
        ]},
      ]
    }),
    (v) => ({
      title: `${v.machine} 耗材成本分析`,
      narrative: `${contextPrefix()}💬 ${v.manager}：\n「財務要各機台的耗材費用明細，比較一下原廠 vs 副廠。\n我聽說有些 part 用副廠差很多但問題也多。你整理一下。」`,
      steps: [
        { prompt: '你的分析方向：', options: [
          { text: '列出每項耗材的 TCO（含壽命、品質、停機風險）', quality: 'best', response: '✅ 主管：「TCO 的角度很好，不是只看單價。」' },
          { text: '只比較單價', quality: 'bad', response: '❌ 主管：「便宜但壽命只有一半不是更貴嗎？」' },
          { text: '建議全部用原廠', quality: 'good', response: '⚠️ 主管：「預算吃得消嗎？」' },
          { text: '建議全部換副廠省錢', quality: 'risky', response: '⚡ 主管：「省了耗材費但機台壞更多...」' },
        ]},
      ]
    }),
    (v) => ({
      title: `有機溶劑事件檢討報告 — ${v.manager} 指定你寫`,
      narrative: `${contextPrefix()}💬 ${v.manager}（冷冷地）：\n「上次有機溶劑偵測器飆高的事，廠長要看正式檢討報告。\n你是當事人，報告你來寫。明天下班前交。」\n\n（你知道這份報告寫出去，考績可能直接吃烤雞...\n但不寫更慘。）`,
      steps: [
        { prompt: '報告中關於責任歸屬的描述：', options: [
          { text: '如實描述操作過程，強調是 SOP 灰色地帶，建議補充規範', quality: 'best', response: `✅ ${v.manager} 拿到報告看了看...\n「你這樣寫...好吧，算你聰明。SOP 的建議我會跟上面提。」\n\n至少把個人疏失轉化成了系統改善建議。` },
          { text: '只寫客觀事實，不做責任判斷', quality: 'good', response: `⚠️ ${v.manager}：「太乾了，老闆要看到有人負責。你不寫我來寫？」\n\n暗示很明白——他會把責任全部寫在你頭上。` },
          { text: '在報告中提到 PM 排程是部門共同決策', quality: 'risky', response: `⚡ ${v.manager}：「你在暗示什麼？操作是你做的。」\n\n他把那句話刪掉了。你的名字單獨出現在「負責人」欄位上。` },
          { text: '寫得感覺像在洗白自己', quality: 'bad', response: `❌ ${v.manager}：「重寫。你以為廠長看不出來你在推？」\n\n要重寫一遍...而且印象更差了。` },
        ]},
      ]
    }),
    (v) => ({
      title: '月度 KPI 報告',
      narrative: `${contextPrefix()}💬 ${v.manager}：\n「月底了，各機台的 KPI 彙總報告今天交。\n${v.machine} group 的 MTBF 和 MTTR 都比上個月差，\n你要在報告裡解釋清楚。老闆明天 review。」`,
      steps: [
        { prompt: '你如何呈現 KPI 下降的事實？', options: [
          { text: '詳細列出每次 down event + 個別改善措施', quality: 'best', response: '✅ 主管：「每次都有追蹤，很完整。老闆問我有信心回答了。」' },
          { text: '先強調本月有 3 台做了大 PM 影響數據', quality: 'good', response: '⚠️ 主管：「PM 是事實，但 unplanned down 呢？也要說明。」' },
          { text: '跟上個月比下降不多，還在可接受範圍', quality: 'bad', response: '❌ 主管：「可接受是你定的嗎？」' },
          { text: '把一些短暫 down 歸類為 idle，讓 MTBF 好看', quality: 'bad', response: '❌ 品保發現分類有問題...要你重新計算。' },
        ]},
      ]
    }),
  ];

  /* --- MEETING Scenarios --- */
  const MEETING_SKELETONS = [
    (v) => ({
      title: `${v.vendor.co} 維護合約談判`,
      narrative: `${contextPrefix()}🤝 ${v.vendor.co} ${v.vendor.person}：\n「今年維護合約因為原物料上漲，希望調漲 15%。\n我們會多提供 2 次免費 on-call 服務。」\n\n${v.manager} 在旁邊看著你。${maybeReferPrevious(v)}`,
      steps: [
        { prompt: 'Round 1 — 開場回應：', options: [
          { text: '「15% 太高了，最多接受 5%。」', quality: 'good', response: `${v.vendor.person}：「5% 做不到...原物料漲幅就超過 10% 了。」` },
          { text: '「能不能 8-10%？我們加簽一年變兩年約。」', quality: 'best', response: `${v.vendor.person}：「兩年約的話...這個方向可以談！」\n\n雙方都有退讓空間。` },
          { text: '「除了 on-call，能加碼 PM 免費換耗材嗎？」', quality: 'good', response: `${v.vendor.person}：「小件的可以談。」\n\n你在爭取更多價值。` },
          { text: '「我需要回去跟上面討論。」', quality: 'bad', response: `${v.vendor.person}：「報價只到月底喔。」\n${v.manager}：「結果呢？」` },
        ]},
        { prompt: 'Round 2 — 進入細節：', options: [
          { text: '用過去 3 年的合約金額趨勢做 benchmark', quality: 'best', response: '✅ 用數據說話。最終 8% 漲幅 + 2 年約 + free on-call 4 次。雙贏！' },
          { text: '強調你們是大客戶應該有更多折扣', quality: 'good', response: '⚠️ 有效果。最終 10% 漲幅 + on-call 維持。' },
          { text: '威脅要找其他廠商報價', quality: 'risky', response: '⚡ 對方：「re-qualification 的時間你們能承受嗎？」被將了一軍。' },
        ]},
      ]
    }),
    (v) => ({
      title: '跨部門生產會議',
      narrative: `${contextPrefix()}🤝 每週例行生產會議。\n\n製造部 孫課長：「${v.machine} 這個月 uptime 只有 87%，客戶在催。」\n品保部 何主任：「particle 趨勢也在上升。」\n\n所有人看向你。`,
      steps: [
        { prompt: '你的報告方式：', options: [
          { text: '先承認問題 + 說明原因 + 展示改善計畫', quality: 'best', response: '👍 孫課長：「有計畫就好。什麼時候回到 95%？」' },
          { text: '強調有些 down time 是排定的 PM', quality: 'good', response: '⚠️ 孫課長：「PM 我理解，但 unplanned down 呢？」' },
          { text: '說是因為備品 lead time 太長', quality: 'good', response: '⚠️ 採購的人皺了眉...' },
          { text: '反問為什麼 lot 排那麼滿', quality: 'risky', response: '⚡ 孫課長：「排好了你們要做啊！」氣氛火爆...' },
        ]},
        { prompt: '被問到 particle 改善時程：', options: [
          { text: '「下次 PM 一併處理，預估 2 週」', quality: 'best', response: '✅ 何主任：「OK，我排 2 週後追蹤。」' },
          { text: '「需要先排查，時程無法承諾」', quality: 'good', response: '⚠️ 何主任：「先給個排查計畫。」' },
          { text: '「particle 在 spec 內不用擔心」', quality: 'bad', response: '❌ 何主任：「趨勢在上升你不預防嗎？」' },
        ]},
      ]
    }),
    (v) => ({
      title: '新製程導入 Kick-off',
      narrative: `${contextPrefix()}🤝 研發部 方博士：\n「新的 ${v.recipe} 製程要在 ${v.machine} 上跑 qualification。\n需要 ${randInt(20, 50)} 片 test wafer 和 ${randInt(3, 7)} 天機台時間。\n你這邊有什麼要提前準備的？」`,
      steps: [
        { prompt: '你的回應：', options: [
          { text: '「我先確認機台 condition 和 PM 排程。」', quality: 'best', response: '✅ 方博士：「很專業！約下週開 detail meeting。」' },
          { text: '「機台隨時可以用。」', quality: 'risky', response: '⚡ 後來發現機台需先做 chamber condition 調整。延了 3 天。' },
          { text: '「這會影響產線 lot，需要先確認。」', quality: 'good', response: '⚠️ 方博士：「所以找你先溝通啊。」' },
          { text: '「test wafer 數量太多了。」', quality: 'bad', response: '❌ 方博士：「你是在說我不會設計實驗嗎？」' },
        ]},
      ]
    }),
    (v) => ({
      title: 'Particle 問題追殺會議',
      narrative: `${contextPrefix()}🤝 ${v.manager} 緊急召會。\n\n出席：品保部、製造部、設備部（你）、甚至研發部都被叫來了。\n\n品保部 何主任：「${v.machine} 的 particle 問題已經影響了 ${randInt(3, 8)} 批 wafer，\n客戶昨天直接打電話給廠長了。」\n\n${v.manager}（看向你）：「你報告一下目前的排查進度。」\n\n（你感覺到所有人的目光像聚光燈一樣打在你身上...）`,
      steps: [
        { prompt: '輪到你發言了。全場安靜等你開口：', options: [
          { text: '用數據報告每次排查結果 + 排除項目 + 下一步計畫', quality: 'best', response: `👍 品保部何主任：「至少你有在系統性排查。」\n\n但 ${v.manager} 插了一句：「排查這麼久還沒解怎麼說？」\n\n你深吸一口氣...繼續說下去。` },
          { text: '坦承目前還沒找到根因，但已縮小範圍', quality: 'good', response: `⚠️ 製造部孫課長：「還沒找到？那我的 lot 怎麼辦？」\n${v.manager} 沒有幫你說話。你 on your own。` },
          { text: '提出可能是前段製程帶入的汙染', quality: 'risky', response: `⚡ 研發部方博士：「我的製程沒問題！你的機台自己查清楚！」\n\n${v.manager}：「先不要互相推，我們設備部會徹查。」\n（但散會後他私下跟你說：「不要再把問題往外丟了。」）` },
          { text: '你不确定該說什麼，猶豫了幾秒', quality: 'bad', response: `❌ ${v.manager}（幫你接話）：「他目前還在查，我來說明...」\n\n散會後 ${v.manager} 把你叫到旁邊：\n「你在會議上不會講話就別參加了，下次我自己來。\n你的考績我會如實反映你的貢獻。」\n\n...你聽得出這是威脅。` },
        ]},
        { prompt: '散會後，${v.manager} 把你叫到辦公室：', options: [
          { text: '主動提出加班方案 + 需要的資源清單', quality: 'best', response: `✅ ${v.manager}：「行。你需要什麼我盡量幫你搞。3天內給我結果。」\n\n至少爭取到了資源和時間。但壓力像山一樣重。` },
          { text: '問主管能不能調其他同事來支援', quality: 'good', response: `⚠️ ${v.manager}：「人就這麼多...你先全力查，真的不行再說。」\n\n意思就是你一個人扛。` },
          { text: '建議請原廠工程師來協助', quality: 'good', response: `⚠️ ${v.manager}：「叫原廠又是一筆錢...先自己查。查不出來再說。」` },
        ]},
      ]
    }),
    (v) => ({
      title: '年度 PM 排程協調會議',
      narrative: `${contextPrefix()}🤝 年度 PM 排程協調會議。\n\n製造部 孫課長：「Q2 的產能不能受影響，你們 PM 排哪幾天？」\n${v.manager}：「公司政策是每季必須完成所有 PM，不能拖。」\n\n你負責 ${v.machine} group 共 ${randInt(4, 8)} 台機台。`,
      steps: [
        { prompt: '你的 PM 排程策略：', options: [
          { text: '錯開安排，確保每次只有 1 台停機', quality: 'best', response: '✅ 影響最小的排法！孫課長：「這個排程 OK。」' },
          { text: '集中在同一週全部做完', quality: 'risky', response: '⚡ 那一週產能會大跌...孫課長不太高興。' },
          { text: '先做最急的 2 台，其他下月再說', quality: 'bad', response: '❌ ${v.manager}：「Q2 結束前全部得做完，你排被動了。」' },
          { text: '配合假日和低產能時段安排', quality: 'best', response: '✅ 好策略！利用低產能時段做 PM，雙贏！' },
        ]},
      ]
    }),
  ];


  /* ===== TASK GENERATOR ===== */
  const SKELETON_MAP = {
    repair: REPAIR_SKELETONS,
    emergency: EMERGENCY_SKELETONS,
    call: CALL_SKELETONS,
    report: REPORT_SKELETONS,
    meeting: MEETING_SKELETONS,
  };

  function pickType() {
    const w = { ...TYPE_WEIGHTS };
    if (state.specialEvent && state.specialEvent.effect === 'emergencyUp') {
      w.emergency = state.specialEvent.value;
    }
    const entries = Object.entries(w);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    for (const [type, weight] of entries) {
      r -= weight;
      if (r <= 0) return type;
    }
    return 'repair';
  }

  function generateTask(forceType) {
    const type = forceType || pickType();
    const skeletons = SKELETON_MAP[type];
    const vars = randVars();
    const skeleton = pickSkeleton(skeletons)(vars);
    const diff = type === 'emergency' ? randInt(3, 4) : randInt(1, 4);
    const d = DIFFICULTY[diff];
    const meta = TYPE_META[type];

    const baseBonus = { repair: 3000, emergency: 5000, call: 800, report: 1500, meeting: 2500 }[type];
    const basePenalty = { repair: 5000, emergency: 8000, call: 3000, report: 2000, meeting: 4000 }[type];
    const baseTime = { repair: 300, emergency: 200, call: 160, report: 260, meeting: 340 }[type];

    let bonus = Math.round(baseBonus * d.bonusMult);
    let penalty = Math.round(basePenalty * d.penaltyMult);
    let timeLimit = Math.round(baseTime * d.timeMult);

    if (state.specialEvent) {
      if (state.specialEvent.effect === 'timeMult') timeLimit = Math.round(timeLimit * state.specialEvent.value);
      if (state.specialEvent.effect === 'reportBonus' && type === 'report') bonus = Math.round(bonus * state.specialEvent.value);
    }

    const steps = skeleton.steps.map(step => ({
      ...step,
      options: shuffle(step.options),
    }));

    return {
      id: uid(),
      type, icon: meta.icon, label: meta.label, color: meta.color,
      title: skeleton.title, narrative: skeleton.narrative,
      difficulty: diff, stars: d.stars,
      bonus, penalty, timeLimit,
      deadline: state.gameTime + timeLimit,
      steps, status: 'queued', stepIndex: 0, successMod: 1.0,
      createdAt: state.gameTime,
    };
  }


  /* ===== CHAIN EVENTS ===== */
  const CHAIN_TEMPLATES = [
    (prev) => ({ forceType: 'call', titleOverride: `追蹤來電 — 關於「${prev.title}」` }),
    (prev) => ({ forceType: 'report', titleOverride: `補寫報告 — ${prev.title} 後續` }),
    (prev) => prev.type === 'emergency' ? { forceType: 'meeting', titleOverride: '緊急檢討會議' } : null,
    (prev) => prev.type === 'repair' ? { forceType: 'call', titleOverride: `${pick(MANAGERS)} 來電追問進度` } : null,
    (prev) => prev.result === 'failed' ? { forceType: 'call', titleOverride: `${pick(MANAGERS)} — 關於剛才的失誤...` } : null,
    (prev) => (prev.type === 'meeting' && prev.result === 'success') ? { forceType: 'report', titleOverride: '會議記錄撰寫' } : null,
  ];

  function maybeChainEvent(completedTask) {
    if (!chance(CFG.CHAIN_CHANCE)) return;
    const templates = CHAIN_TEMPLATES.map(fn => fn(completedTask)).filter(Boolean);
    if (!templates.length) return;
    const chain = pick(templates);
    const task = generateTask(chain.forceType);
    if (chain.titleOverride) task.title = chain.titleOverride;
    task.timeLimit = Math.round(task.timeLimit * 1.3);
    task.deadline = state.gameTime + task.timeLimit;
    addTaskToQueue(task);
    addLog(`🔗 連鎖任務！「${task.title}」`);
  }


  /* ===== GAME STATE ===== */
  const state = {
    screen: 'start',
    gameTime: CFG.DAY_START,
    day: 1,
    bonus: CFG.BASE_BONUS,
    totalEarned: 0,
    totalPenalty: 0,
    completed: 0,
    failed: 0,
    expired: 0,
    taskQueue: [],
    currentTask: null,
    log: [],
    dayHistory: [],      // tasks completed this day (for context references)
    monthStats: [],      // { day, completed, failed, expired, rate } per day
    taskQueue: [],
    specialEvent: null,
    specialUsed: false,
    tickTimer: null,
    spawnTimer: null,
    highScore: parseInt(localStorage.getItem('fab-highscore') || '0', 10),
    isShowingResult: false,
  };


  /* ===== RATING SYSTEM ===== */
  function getRating(avgRate) {
    if (avgRate >= CFG.RATING_S) return 'S';
    if (avgRate >= CFG.RATING_A) return 'A';
    if (avgRate >= CFG.RATING_B) return 'B';
    return 'C';
  }

  function getRatingInfo(rating) {
    const info = {
      S: { label: 'S 級 — 卓越', emoji: '🏆', color: '#FFD700', desc: '你是 FAB 的傳奇！所有人都想跟你同班。', bonus: CFG.RATING_BONUS.S },
      A: { label: 'A 級 — 優秀', emoji: '🥇', color: '#4CAF50', desc: '主管很滿意，升遷名單上有你的名字。', bonus: CFG.RATING_BONUS.A },
      B: { label: 'B 級 — 及格', emoji: '📋', color: '#FF9800', desc: '普普通通，沒有功勞也沒有過失。', bonus: CFG.RATING_BONUS.B },
      C: { label: 'C 級 — 待改善', emoji: '⚠️', color: '#F44336', desc: '主管約了你 1-on-1 面談...要加油了。', bonus: CFG.RATING_BONUS.C },
    };
    return info[rating];
  }

  function calcMonthAvgRate() {
    if (state.monthStats.length === 0) return 0;
    const sum = state.monthStats.reduce((s, d) => s + d.rate, 0);
    return sum / state.monthStats.length;
  }


  /* ===== CORE GAME LOGIC ===== */
  function startDay() {
    state.screen = 'playing';
    state.gameTime = CFG.DAY_START;
    state.completed = 0;
    state.failed = 0;
    state.expired = 0;
    state.taskQueue = [];
    state.currentTask = null;
    state.log = [];
    state.dayHistory = [];
    state.specialEvent = null;
    state.specialUsed = false;
    state.isShowingResult = false;

    showScreen('game-play');
    addLog(`🏭 Day ${state.day}/${CFG.MONTH_DAYS} 上班了！加油！`);

    if (chance(CFG.SPECIAL_CHANCE)) triggerSpecialEvent();

    renderHUD();
    renderTaskQueue();
    startClock();
    scheduleNextTask();
  }

  function resetGame() {
    state.day = 1;
    state.bonus = CFG.BASE_BONUS;
    state.totalEarned = 0;
    state.totalPenalty = 0;
    state.monthStats = [];
    recentSkeletonIds.length = 0;
    _id = 0;
    startDay();
  }

  function nextDay() {
    state.day++;
    if (state.day > CFG.MONTH_DAYS) {
      endMonth();
    } else {
      startDay();
    }
  }

  function startClock() {
    clearInterval(state.tickTimer);
    state.tickTimer = setInterval(tick, CFG.TICK_MS);
  }

  function stopClock() {
    clearInterval(state.tickTimer);
    clearTimeout(state.spawnTimer);
  }

  function tick() {
    state.gameTime += CFG.TICK_ADVANCE;
    for (let i = state.taskQueue.length - 1; i >= 0; i--) {
      const t = state.taskQueue[i];
      if (state.gameTime >= t.deadline) {
        t.status = 'expired';
        state.expired++;
        state.bonus -= t.penalty;
        state.totalPenalty += t.penalty;
        state.dayHistory.push({ ...t, result: 'expired' });
        addLog(`💨 「${t.title}」超時未處理！ ${fmt$(-t.penalty)}`);
        state.taskQueue.splice(i, 1);
        animateBonus();
      }
    }

    if (state.currentTask && state.gameTime >= state.currentTask.deadline && !state.isShowingResult) {
      failCurrentTask();
    }

    if (state.gameTime % 60 < CFG.TICK_ADVANCE && !state.specialUsed && state.gameTime > CFG.DAY_START + 60) {
      if (chance(CFG.SPECIAL_CHANCE)) triggerSpecialEvent();
    }

    if (state.gameTime >= CFG.DAY_END) {
      endDay();
      return;
    }

    if (state.bonus <= 0) {
      gameOver();
      return;
    }

    renderHUD();
    renderTaskQueue();
    if (state.currentTask && !state.isShowingResult) renderActiveTaskTimer();
  }

  function scheduleNextTask() {
    const elapsed = state.gameTime - CFG.DAY_START;
    const progress = elapsed / (CFG.DAY_END - CFG.DAY_START);
    const dayFactor = 1 - Math.min(0.4, (state.day / CFG.MONTH_DAYS) * 0.4); // gets harder later in month
    const minInterval = Math.max(2, Math.round(CFG.TASK_INTERVAL_MIN * (1 - progress * 0.4) * dayFactor));
    const maxInterval = Math.max(4, Math.round(CFG.TASK_INTERVAL_MAX * (1 - progress * 0.3) * dayFactor));
    let interval = randInt(minInterval, maxInterval);

    if (state.specialEvent && state.specialEvent.effect === 'spawnMult') {
      interval = Math.round(interval * state.specialEvent.value);
    }

    state.spawnTimer = setTimeout(() => {
      if (state.screen !== 'playing') return;
      if (state.taskQueue.length < CFG.MAX_QUEUE) {
        const task = generateTask();
        addTaskToQueue(task);
        addLog(`📥 新任務！「${task.title}」(${task.stars})`);
      }
      scheduleNextTask();
    }, interval * 1000);
  }

  function addTaskToQueue(task) {
    state.taskQueue.push(task);
    renderTaskQueue();
  }

  function acceptTask(taskId) {
    if (state.currentTask) return;
    const idx = state.taskQueue.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const task = state.taskQueue.splice(idx, 1)[0];
    task.status = 'active';
    task.stepIndex = 0;
    task.successMod = 1.0;
    state.currentTask = task;
    state.isShowingResult = false;
    renderTaskQueue();
    renderActiveTask();
  }

  function selectOption(optIndex) {
    const task = state.currentTask;
    if (!task || state.isShowingResult) return;
    const step = task.steps[task.stepIndex];
    const option = step.options[optIndex];
    const mods = { best: 1.0, good: 0.75, bad: 0.4, risky: 0.3 };
    task.successMod *= (mods[option.quality] || 0.5);
    state.isShowingResult = true;
    renderOptionResponse(option, task.stepIndex < task.steps.length - 1);
  }

  function continueTask() {
    const task = state.currentTask;
    if (!task) return;
    task.stepIndex++;
    state.isShowingResult = false;
    if (task.stepIndex >= task.steps.length) {
      resolveTask();
    } else {
      renderActiveTask();
    }
  }

  function resolveTask() {
    const task = state.currentTask;
    const baseChance = 65;
    const finalChance = clamp(baseChance * task.successMod, 5, 98);
    const success = chance(finalChance);

    let bonusChange = 0;
    let result;

    if (success) {
      let b = task.bonus;
      if (state.specialEvent && state.specialEvent.effect === 'bonusMult') {
        b = Math.round(b * state.specialEvent.value);
      }
      bonusChange = b;
      state.bonus += b;
      state.totalEarned += b;
      state.completed++;
      result = 'success';
      addLog(`✅ 完成「${task.title}」 ${fmt$(b)}`);
    } else if (task.successMod >= 0.5) {
      const b = Math.round(task.bonus * 0.4);
      bonusChange = b;
      state.bonus += b;
      state.totalEarned += b;
      state.completed++;
      result = 'partial';
      addLog(`⚠️ 勉強完成「${task.title}」 ${fmt$(b)}（部分成功）`);
    } else {
      bonusChange = -task.penalty;
      state.bonus -= task.penalty;
      state.totalPenalty += task.penalty;
      state.failed++;
      result = 'failed';
      addLog(`❌ 「${task.title}」處理失敗！ ${fmt$(-task.penalty)}`);
    }

    task.status = result;
    state.dayHistory.push({ ...task, result, bonusChange });
    state.isShowingResult = true;
    renderTaskResult(result, bonusChange, finalChance);
    animateBonus();
    setTimeout(() => maybeChainEvent(task), 500);
  }

  function failCurrentTask() {
    const task = state.currentTask;
    if (!task) return;
    task.status = 'failed';
    state.bonus -= task.penalty;
    state.totalPenalty += task.penalty;
    state.failed++;
    state.dayHistory.push({ ...task, result: 'timeout', bonusChange: -task.penalty });
    addLog(`⏰ 「${task.title}」超時了！ ${fmt$(-task.penalty)}`);
    state.isShowingResult = true;
    renderTaskResult('timeout', -task.penalty, 0);
    animateBonus();
  }

  function finishCurrentTask() {
    state.currentTask = null;
    state.isShowingResult = false;
    const section = document.getElementById('task-active-section');
    if (section) section.style.display = 'none';
    renderTaskQueue();
    if (state.bonus <= 0) gameOver();
  }

  function triggerSpecialEvent() {
    if (state.specialUsed) return;
    state.specialUsed = true;
    const evt = pick(SPECIAL_EVENTS);
    state.specialEvent = evt;
    addLog(`🎯 特殊事件！${evt.text}`);
    const el = document.getElementById('special-event');
    if (el) {
      el.textContent = `${evt.text} [${evt.label}]`;
      el.style.display = 'block';
    }
  }

  function endDay() {
    stopClock();
    state.screen = 'end';
    const total = state.completed + state.failed + state.expired;
    const rate = total > 0 ? (state.completed / total) * 100 : 0;
    state.monthStats.push({
      day: state.day,
      completed: state.completed,
      failed: state.failed,
      expired: state.expired,
      rate,
    });

    if (state.bonus > state.highScore) {
      state.highScore = state.bonus;
      localStorage.setItem('fab-highscore', String(state.highScore));
    }

    showScreen('game-end');
    renderDayEnd();
  }

  function endMonth() {
    stopClock();
    state.screen = 'month-end';
    const avgRate = calcMonthAvgRate();
    const rating = getRating(avgRate);
    const ratingInfo = getRatingInfo(rating);
    state.bonus += ratingInfo.bonus;

    if (state.bonus > state.highScore) {
      state.highScore = state.bonus;
      localStorage.setItem('fab-highscore', String(state.highScore));
    }

    showScreen('game-month');
    renderMonthEnd(avgRate, rating, ratingInfo);
  }

  function gameOver() {
    stopClock();
    state.screen = 'gameover';
    state.bonus = 0;
    showScreen('game-over');
    renderGameOver();
  }


  /* ===== UI RENDERING ===== */
  function showScreen(id) {
    document.querySelectorAll('.game-screen').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function renderHUD() {
    setText('hud-time', fmtTime(state.gameTime));
    setText('hud-day', `${state.day}/${CFG.MONTH_DAYS}`);
    setText('hud-bonus', fmt$(state.bonus));
    setText('hud-completed', state.completed);
    setText('hud-failed', state.failed + state.expired);

    const progress = ((state.gameTime - CFG.DAY_START) / (CFG.DAY_END - CFG.DAY_START)) * 100;
    const bar = document.getElementById('day-progress-bar');
    if (bar) bar.style.width = clamp(progress, 0, 100) + '%';

    const bonusEl = document.querySelector('.hud-bonus');
    if (bonusEl) {
      bonusEl.classList.toggle('bonus-danger', state.bonus < 15000);
      bonusEl.classList.toggle('bonus-warning', state.bonus >= 15000 && state.bonus < 30000);
    }

    // Monthly progress indicator
    const monthBar = document.getElementById('month-progress-bar');
    if (monthBar) monthBar.style.width = ((state.day - 1) / CFG.MONTH_DAYS) * 100 + '%';
  }

  function renderTaskQueue() {
    const container = document.getElementById('task-queue');
    const emptyEl = document.getElementById('queue-empty');
    if (!container) return;

    const queue = state.taskQueue;
    setText('queue-count', queue.length);

    if (queue.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    container.innerHTML = queue.map(task => {
      const remaining = Math.max(0, task.deadline - state.gameTime);
      const pct = (remaining / task.timeLimit) * 100;
      const urgency = pct < 25 ? 'urgent' : pct < 50 ? 'warning' : 'safe';
      const disabled = state.currentTask ? 'disabled' : '';

      return `
        <div class="task-card ${disabled}" data-type="${task.type}">
          <div class="task-card-header">
            <span class="task-icon">${task.icon}</span>
            <span class="task-type-label">${task.label}</span>
            <span class="task-difficulty">${task.stars}</span>
          </div>
          <div class="task-card-title">${task.title}</div>
          <div class="task-card-meta">
            <span class="task-reward">+${fmt$(task.bonus)}</span>
            <span class="task-timer-text">⏳ ${fmtSec(remaining)}</span>
          </div>
          <div class="timer-bar"><div class="timer-fill ${urgency}" style="width:${pct}%"></div></div>
          <button class="btn-accept" onclick="window._acceptTask(${task.id})" ${disabled ? 'disabled' : ''}>接受任務</button>
        </div>`;
    }).join('');
  }

  function renderActiveTask() {
    const section = document.getElementById('task-active-section');
    const container = document.getElementById('task-active');
    if (!section || !container) return;
    section.style.display = 'block';

    const task = state.currentTask;
    if (!task) { section.style.display = 'none'; return; }

    const step = task.steps[task.stepIndex];
    const remaining = Math.max(0, task.deadline - state.gameTime);
    const stepLabel = `Step ${task.stepIndex + 1}/${task.steps.length}`;

    container.innerHTML = `
      <div class="active-header" data-type="${task.type}">
        <span>${task.icon} ${task.label} — ${task.title}</span>
        <span class="active-timer">⏳ ${fmtSec(remaining)}</span>
      </div>
      <div class="active-step-label">${stepLabel} · ${task.stars}</div>
      ${task.stepIndex === 0 ? `<div class="task-narrative">${task.narrative}</div>` : ''}
      <div class="task-prompt">${step.prompt}</div>
      <div class="task-options">
        ${step.options.map((opt, i) => `
          <button class="task-option" onclick="window._selectOption(${i})">
            ${opt.text}
          </button>
        `).join('')}
      </div>`;
  }

  function renderActiveTaskTimer() {
    const timerEl = document.querySelector('.active-timer');
    if (!timerEl || !state.currentTask) return;
    const remaining = Math.max(0, state.currentTask.deadline - state.gameTime);
    timerEl.textContent = `⏳ ${fmtSec(remaining)}`;
    timerEl.classList.toggle('timer-critical', remaining < 15);
  }

  function renderOptionResponse(option, hasNext) {
    const container = document.getElementById('task-active');
    if (!container) return;
    const task = state.currentTask;
    const remaining = Math.max(0, task.deadline - state.gameTime);
    const qualityClass = { best: 'correct', good: 'partial', bad: 'wrong', risky: 'risky' }[option.quality] || 'partial';

    container.innerHTML = `
      <div class="active-header" data-type="${task.type}">
        <span>${task.icon} ${task.label} — ${task.title}</span>
        <span class="active-timer">⏳ ${fmtSec(remaining)}</span>
      </div>
      <div class="task-response ${qualityClass}">
        ${option.response}
      </div>
      <button class="btn-continue" onclick="window._continueTask()">
        ${hasNext ? '繼續 →' : '查看結果 →'}
      </button>`;
  }

  function renderTaskResult(result, bonusChange, successChance) {
    const container = document.getElementById('task-active');
    if (!container) return;
    const icons = { success: '✅', partial: '⚠️', failed: '❌', timeout: '⏰' };
    const titles = { success: '任務完成！', partial: '勉強過關', failed: '任務失敗', timeout: '超時了！' };
    const classes = bonusChange >= 0 ? 'positive' : 'negative';
    let diceHTML = result !== 'timeout' ? `<div class="result-dice">🎲 成功率 ${Math.round(successChance)}%</div>` : '';

    container.innerHTML = `
      <div class="task-result">
        <div class="result-icon">${icons[result]}</div>
        <div class="result-title">${titles[result]}</div>
        ${diceHTML}
        <div class="result-bonus ${classes}">${fmt$(bonusChange)}</div>
        <button class="btn-game-primary" onclick="window._finishTask()">回到任務列表</button>
      </div>`;
  }

  function renderDayEnd() {
    const content = document.getElementById('summary-content');
    if (!content) return;
    const total = state.completed + state.failed + state.expired;
    const rate = total > 0 ? (state.completed / total) * 100 : 0;
    const avgRate = calcMonthAvgRate();
    const curRating = getRating(avgRate);
    const nextDay = state.day < CFG.MONTH_DAYS;

    const byType = {};
    for (const t of state.dayHistory) {
      if (!byType[t.type]) byType[t.type] = { done: 0, earned: 0 };
      if (t.result === 'success' || t.result === 'partial') {
        byType[t.type].done++;
        byType[t.type].earned += (t.bonusChange || 0);
      }
    }
    let typeRows = '';
    for (const [type, data] of Object.entries(byType)) {
      const m = TYPE_META[type];
      if (data.done > 0) typeRows += `<tr><td>${m.icon} ${m.label}</td><td>×${data.done}</td><td class="positive">+${fmt$(data.earned)}</td></tr>`;
    }

    // Mini chart of daily performance
    let barChart = '<div class="mini-chart">';
    for (const ds of state.monthStats) {
      const h = Math.max(4, Math.round(ds.rate * 0.6));
      const color = ds.rate >= CFG.RATING_S ? '#FFD700' : ds.rate >= CFG.RATING_A ? '#4CAF50' : ds.rate >= CFG.RATING_B ? '#FF9800' : '#F44336';
      barChart += `<div class="mini-bar" style="height:${h}px;background:${color}" title="Day ${ds.day}: ${fmtPct(ds.rate)}"></div>`;
    }
    barChart += '</div>';

    content.innerHTML = `
      <div class="summary-total">${fmt$(state.bonus)}</div>
      <p class="summary-label">Day ${state.day}/${CFG.MONTH_DAYS} 結束</p>
      <table class="summary-table">
        <tr><td>📊 今日完成率</td><td colspan="2"><strong>${fmtPct(rate)}</strong></td></tr>
        <tr><td>✅ 完成任務</td><td colspan="2">${state.completed}</td></tr>
        <tr><td>❌ 失敗 / 超時</td><td colspan="2">${state.failed + state.expired}</td></tr>
        ${typeRows}
        <tr class="summary-penalty"><td>── 罰款合計</td><td colspan="2" class="negative">-${fmt$(state.totalPenalty)}</td></tr>
      </table>
      <div class="summary-month-status">
        <p>📈 月均完成率：<strong>${fmtPct(avgRate)}</strong> | 目前考績預估：<strong style="color:${getRatingInfo(curRating).color}">${curRating} 級</strong></p>
        ${barChart}
        <p class="summary-hint">🏆 S 級需要 ≥${CFG.RATING_S}% 完成率 (獎金 ${fmt$(CFG.RATING_BONUS.S)})</p>
      </div>`;

    setText('end-high-score', fmt$(state.highScore));

    const btnNext = document.getElementById('btn-next-day');
    if (btnNext) {
      btnNext.textContent = nextDay ? `☀️ 繼續第 ${state.day + 1} 天` : '📊 月底考績結算';
    }
  }

  function renderMonthEnd(avgRate, rating, ratingInfo) {
    const content = document.getElementById('month-content');
    if (!content) return;

    // Build daily stats table
    let daysHTML = '<div class="month-days-grid">';
    for (const ds of state.monthStats) {
      const color = ds.rate >= CFG.RATING_S ? '#FFD700' : ds.rate >= CFG.RATING_A ? '#4CAF50' : ds.rate >= CFG.RATING_B ? '#FF9800' : '#F44336';
      daysHTML += `<div class="month-day-cell" style="border-color:${color}">
        <span class="month-day-num">D${ds.day}</span>
        <span class="month-day-rate" style="color:${color}">${fmtPct(ds.rate)}</span>
      </div>`;
    }
    daysHTML += '</div>';

    content.innerHTML = `
      <div class="rating-badge" style="color:${ratingInfo.color}">${ratingInfo.emoji}</div>
      <div class="rating-grade" style="color:${ratingInfo.color}">${ratingInfo.label}</div>
      <p class="rating-desc">${ratingInfo.desc}</p>
      <div class="rating-stats">
        <p>📈 月均完成率：<strong>${fmtPct(avgRate)}</strong></p>
        <p>💰 考績獎金：<strong class="positive">+${fmt$(ratingInfo.bonus)}</strong></p>
        <p>💵 最終獎金：<strong style="color:var(--primary)">${fmt$(state.bonus)}</strong></p>
      </div>
      ${daysHTML}
      <p class="rating-thresholds">
        考績門檻：S ≥${CFG.RATING_S}% · A ≥${CFG.RATING_A}% · B ≥${CFG.RATING_B}% · C &lt;${CFG.RATING_B}%
      </p>`;

    setText('month-high-score', fmt$(state.highScore));
  }

  function renderGameOver() {
    const content = document.getElementById('gameover-content');
    if (!content) return;
    const daysPlayed = state.monthStats.length;
    content.innerHTML = `
      <p>你撐了 <strong>${daysPlayed > 0 ? daysPlayed : state.day}</strong> 天</p>
      <p>今日完成 <strong>${state.completed}</strong> 個任務</p>
      <p>最終時間：${fmtTime(state.gameTime)}</p>`;
    setText('over-high-score', fmt$(state.highScore));
  }

  function addLog(msg) {
    const time = fmtTime(state.gameTime);
    state.log.unshift({ time, msg });
    if (state.log.length > 50) state.log.pop();
    renderLog();
  }

  function renderLog() {
    const el = document.getElementById('event-log');
    if (!el) return;
    el.innerHTML = state.log.map(e =>
      `<div class="log-entry"><span class="log-time">${e.time}</span>${e.msg}</div>`
    ).join('');
  }

  function animateBonus() {
    const el = document.querySelector('.hud-bonus');
    if (!el) return;
    el.classList.remove('bonus-pulse');
    void el.offsetWidth;
    el.classList.add('bonus-pulse');
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }


  /* ===== EVENT BINDING ===== */
  window._acceptTask = acceptTask;
  window._selectOption = selectOption;
  window._continueTask = continueTask;
  window._finishTask = finishCurrentTask;

  function init() {
    setText('high-score', fmt$(state.highScore));
    document.getElementById('btn-start')?.addEventListener('click', resetGame);
    document.getElementById('btn-next-day')?.addEventListener('click', nextDay);
    document.getElementById('btn-restart')?.addEventListener('click', resetGame);
    document.getElementById('btn-gameover-restart')?.addEventListener('click', resetGame);
    document.getElementById('btn-new-month')?.addEventListener('click', resetGame);
    showScreen('game-start');
  }

  init();
})();
