const API_BASE_URL = "http://127.0.0.1:5000/api";
const REFRESH_INTERVAL = 5000;

const tabMeta = {
  dashboard: {
    title: "Smart Healthcare Monitoring Dashboard",
    eyebrow: "Overview",
  },
  monitoring: {
    title: "Live Monitoring Center",
    eyebrow: "Realtime Telemetry",
  },
  "ai-analysis": {
    title: "AI Analysis and Risk Insights",
    eyebrow: "Clinical Inference",
  },
  blockchain: {
    title: "Blockchain Audit Logs",
    eyebrow: "Integrity Layer",
  },
  security: {
    title: "Security Command Surface",
    eyebrow: "Cybersecurity",
  },
};

const state = {
  activeTab: "dashboard",
  source: "loading",
  latest: null,
  history: [],
  blockchain: { is_chain_valid: true, data: [] },
  requestLogs: [],
};

const elements = {
  pageTitle: document.getElementById("pageTitle"),
  pageEyebrow: document.getElementById("pageEyebrow"),
  lastUpdated: document.getElementById("lastUpdated"),
  headerStatusText: document.getElementById("headerStatusText"),
  headerStatusDot: document.getElementById("headerStatusDot"),
  sidebarSignal: document.getElementById("sidebarSignal"),
  sidebarSignalText: document.getElementById("sidebarSignalText"),
  temperatureValue: document.getElementById("temperatureValue"),
  heartRateValue: document.getElementById("heartRateValue"),
  statusBadge: document.getElementById("statusBadge"),
  statusDetail: document.getElementById("statusDetail"),
  deviceValue: document.getElementById("deviceValue"),
  patientMeta: document.getElementById("patientMeta"),
  heroPatient: document.getElementById("heroPatient"),
  heroDevice: document.getElementById("heroDevice"),
  activityFeed: document.getElementById("activityFeed"),
  monitorTemperature: document.getElementById("monitorTemperature"),
  monitorHeartRate: document.getElementById("monitorHeartRate"),
  monitorPatient: document.getElementById("monitorPatient"),
  monitorDevice: document.getElementById("monitorDevice"),
  sessionStats: document.getElementById("sessionStats"),
  alertsGrid: document.getElementById("alertsGrid"),
  explanationPanel: document.getElementById("explanationPanel"),
  alertTimeline: document.getElementById("alertTimeline"),
  blockchainLogs: document.getElementById("blockchainLogs"),
  chainState: document.getElementById("chainState"),
  apiKeyStatus: document.getElementById("apiKeyStatus"),
  encryptionStatus: document.getElementById("encryptionStatus"),
  authIndicator: document.getElementById("authIndicator"),
  requestLogs: document.getElementById("requestLogs"),
  historyChart: document.getElementById("historyChart"),
  liveChart: document.getElementById("liveChart"),
};

const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const panels = Array.from(document.querySelectorAll(".tab-panel"));

const historyCtx = elements.historyChart.getContext("2d");
const liveCtx = elements.liveChart.getContext("2d");

function createDummyHistory() {
  return [
    { patient_id: "patient-001", device_id: "esp32-room-1", temperature: 36.7, heart_rate: 82, status: "Normal", received_at: "2026-04-17T07:00:00.000Z", block_hash: "a1" },
    { patient_id: "patient-001", device_id: "esp32-room-1", temperature: 36.8, heart_rate: 84, status: "Normal", received_at: "2026-04-17T07:05:00.000Z", block_hash: "a2" },
    { patient_id: "patient-001", device_id: "esp32-room-1", temperature: 37.0, heart_rate: 86, status: "Normal", received_at: "2026-04-17T07:10:00.000Z", block_hash: "a3" },
    { patient_id: "patient-001", device_id: "esp32-room-1", temperature: 37.2, heart_rate: 90, status: "Normal", received_at: "2026-04-17T07:15:00.000Z", block_hash: "a4" },
    { patient_id: "patient-001", device_id: "esp32-room-1", temperature: 37.4, heart_rate: 95, status: "Normal", received_at: "2026-04-17T07:20:00.000Z", block_hash: "a5" },
    { patient_id: "patient-001", device_id: "esp32-room-1", temperature: 38.2, heart_rate: 126, status: "Alert", received_at: "2026-04-17T07:25:00.000Z", block_hash: "a6" },
  ];
}

function buildDummyBlockchain(history) {
  return {
    is_chain_valid: true,
    data: history.map((reading, index) => ({
      index,
      timestamp: reading.received_at,
      sensor_data: reading,
      previous_hash: index === 0 ? "0" : `dummy-prev-${index - 1}`,
      hash: `dummy-hash-${index}-${reading.heart_rate}-${reading.temperature}`,
    })),
  };
}

function getDummyPayload() {
  const history = createDummyHistory();
  return {
    latest: history[history.length - 1],
    history,
    blockchain: buildDummyBlockchain(history),
  };
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "--";
}

function getAlerts(reading) {
  if (!reading) {
    return ["No live reading"];
  }

  const alerts = [];
  if (reading.heart_rate > 120) alerts.push("High Risk");
  if (reading.heart_rate < 50) alerts.push("Low Risk");
  if (reading.temperature > 38) alerts.push("Fever Alert");
  return alerts.length ? alerts : ["Normal"];
}

function getOverallStatus(reading) {
  return getAlerts(reading).includes("Normal") ? "Normal" : "Alert";
}

function getStatusClass(label) {
  if (label === "Normal" || label === "Valid" || label === "Authenticated" || label === "Protected") {
    return "normal";
  }
  if (label === "Alert" || label === "Invalid" || label === "Offline") {
    return "alert";
  }
  return "warning";
}

function setBadge(el, text, overrideClass) {
  el.textContent = text;
  el.className = "status-badge";
  el.classList.add(overrideClass || getStatusClass(text));
}

function setConnectionState(mode) {
  const online = mode === "live";
  elements.headerStatusText.textContent = online ? "Live" : "Offline";
  elements.sidebarSignalText.textContent = online ? "Realtime stream synchronized" : "Demo dataset active";
  elements.headerStatusDot.className = `status-dot ${online ? "live" : "offline"}`;
  elements.sidebarSignal.className = `signal-dot ${online ? "online" : "offline"}`;
}

function showSkeletons() {
  const skeletonMarkup = `
    <div class="skeleton-block"></div>
    <div class="skeleton-block"></div>
    <div class="skeleton-block"></div>
  `;

  elements.activityFeed.innerHTML = skeletonMarkup;
  elements.alertsGrid.innerHTML = skeletonMarkup;
  elements.blockchainLogs.innerHTML = skeletonMarkup;
  elements.alertTimeline.innerHTML = skeletonMarkup;
  elements.requestLogs.innerHTML = `
    <tr><td colspan="5"><div class="skeleton-block"></div></td></tr>
  `;
}

function switchTab(tabName) {
  state.activeTab = tabName;
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
  elements.pageTitle.textContent = tabMeta[tabName].title;
  elements.pageEyebrow.textContent = tabMeta[tabName].eyebrow;
}

function registerTabs() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });
}

function drawChart(ctx, canvas, history, options) {
  const width = canvas.width;
  const height = canvas.height;
  const padding = 32;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, width, height);

  if (!history.length) {
    ctx.fillStyle = "#5f7a6c";
    ctx.font = "18px Manrope";
    ctx.fillText("Waiting for telemetry to render chart.", 36, 60);
    return;
  }

  const tempValues = history.map((item) => Number(item.temperature));
  const hrValues = history.map((item) => Number(item.heart_rate));
  const maxValue = Math.max(...tempValues, ...hrValues) + 8;
  const minValue = Math.min(...tempValues, ...hrValues) - 5;
  const xStep = history.length > 1 ? (width - padding * 2) / (history.length - 1) : 0;

  ctx.strokeStyle = "rgba(20, 51, 40, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding + ((height - padding * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const drawLine = (values, color, fillColor) => {
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding + xStep * index;
      const y = height - padding - ((value - minValue) / Math.max(maxValue - minValue, 1)) * (height - padding * 2);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  drawLine(tempValues, options.tempColor, options.tempFill);
  drawLine(hrValues, options.hrColor, options.hrFill);

  ctx.fillStyle = "#4f665b";
  ctx.font = "13px Manrope";
  history.forEach((item, index) => {
    if (index % Math.ceil(history.length / 5) === 0 || index === history.length - 1) {
      const x = padding + xStep * index - 10;
      ctx.fillText(formatTime(item.received_at), x, height - 10);
    }
  });
}

function renderDashboard(reading, history) {
  const alerts = getAlerts(reading);
  const overallStatus = getOverallStatus(reading);

  elements.temperatureValue.textContent = reading ? Number(reading.temperature).toFixed(1) : "--.-";
  elements.heartRateValue.textContent = reading ? reading.heart_rate : "---";
  elements.deviceValue.textContent = reading?.device_id || "--";
  elements.patientMeta.textContent = reading
    ? `${reading.patient_id} connected from ${reading.device_id}`
    : "No patient stream detected yet";
  elements.heroPatient.textContent = reading?.patient_id || "patient-001";
  elements.heroDevice.textContent = reading?.device_id || "esp32-room-1";
  elements.statusDetail.textContent = alerts.join(" • ");
  setBadge(elements.statusBadge, overallStatus, overallStatus === "Alert" && alerts.includes("Fever Alert") ? "warning" : undefined);

  elements.activityFeed.innerHTML = [
    {
      title: `${overallStatus} assessment generated`,
      body: `AI engine classified the latest telemetry as ${alerts.join(", ")}.`,
    },
    {
      title: "Blockchain entry appended",
      body: `Latest reading anchored to immutable log with ${history.length} tracked events.`,
    },
    {
      title: state.source === "live" ? "Live backend connected" : "Demo mode active",
      body: state.source === "live" ? "The dashboard is streaming from Flask APIs." : "Fallback data keeps the UI demo-ready offline.",
    },
  ]
    .map(
      (item) => `
        <article class="feed-item">
          <strong>${item.title}</strong>
          <div class="muted">${item.body}</div>
        </article>
      `
    )
    .join("");
}

function renderMonitoring(reading, history) {
  elements.monitorTemperature.textContent = reading ? Number(reading.temperature).toFixed(1) : "--.-";
  elements.monitorHeartRate.textContent = reading ? reading.heart_rate : "---";
  elements.monitorPatient.textContent = reading?.patient_id || "patient-001";
  elements.monitorDevice.textContent = reading?.device_id || "esp32-room-1";

  const stats = [
    { label: "Stream Source", value: state.source === "live" ? "Backend API" : "Offline Demo Feed" },
    { label: "Last Packet", value: reading?.received_at ? formatDateTime(reading.received_at) : "--" },
    { label: "Alert Count", value: history.filter((item) => getOverallStatus(item) === "Alert").length },
  ];

  elements.sessionStats.innerHTML = stats
    .map(
      (item) => `
        <article class="session-stat">
          <div class="meta-label">${item.label}</div>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderAI(reading, history) {
  const alerts = getAlerts(reading);
  const cards = [
    {
      key: "High Risk",
      theme: "high",
      description: "Triggered when heart rate exceeds 120 bpm.",
      active: alerts.includes("High Risk"),
    },
    {
      key: "Low Risk",
      theme: "low",
      description: "Triggered when heart rate drops below 50 bpm.",
      active: alerts.includes("Low Risk"),
    },
    {
      key: "Fever Alert",
      theme: "fever",
      description: "Triggered when temperature rises above 38 C.",
      active: alerts.includes("Fever Alert"),
    },
  ];

  elements.alertsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="alert-card ${card.theme}" data-state="${card.active ? "active" : "idle"}">
          <h4>${card.key}</h4>
          <div class="status-badge ${card.active ? (card.key === "Fever Alert" ? "warning" : "alert") : "normal"}">
            ${card.active ? "Triggered" : "Monitoring"}
          </div>
          <p class="muted">${card.description}</p>
        </article>
      `
    )
    .join("");

  elements.explanationPanel.innerHTML = reading
    ? `
      <strong>${getOverallStatus(reading)} condition detected</strong>
      <p class="muted">
        The latest reading reported <strong>${reading.heart_rate} bpm</strong> and
        <strong>${Number(reading.temperature).toFixed(1)} C</strong>. Based on the configured
        rules, the AI engine classified this as <strong>${alerts.join(", ")}</strong>.
      </p>
      <p class="muted">
        Explanation: ${alerts.includes("High Risk") ? "Elevated heart rate crossed the critical threshold. " : ""}
        ${alerts.includes("Low Risk") ? "Reduced heart rate indicates possible low perfusion. " : ""}
        ${alerts.includes("Fever Alert") ? "Body temperature exceeded the fever threshold. " : ""}
        ${alerts.includes("Normal") ? "All monitored parameters remain within safe operating ranges." : ""}
      </p>
    `
    : `<div class="empty-state">No inference available yet.</div>`;

  const timelineItems = history
    .slice()
    .reverse()
    .slice(0, 8)
    .map((item) => ({
      time: formatDateTime(item.received_at),
      status: getAlerts(item).join(", "),
      detail: `HR ${item.heart_rate} bpm • Temp ${Number(item.temperature).toFixed(1)} C`,
    }));

  elements.alertTimeline.innerHTML = timelineItems
    .map(
      (item) => `
        <article class="timeline-item">
          <span class="timeline-node"></span>
          <div>
            <strong>${item.status}</strong>
            <div class="muted">${item.detail}</div>
            <div class="muted">${item.time}</div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderBlockchain(blockchain) {
  setBadge(elements.chainState, blockchain.is_chain_valid ? "Valid" : "Invalid");
  elements.blockchainLogs.innerHTML = blockchain.data
    .slice()
    .reverse()
    .map(
      (block) => `
        <article class="block-item">
          <strong>Block #${block.index}</strong>
          <div class="muted">${formatDateTime(block.timestamp)}</div>
          <div class="block-hash">Hash: ${block.hash}</div>
          <div class="block-hash">Prev: ${block.previous_hash}</div>
        </article>
      `
    )
    .join("");
}

function renderSecurity(reading, history) {
  setBadge(elements.apiKeyStatus, "Protected");
  setBadge(elements.encryptionStatus, "Simulated Encryption", "warning");
  setBadge(elements.authIndicator, state.source === "live" ? "Authenticated" : "Offline", state.source === "live" ? "normal" : "warning");

  const generatedLogs = [
    {
      time: formatTime(reading?.received_at),
      endpoint: "/api/health-data/latest",
      method: "GET",
      status: state.source === "live" ? "200" : "Fallback",
      source: state.source === "live" ? "Backend" : "Local mock",
    },
    {
      time: formatTime(reading?.received_at),
      endpoint: "/api/health-data/history",
      method: "GET",
      status: state.source === "live" ? "200" : "Fallback",
      source: state.source === "live" ? "Backend" : "Local mock",
    },
    {
      time: formatTime(reading?.received_at),
      endpoint: "/api/blockchain/logs",
      method: "GET",
      status: state.source === "live" ? "200" : "Fallback",
      source: state.source === "live" ? "Backend" : "Local mock",
    },
    {
      time: formatTime(reading?.received_at),
      endpoint: "/api/health-data",
      method: "POST",
      status: history.length ? "201" : "Idle",
      source: reading?.device_id || "ESP32 device",
    },
  ];

  state.requestLogs = generatedLogs;
  elements.requestLogs.innerHTML = generatedLogs
    .map(
      (log) => `
        <tr>
          <td>${log.time}</td>
          <td>${log.endpoint}</td>
          <td>${log.method}</td>
          <td>${log.status}</td>
          <td>${log.source}</td>
        </tr>
      `
    )
    .join("");
}

function renderAll() {
  const reading = state.latest;
  const history = state.history;

  elements.lastUpdated.textContent = reading?.received_at ? formatDateTime(reading.received_at) : "Waiting for data";
  setConnectionState(state.source);
  renderDashboard(reading, history);
  renderMonitoring(reading, history);
  renderAI(reading, history);
  renderBlockchain(state.blockchain);
  renderSecurity(reading, history);

  drawChart(historyCtx, elements.historyChart, history, {
    tempColor: "#d95a5a",
    tempFill: "rgba(217, 90, 90, 0.18)",
    hrColor: "#1f9d67",
    hrFill: "rgba(31, 157, 103, 0.18)",
  });
  drawChart(liveCtx, elements.liveChart, history, {
    tempColor: "#f08d52",
    tempFill: "rgba(240, 141, 82, 0.18)",
    hrColor: "#4f7cff",
    hrFill: "rgba(79, 124, 255, 0.16)",
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

async function loadData() {
  try {
    const [latestPayload, historyPayload, blockchainPayload] = await Promise.all([
      fetchJson(`${API_BASE_URL}/health-data/latest`),
      fetchJson(`${API_BASE_URL}/health-data/history?limit=20`),
      fetchJson(`${API_BASE_URL}/blockchain/logs`),
    ]);

    state.source = latestPayload.data ? "live" : "offline";
    state.latest = latestPayload.data || getDummyPayload().latest;
    state.history = historyPayload.data?.length ? historyPayload.data : getDummyPayload().history;
    state.blockchain = blockchainPayload.data?.length ? blockchainPayload : getDummyPayload().blockchain;
  } catch (error) {
    const dummy = getDummyPayload();
    state.source = "offline";
    state.latest = dummy.latest;
    state.history = dummy.history;
    state.blockchain = dummy.blockchain;
  }

  renderAll();
}

showSkeletons();
registerTabs();
switchTab("dashboard");
loadData();
setInterval(loadData, REFRESH_INTERVAL);
