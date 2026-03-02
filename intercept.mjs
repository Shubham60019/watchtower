#!/usr/bin/env node

// Claude Code Network Interceptor - Proxy + Dashboard Server
// Usage: node intercept.mjs [proxy_port] [dashboard_port]
// Then run: ANTHROPIC_BASE_URL=http://localhost:<proxy_port> claude

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { WebSocketServer } from "ws";

const PROXY_PORT = parseInt(process.argv[2] || "8024", 10);
const DASHBOARD_PORT = parseInt(process.argv[3] || "8025", 10);
const TARGET = "https://api.anthropic.com";
const LOG_DIR = path.join(process.cwd(), "logs");

fs.mkdirSync(LOG_DIR, { recursive: true });

// ─── In-memory store ────────────────────────────────────────────────
const store = {
  requests: [], // All intercepted request/response pairs
};

let requestCounter = 0;

// ─── Agent hierarchy tracking ────────────────────────────────────────
// When a main agent's SSE response contains an "Agent" tool_use block,
// we know it spawned subagents. We track the parent reqId and the
// tool_use IDs so subsequent requests without the "Agent" tool get
// linked as children via parentId.
let currentParent = null; // { reqId, toolUseIds: [] }

// ─── WebSocket clients ──────────────────────────────────────────────
const wsClients = new Set();

function broadcast(event, data) {
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────
function ts() {
  return new Date().toISOString();
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function decompressResponse(buffer, encoding) {
  return new Promise((resolve, reject) => {
    if (encoding === "gzip") {
      zlib.gunzip(buffer, (err, result) => (err ? reject(err) : resolve(result)));
    } else if (encoding === "br") {
      zlib.brotliDecompress(buffer, (err, result) => (err ? reject(err) : resolve(result)));
    } else if (encoding === "deflate") {
      zlib.inflate(buffer, (err, result) => (err ? reject(err) : resolve(result)));
    } else {
      resolve(buffer);
    }
  });
}

function maskSecrets(headers) {
  const masked = { ...headers };
  if (masked["x-api-key"]) {
    const k = masked["x-api-key"];
    masked["x-api-key"] = k.slice(0, 12) + "..." + k.slice(-4);
  }
  if (masked["authorization"]) {
    const a = masked["authorization"];
    masked["authorization"] = a.slice(0, 20) + "..." + a.slice(-4);
  }
  return masked;
}

function extractRateLimits(headers) {
  const limits = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.startsWith("anthropic-ratelimit")) {
      const shortKey = k.replace("anthropic-ratelimit-", "");
      limits[shortKey] = v;
    }
  }
  return limits;
}

function classifyRequest(method, url, body) {
  if (url.includes("/count_tokens")) return "token_count";
  if (url.includes("/messages") && body?.max_tokens === 1) return "quota_check";
  if (url.includes("/messages") && body?.stream) return "messages_stream";
  if (url.includes("/messages")) return "messages";
  return "unknown";
}

// ─── Console logging ────────────────────────────────────────────────
const C = {
  dim: "\x1b[2m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
};

function log(prefix, msg) {
  const colors = { ">>>": C.cyan, "<<<": C.green, SSE: C.yellow, INFO: C.magenta, ERR: C.red };
  const c = colors[prefix] || C.reset;
  console.log(`${C.dim}${ts()}${C.reset} ${c}${C.bold}[${prefix}]${C.reset} ${msg}`);
}

// ─── Proxy Server ───────────────────────────────────────────────────
const proxyServer = http.createServer(async (req, res) => {
  const reqId = ++requestCounter;
  const startTime = Date.now();

  // Collect request body
  const bodyChunks = [];
  for await (const chunk of req) bodyChunks.push(chunk);
  const rawRequestBody = Buffer.concat(bodyChunks).toString("utf-8");
  const requestBodyParsed = tryParseJson(rawRequestBody);

  const targetUrl = new URL(req.url, TARGET);
  const requestType = classifyRequest(req.method, req.url, requestBodyParsed);

  // Detect agent role from tools array
  const tools = requestBodyParsed?.tools || [];
  const hasAgentTool = tools.some((t) => t.name === "Agent");
  let agentRole = "utility"; // token_count, quota_check
  let parentId = null;
  if (hasAgentTool) {
    agentRole = "main";
    // New main agent turn — becomes the current parent
    currentParent = { reqId, toolUseIds: [] };
  } else if (tools.length > 0) {
    agentRole = "subagent";
    // Link to current parent if one exists with Agent tool_use spawns
    if (currentParent && currentParent.toolUseIds.length > 0) {
      parentId = currentParent.reqId;
    }
  } else {
    // Utility requests (token_count, quota_check) — attach to parent if active
    if (currentParent && currentParent.toolUseIds.length > 0) {
      parentId = currentParent.reqId;
    }
  }

  // Build the record
  const record = {
    id: reqId,
    startTime,
    method: req.method,
    url: req.url,
    type: requestType,
    agentRole,
    parentId,
    requestHeaders: maskSecrets(req.headers),
    requestBody: requestBodyParsed || rawRequestBody,
    // Extract key fields for easy display
    model: requestBodyParsed?.model || null,
    system: requestBodyParsed?.system || null,
    messages: requestBodyParsed?.messages || null,
    tools: requestBodyParsed?.tools || null,
    thinking: requestBodyParsed?.thinking || null,
    stream: requestBodyParsed?.stream || false,
    maxTokens: requestBodyParsed?.max_tokens || null,
    metadata: requestBodyParsed?.metadata || null,
    contextManagement: requestBodyParsed?.context_management || null,
    // Response fields - filled later
    status: null,
    responseHeaders: null,
    responseBody: null,
    rateLimits: null,
    sseEvents: [],
    duration: null,
    error: null,
  };

  store.requests.push(record);
  const parentTag = parentId ? ` parent=#${parentId}` : "";
  log(">>>", `#${reqId} ${req.method} ${req.url} [${requestType}] [${agentRole}${parentTag}] model=${record.model || "n/a"}`);
  broadcast("request_start", {
    id: reqId,
    method: req.method,
    url: req.url,
    type: requestType,
    agentRole,
    parentId,
    model: record.model,
    system: record.system,
    messages: record.messages,
    tools: record.tools ? record.tools.map((t) => ({ name: t.name, description: t.description?.slice(0, 120) })) : null,
    thinking: record.thinking,
    maxTokens: record.maxTokens,
    metadata: record.metadata,
    requestHeaders: record.requestHeaders,
  });

  // Forward to Anthropic - remove accept-encoding so we get plain text
  const proxyHeaders = { ...req.headers };
  delete proxyHeaders["host"];
  delete proxyHeaders["accept-encoding"]; // Force uncompressed response for logging
  proxyHeaders["host"] = targetUrl.host;

  const proxyReq = https.request(targetUrl, { method: req.method, headers: proxyHeaders }, (proxyRes) => {
    const isSSE = (proxyRes.headers["content-type"] || "").includes("text/event-stream");
    const encoding = proxyRes.headers["content-encoding"];

    record.status = proxyRes.statusCode;
    record.responseHeaders = proxyRes.headers;
    record.rateLimits = extractRateLimits(proxyRes.headers);

    log("<<<", `#${reqId} ${proxyRes.statusCode} [${isSSE ? "SSE" : "JSON"}]`);

    // For the client, we forward without content-encoding since we stripped accept-encoding
    const clientHeaders = { ...proxyRes.headers };
    delete clientHeaders["content-encoding"];
    delete clientHeaders["transfer-encoding"];
    res.writeHead(proxyRes.statusCode, clientHeaders);

    if (isSSE) {
      // ── SSE stream handling ──
      let sseBuffer = "";
      let decompressor = null;

      if (encoding === "gzip") decompressor = zlib.createGunzip();
      else if (encoding === "br") decompressor = zlib.createBrotliDecompress();
      else if (encoding === "deflate") decompressor = zlib.createInflate();

      const source = decompressor ? proxyRes.pipe(decompressor) : proxyRes;

      source.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        res.write(text);
        sseBuffer += text;

        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop();

        for (const event of events) {
          if (!event.trim()) continue;
          const lines = event.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) eventData += line.slice(6);
          }

          const parsed = tryParseJson(eventData);
          const sseRecord = { type: eventType, data: parsed || eventData, ts: Date.now() };
          record.sseEvents.push(sseRecord);

          broadcast("sse_event", { requestId: reqId, ...sseRecord });

          // Track Agent tool_use blocks for hierarchy linking
          if (eventType === "content_block_start") {
            const cb = parsed?.content_block;
            if (cb?.type === "tool_use" && cb?.name === "Agent" && currentParent?.reqId === reqId) {
              currentParent.toolUseIds.push(cb.id);
              log("INFO", `#${reqId} Agent tool_use spawned: ${cb.id}`);
              broadcast("agent_spawn", { parentId: reqId, toolUseId: cb.id });
            }
          }

          // Compact console logging
          if (eventType === "content_block_delta") {
            const delta = parsed?.delta;
            if (delta?.type === "text_delta") {
              log("SSE", `#${reqId} text: "${delta.text.slice(0, 80)}${delta.text.length > 80 ? "..." : ""}"`);
            } else if (delta?.type === "thinking_delta") {
              log("SSE", `#${reqId} think: "${delta.thinking.slice(0, 80)}..."`);
            } else {
              log("SSE", `#${reqId} ${eventType}: ${JSON.stringify(delta).slice(0, 120)}`);
            }
          } else if (eventType === "message_start" || eventType === "message_stop" || eventType === "message_delta") {
            log("SSE", `#${reqId} ${eventType}: ${JSON.stringify(parsed).slice(0, 200)}`);
          } else {
            log("SSE", `#${reqId} ${eventType}`);
          }
        }
      });

      source.on("end", () => {
        record.duration = Date.now() - startTime;
        log("<<<", `#${reqId} Stream ended. ${record.sseEvents.length} events, ${record.duration}ms`);
        broadcast("request_end", { id: reqId, duration: record.duration, eventCount: record.sseEvents.length, rateLimits: record.rateLimits });
        saveLog(record);
        res.end();
      });

      source.on("error", (err) => {
        record.error = err.message;
        log("ERR", `#${reqId} Stream error: ${err.message}`);
        res.end();
      });
    } else {
      // ── Standard JSON response ──
      const chunks = [];
      proxyRes.on("data", (c) => chunks.push(c));
      proxyRes.on("end", async () => {
        const raw = Buffer.concat(chunks);
        try {
          const decompressed = await decompressResponse(raw, encoding);
          const text = decompressed.toString("utf-8");
          record.responseBody = tryParseJson(text) || text;
          record.duration = Date.now() - startTime;
          log("<<<", `#${reqId} ${text.length} bytes, ${record.duration}ms`);
          broadcast("request_end", { id: reqId, duration: record.duration, responseBody: record.responseBody, rateLimits: record.rateLimits, status: record.status });
          saveLog(record);
          res.write(decompressed);
          res.end();
        } catch (err) {
          // If decompression fails, forward raw
          record.responseBody = "(binary/compressed - decompression failed)";
          record.duration = Date.now() - startTime;
          broadcast("request_end", { id: reqId, duration: record.duration, error: err.message });
          res.write(raw);
          res.end();
        }
      });
    }
  });

  proxyReq.on("error", (err) => {
    record.error = err.message;
    record.duration = Date.now() - startTime;
    log("ERR", `#${reqId} Proxy error: ${err.message}`);
    broadcast("request_end", { id: reqId, error: err.message });
    res.writeHead(502);
    res.end(JSON.stringify({ error: "Proxy error", message: err.message }));
  });

  if (rawRequestBody) proxyReq.write(rawRequestBody);
  proxyReq.end();
});

function saveLog(record) {
  const filename = `${String(record.id).padStart(4, "0")}_${record.type}_${record.model || "unknown"}.json`;
  fs.writeFileSync(path.join(LOG_DIR, filename), JSON.stringify(record, null, 2));
}

// ─── Dashboard Server ───────────────────────────────────────────────
const dashboardHtml = fs.readFileSync(path.join(import.meta.dirname, "dashboard.html"), "utf-8");

const dashboardServer = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(dashboardHtml);
  } else if (req.url === "/api/requests") {
    res.writeHead(200, { "content-type": "application/json" });
    // Send summary list
    const summary = store.requests.map((r) => ({
      id: r.id,
      type: r.type,
      agentRole: r.agentRole,
      parentId: r.parentId,
      method: r.method,
      url: r.url,
      model: r.model,
      status: r.status,
      duration: r.duration,
      startTime: r.startTime,
      sseEventCount: r.sseEvents?.length || 0,
      messageCount: r.messages?.length || 0,
      toolCount: r.tools?.length || 0,
      error: r.error,
    }));
    res.end(JSON.stringify(summary));
  } else if (req.url.startsWith("/api/request/")) {
    const id = parseInt(req.url.split("/").pop(), 10);
    const record = store.requests.find((r) => r.id === id);
    if (record) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(record));
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const wss = new WebSocketServer({ server: dashboardServer });
wss.on("connection", (ws) => {
  wsClients.add(ws);
  // Send current state
  ws.send(JSON.stringify({ event: "init", data: { requestCount: store.requests.length } }));
  ws.on("close", () => wsClients.delete(ws));
});

// ─── Start ──────────────────────────────────────────────────────────
proxyServer.listen(PROXY_PORT, () => {
  dashboardServer.listen(DASHBOARD_PORT, () => {
    console.log(`
${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════╗
║           Claude Code Network Interceptor                 ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Proxy:     ${C.reset}${C.bold}http://localhost:${PROXY_PORT}${C.cyan}                          ║
║  Dashboard: ${C.reset}${C.bold}http://localhost:${DASHBOARD_PORT}${C.cyan}                          ║
║  Target:    ${C.reset}${C.dim}${TARGET}${C.cyan}                   ║
║  Logs:      ${C.reset}${C.dim}./logs/${C.cyan}                                        ║
║                                                           ║
║  ${C.reset}${C.yellow}ANTHROPIC_BASE_URL=http://localhost:${PROXY_PORT} claude${C.cyan}         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${C.reset}
`);
  });
});
