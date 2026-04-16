const API_BASE_URL = "http://127.0.0.1:5000/api";

const temperatureValue = document.getElementById("temperatureValue");
const heartRateValue = document.getElementById("heartRateValue");
const statusBadge = document.getElementById("statusBadge");
const lastUpdated = document.getElementById("lastUpdated");
const patientMeta = document.getElementById("patientMeta");
const alertsList = document.getElementById("alertsList");
const blockchainLogs = document.getElementById("blockchainLogs");
const chainState = document.getElementById("chainState");
const chartCanvas = document.getElementById("historyChart");
const ctx = chartCanvas.getContext("2d");

function setStatusBadge(status, alerts = []) {
  const normalizedStatus = (status || "No Data").toLowerCase();
  statusBadge.textContent = status || "No Data";
  statusBadge.className = "status-badge";

  if (normalizedStatus === "normal") {
    statusBadge.classList.add("normal");
  } else if (normalizedStatus === "alert") {
    statusBadge.classList.add(alerts.includes("Fever Alert") ? "warning" : "alert");
  } else {
    statusBadge.classList.add("neutral");
  }
}

function computeAlerts(reading) {
  if (!reading) {
    return ["No live reading"];
  }

  const alerts = [];
  if (reading.heart_rate > 120) alerts.push("High Risk");
  if (reading.heart_rate < 50) alerts.push("Low Risk");
  if (reading.temperature > 38) alerts.push("Fever Alert");
  return alerts.length ? alerts : ["Normal"];
}

function renderAlerts(reading) {
  const alerts = computeAlerts(reading);
  alertsList.innerHTML = alerts
    .map((alert) => {
      const cls = alert === "Normal" ? "normal" : alert === "Fever Alert" ? "warning" : "alert";
      return `
        <div class="alert-item">
          <strong>${alert}</strong>
          <span class="alert-pill ${cls}">${reading ? reading.status : "Waiting"}</span>
        </div>
      `;
    })
    .join("");

  return alerts;
}

function renderChart(history) {
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const padding = 36;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfdf9";
  ctx.fillRect(0, 0, width, height);

  if (!history.length) {
    ctx.fillStyle = "#5f7365";
    ctx.font = "18px Space Grotesk";
    ctx.fillText("History chart will appear once readings arrive.", 36, 80);
    return;
  }

  const temps = history.map((item) => item.temperature);
  const bpm = history.map((item) => item.heart_rate);
  const maxValue = Math.max(...temps, ...bpm) + 10;
  const minValue = Math.min(...temps, ...bpm, 0) - 5;
  const xStep = history.length > 1 ? (width - padding * 2) / (history.length - 1) : 0;

  ctx.strokeStyle = "rgba(23, 48, 31, 0.12)";
  ctx.lineWidth = 1;
  for (let line = 0; line < 5; line += 1) {
    const y = padding + ((height - padding * 2) / 4) * line;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const plotSeries = (values, color) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    values.forEach((value, index) => {
      const x = padding + xStep * index;
      const y =
        height - padding - ((value - minValue) / Math.max(maxValue - minValue, 1)) * (height - padding * 2);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  };

  plotSeries(temps, "#d64545");
  plotSeries(bpm, "#1f9d55");

  ctx.fillStyle = "#5f7365";
  ctx.font = "14px Space Grotesk";
  ctx.fillText("Red: Temperature", padding, height - 8);
  ctx.fillText("Green: Heart Rate", padding + 170, height - 8);
}

function renderBlockchain(chain) {
  chainState.textContent = chain.is_chain_valid ? "Chain valid" : "Chain compromised";
  blockchainLogs.innerHTML = chain.data
    .slice(-6)
    .reverse()
    .map((block) => {
      const sensor = block.sensor_data || {};
      return `
        <div class="block-item">
          <strong>Block #${block.index}</strong>
          <div class="block-meta">${new Date(block.timestamp).toLocaleString()}</div>
          <div class="block-meta">
            Temp: ${sensor.temperature ?? "--"} C | HR: ${sensor.heart_rate ?? "--"} bpm
          </div>
          <div class="block-hash">Hash: ${block.hash}</div>
        </div>
      `;
    })
    .join("");
}

async function loadDashboard() {
  try {
    const [latestRes, historyRes, chainRes] = await Promise.all([
      fetch(`${API_BASE_URL}/health-data/latest`),
      fetch(`${API_BASE_URL}/health-data/history?limit=20`),
      fetch(`${API_BASE_URL}/blockchain/logs`),
    ]);

    const latestPayload = await latestRes.json();
    const historyPayload = await historyRes.json();
    const chainPayload = await chainRes.json();

    const reading = latestPayload.data;
    const history = historyPayload.data || [];

    if (reading) {
      temperatureValue.textContent = Number(reading.temperature).toFixed(1);
      heartRateValue.textContent = reading.heart_rate;
      patientMeta.textContent = `${reading.patient_id} on ${reading.device_id}`;
      lastUpdated.textContent = `Updated ${new Date(reading.received_at).toLocaleTimeString()}`;
    }

    const alerts = renderAlerts(reading);
    setStatusBadge(reading?.status, alerts);
    renderChart(history);
    renderBlockchain(chainPayload);
  } catch (error) {
    lastUpdated.textContent = "Backend unreachable";
    patientMeta.textContent = "Start the Flask server to stream live telemetry.";
    alertsList.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

loadDashboard();
setInterval(loadDashboard, 5000);
