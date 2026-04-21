// Node-oriented editable pro deck builder.
// Run this after editing SLIDES, SOURCES, and layout functions.
// The init script installs a sibling node_modules/@oai/artifact-tool package link
// and package.json with type=module for shell-run eval builders. Run with the
// Node executable from Codex workspace dependencies or the platform-appropriate
// command emitted by the init script.
// Do not use pnpm exec from the repo root or any Node binary whose module
// lookup cannot resolve the builder's sibling node_modules/@oai/artifact-tool.

const fs = await import("node:fs/promises");
const path = await import("node:path");
const { Presentation, PresentationFile } = await import("@oai/artifact-tool");

const W = 1280;
const H = 720;

const DECK_ID = "app-design-review";
const OUT_DIR = "/Users/chinnadurairamachandran/Downloads/maintenance management app/output/presentation/app-design-review-2026-04-20/final";
const REF_DIR = "/Users/chinnadurairamachandran/Downloads/maintenance management app/output/presentation/app-design-review-2026-04-20/references";
const SCRATCH_DIR = path.resolve(process.env.PPTX_SCRATCH_DIR || path.join("tmp", "slides", DECK_ID));
const PREVIEW_DIR = path.join(SCRATCH_DIR, "preview");
const VERIFICATION_DIR = path.join(SCRATCH_DIR, "verification");
const INSPECT_PATH = path.join(SCRATCH_DIR, "inspect.ndjson");
const MAX_RENDER_VERIFY_LOOPS = 3;

const INK = "#0F172A";
const GRAPHITE = "#334155";
const MUTED = "#64748B";
const PAPER = "#F8FAFC";
const PAPER_96 = "#FFFFFFF2";
const WHITE = "#FFFFFF";
const ACCENT = "#0F9D94";
const ACCENT_DARK = "#0B5F62";
const GOLD = "#F59E0B";
const CORAL = "#2563EB";
const TRANSPARENT = "#00000000";

const TITLE_FACE = "Poppins";
const BODY_FACE = "Aptos";
const MONO_FACE = "Aptos Mono";

const FALLBACK_PLATE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const SOURCES = {
  readme: "deploy/README.md",
  app: "deploy/client/src/App.tsx",
  hub: "deploy/client/src/modules/core/pages/EnterpriseHub.tsx",
  procurement: "deploy/client/src/modules/procurement/pages/DashboardPage.tsx",
  chat: "deploy/client/src/modules/cognitive/ChatInterface.tsx",
  mobileHome: "deploy/mobile/app/(tabs)/index.tsx",
  mobilePkg: "deploy/mobile/package.json",
  server: "deploy/server/src/index.ts",
  auth: "deploy/server/src/controllers/authController.ts",
  schema: "deploy/server/prisma/schema.prisma",
  cognitiveMain: "deploy/cognitive/main.py",
  llm: "deploy/cognitive/llm_service.py",
};

const SLIDES = [
  {
    kicker: "APP DESIGN + ARCHITECTURE",
    title: "Maintenance Management System\nArchitecture & Code Review",
    subtitle:
      "Design, module UX, code structure and review snapshot for ONGC Ankleshwar Asset across the web console, Expo mobile app, backend services and Kelvin AI.",
    moment: "One platform, 18 operational modules, shared data core",
    notes:
      "Position the app as a unified operating system for maintenance, not a single dashboard. Emphasize shared identity, shared data, and multiple work surfaces.",
    sources: ["readme", "app", "hub", "server", "schema"],
  },
  {
    kicker: "PLATFORM SNAPSHOT",
    title: "The product already behaves like an integrated operations suite",
    subtitle:
      "The codebase spans planning, execution, reliability, documents, collaboration, and AI assistance with one operational data backbone.",
    metrics: [
      ["18", "Role-aware web modules on the enterprise hub", "EnterpriseHub.tsx"],
      ["31", "Mounted API route groups in Express", "server/src/index.ts"],
      ["90", "Prisma models in the shared schema", "server/prisma/schema.prisma"],
    ],
    badges: ["Web Console", "Expo Mobile", "Shared DB"],
    notes:
      "Use these numbers to establish breadth. The main point is that the system is already broad enough to support multiple user types and workflows.",
    sources: ["hub", "server", "schema"],
  },
  {
    kicker: "DESIGN SHELL",
    title: "The experience is built around a universal login and module-first navigation",
    subtitle:
      "Users land on a role-filtered hub, move directly into specialist workflows, and keep one session across procurement, manuals, KPIs, work orders, and inspections.",
    cards: [
      ["Role-based hub", "Web home exposes 18 apps and trims visibility by role so technicians, supervisors and admins see different operational surfaces."],
      ["Universal auth", "ProtectedRoute, PublicRoute and the shared AuthContext now govern the whole shell so modules no longer bounce users back to login mid-flow."],
      ["Focused layouts", "Procurement, manuals, contracts and work orders each own dense task views instead of forcing every workflow into one generic dashboard."],
    ],
    badges: ["RBAC", "Universal Login", "Module Hubs"],
    notes:
      "This slide explains the product design philosophy: keep navigation thin, push users quickly into domain modules, and make auth global rather than module-local.",
    sources: ["app", "hub", "procurement"],
  },
  {
    kicker: "MOBILE + AI",
    title: "The mobile shell mirrors field work, while Kelvin adds cross-module retrieval",
    subtitle:
      "Expo Router turns the phone app into a field cockpit with KPI strips, health watch, module cards and a floating AI assistant linked to local Gemma 4 models.",
    cards: [
      ["Field cockpit", "The mobile home screen surfaces KPI summary, health watch and module shortcuts for operations, planning and admin tasks."],
      ["Shared permissions", "Mobile auth uses secure storage and the same token model, so the same workforce can move between browser and handset without separate identities."],
      ["Kelvin AI", "The cognitive service exposes rule-based and LLM-backed chat, model discovery, RAG context building and local Gemma 4 selection."],
    ],
    badges: ["Expo Router", "Secure Store", "Gemma 4"],
    notes:
      "Connect the mobile shell to the broader system. Kelvin should be positioned as an assistant over the same modules rather than an isolated chatbot.",
    sources: ["mobileHome", "mobilePkg", "chat", "cognitiveMain", "llm"],
  },
  {
    kicker: "SYSTEM ARCHITECTURE",
    title: "The architecture separates presentation, orchestration and intelligence cleanly",
    subtitle:
      "Each layer is independently deployable, but the app still behaves like one platform because routing, auth and data contracts stay centralized.",
    cards: [
      ["Presentation layer", "Vite React web and Expo React Native provide task-specific shells for control room and field use, both speaking HTTP APIs and surfacing role-aware modules."],
      ["Application layer", "Express mounts 31 route groups and uses Prisma, JWT auth, cron services, document storage and module-specific controllers to orchestrate work."],
      ["Data + intelligence", "PostgreSQL holds the operational truth, Redis supports runtime services, and FastAPI-based Kelvin adds RAG plus local Ollama model execution."],
    ],
    badges: ["React", "Express", "FastAPI"],
    notes:
      "Keep this slide crisp. The key architectural message is controlled separation: multiple runtimes, one coherent platform contract.",
    sources: ["readme", "server", "cognitiveMain", "llm", "schema"],
  },
  {
    kicker: "CODE STRUCTURE",
    title: "The code is organized by product surface rather than only by framework layer",
    subtitle:
      "That makes module ownership easy to reason about, but it also reveals where large screens and thin service wrappers need refactoring.",
    metrics: [
      ["29", "Web routes wired through client App.tsx", "client/src/App.tsx"],
      ["4", "Primary runtime trunks: web, server, mobile, cognitive", "deploy/*"],
      ["0", "Checked-in automated test files today", "Jest configured but unused"],
    ],
    badges: ["Module Folders", "Prisma Core", "Testing Gap"],
    notes:
      "This slide balances praise with review pressure. The foldering is understandable, but testing and some screen sizes need work.",
    sources: ["app", "readme", "mobilePkg"],
  },
  {
    kicker: "SALIENT FEATURES",
    title: "Operational depth is the standout quality of the app",
    subtitle:
      "This is not a toy dashboard. The platform already covers the workflows a plant team actually needs across maintenance, documents, analytics and planning.",
    cards: [
      ["Execution workflows", "Assets, work orders, workshop, logbook, calibration, inspections and overhaul modules cover planning through field closure."],
      ["Planning and support", "Procurement, MRP, manpower, contracts, training, energy, reports and collaboration widen the system from maintenance execution into enterprise coordination."],
      ["Knowledge + analytics", "Manuals, drawings, KPI summaries, health tables and Kelvin AI make the app searchable and decision-support oriented instead of purely transactional."],
    ],
    badges: ["Execution", "Planning", "Knowledge"],
    notes:
      "This is the functional value slide. Stress the range of enterprise workflows already present in the same product.",
    sources: ["hub", "procurement", "chat", "server"],
  },
  {
    kicker: "CODE REVIEW",
    title: "The most important review work is around trust boundaries and reliability",
    subtitle:
      "The recent fixes focus on preserving universal login, keeping permission mutations alive, and ensuring schema changes are actually deployable.",
    cards: [
      ["Fixed", "User permission flow in authController again returns and updates canCreateWorkOrder and canCloseWorkOrder, which keeps manpower controls functional."],
      ["Fixed", "Prisma migration coverage now exists for the added audit, repository and gas compression tables so documented deploys can create the new schema objects."],
      ["Still worth doing", "The app needs broader tests, stricter typed API clients, endpoint-level scope enforcement for contractor access, and continued decomposition of the largest module screens."],
    ],
    badges: ["Permissions", "Migrations", "Reliability"],
    notes:
      "Anchor this slide in the two concrete review findings, then broaden into the next risk areas: tests, typing, and server-side authorization scope.",
    sources: ["auth", "schema", "server"],
  },
  {
    kicker: "NEXT MOVE",
    title: "The current platform is ready for a scoped contractor workspace on the same database",
    subtitle:
      "Because the system already has a broad operational schema and shared auth patterns, the next expansion should be a permission-scoped external shell rather than a separate product.",
    cards: [
      ["Contract workspaces", "Use Contract as the workspace root, map external users to scoped installations, assets and instrument types, and enforce that scope on every contractor API."],
      ["Shared operating model", "Internal and external teams can update the same instruments, equipment, reports and work orders as long as permissions stay server-side and auditable."],
      ["Execution priority", "Harden API authorization, add canary tests, simplify the largest screens and tune local Gemma performance before scaling the app outward."],
    ],
    badges: ["Same DB", "Scoped Access", "Next Phase"],
    notes:
      "Close by connecting the architecture to the planned contractor mini-app. Same data model, different shell, server-enforced scope.",
    sources: ["schema", "auth", "server", "llm"],
  },
];

const ONGC_LOGO_PATH = "/Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/client/public/ongc_logo.jpg";
const MOBILE_ICON_PATH = "/Users/chinnadurairamachandran/Downloads/maintenance management app/deploy/mobile/assets/images/icon.png";

const inspectRecords = [];

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  if (!bytes.byteLength) {
    throw new Error(`Image file is empty: ${imagePath}`);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function normalizeImageConfig(config) {
  if (!config.path) {
    return config;
  }
  const { path: imagePath, ...rest } = config;
  return {
    ...rest,
    blob: await readImageBlob(imagePath),
  };
}

async function ensureDirs() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const obsoleteFinalArtifacts = [
    "preview",
    "verification",
    "inspect.ndjson",
    ["presentation", "proto.json"].join("_"),
    ["quality", "report.json"].join("_"),
  ];
  for (const obsolete of obsoleteFinalArtifacts) {
    await fs.rm(path.join(OUT_DIR, obsolete), { recursive: true, force: true });
  }
  await fs.mkdir(SCRATCH_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(VERIFICATION_DIR, { recursive: true });
}

function lineConfig(fill = TRANSPARENT, width = 0) {
  return { style: "solid", fill, width };
}

function recordShape(slideNo, shape, role, shapeType, x, y, w, h) {
  if (!slideNo) return;
  inspectRecords.push({
    kind: "shape",
    slide: slideNo,
    id: shape?.id || `slide-${slideNo}-${role}-${inspectRecords.length + 1}`,
    role,
    shapeType,
    bbox: [x, y, w, h],
  });
}

function addShape(slide, geometry, x, y, w, h, fill = TRANSPARENT, line = TRANSPARENT, lineWidth = 0, meta = {}) {
  const shape = slide.shapes.add({
    geometry,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: lineConfig(line, lineWidth),
  });
  recordShape(meta.slideNo, shape, meta.role || geometry, geometry, x, y, w, h);
  return shape;
}

function normalizeText(text) {
  if (Array.isArray(text)) {
    return text.map((item) => String(item ?? "")).join("\n");
  }
  return String(text ?? "");
}

function textLineCount(text) {
  const value = normalizeText(text);
  if (!value.trim()) {
    return 0;
  }
  return Math.max(1, value.split(/\n/).length);
}

function requiredTextHeight(text, fontSize, lineHeight = 1.18, minHeight = 8) {
  const lines = textLineCount(text);
  if (lines === 0) {
    return minHeight;
  }
  return Math.max(minHeight, lines * fontSize * lineHeight);
}

function assertTextFits(text, boxHeight, fontSize, role = "text") {
  const required = requiredTextHeight(text, fontSize);
  const tolerance = Math.max(2, fontSize * 0.08);
  if (normalizeText(text).trim() && boxHeight + tolerance < required) {
    throw new Error(
      `${role} text box is too short: height=${boxHeight.toFixed(1)}, required>=${required.toFixed(1)}, ` +
        `lines=${textLineCount(text)}, fontSize=${fontSize}, text=${JSON.stringify(normalizeText(text).slice(0, 90))}`,
    );
  }
}

function wrapText(text, widthChars) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > widthChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.join("\n");
}

function recordText(slideNo, shape, role, text, x, y, w, h) {
  const value = normalizeText(text);
  inspectRecords.push({
    kind: "textbox",
    slide: slideNo,
    id: shape?.id || `slide-${slideNo}-${role}-${inspectRecords.length + 1}`,
    role,
    text: value,
    textPreview: value.replace(/\n/g, " | ").slice(0, 180),
    textChars: value.length,
    textLines: textLineCount(value),
    bbox: [x, y, w, h],
  });
}

function recordImage(slideNo, image, role, imagePath, x, y, w, h) {
  inspectRecords.push({
    kind: "image",
    slide: slideNo,
    id: image?.id || `slide-${slideNo}-${role}-${inspectRecords.length + 1}`,
    role,
    path: imagePath,
    bbox: [x, y, w, h],
  });
}

function applyTextStyle(box, text, size, color, bold, face, align, valign, autoFit, listStyle) {
  box.text = text;
  box.text.fontSize = size;
  box.text.color = color;
  box.text.bold = Boolean(bold);
  box.text.alignment = align;
  box.text.verticalAlignment = valign;
  box.text.typeface = face;
  box.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  if (autoFit) {
    box.text.autoFit = autoFit;
  }
  if (listStyle) {
    box.text.style = "list";
  }
}

function addText(
  slide,
  slideNo,
  text,
  x,
  y,
  w,
  h,
  {
    size = 22,
    color = INK,
    bold = false,
    face = BODY_FACE,
    align = "left",
    valign = "top",
    fill = TRANSPARENT,
    line = TRANSPARENT,
    lineWidth = 0,
    autoFit = null,
    listStyle = false,
    checkFit = true,
    role = "text",
  } = {},
) {
  if (!checkFit && textLineCount(text) > 1) {
    throw new Error("checkFit=false is only allowed for single-line headers, footers, and captions.");
  }
  if (checkFit) {
    assertTextFits(text, h, size, role);
  }
  const box = addShape(slide, "rect", x, y, w, h, fill, line, lineWidth);
  applyTextStyle(box, text, size, color, bold, face, align, valign, autoFit, listStyle);
  recordText(slideNo, box, role, text, x, y, w, h);
  return box;
}

async function addImage(slide, slideNo, config, position, role, sourcePath = null) {
  const image = slide.images.add(await normalizeImageConfig(config));
  image.position = position;
  recordImage(slideNo, image, role, sourcePath || config.path || config.uri || "inline-data-url", position.left, position.top, position.width, position.height);
  return image;
}

async function addPlate(slide, slideNo, opacityPanel = false) {
  slide.background.fill = PAPER;
  const platePath = path.join(REF_DIR, `slide-${String(slideNo).padStart(2, "0")}.png`);
  if (await pathExists(platePath)) {
    await addImage(
      slide,
      slideNo,
      { path: platePath, fit: "cover", alt: `Text-free art-direction plate for slide ${slideNo}` },
      { left: 0, top: 0, width: W, height: H },
      "art plate",
      platePath,
    );
  } else {
    await addImage(
      slide,
      slideNo,
      { dataUrl: FALLBACK_PLATE_DATA_URL, fit: "cover", alt: `Fallback blank art plate for slide ${slideNo}` },
      { left: 0, top: 0, width: W, height: H },
      "fallback art plate",
      "fallback-data-url",
    );
    addShape(slide, "ellipse", 944, -88, 412, 412, "#CFFAFE", TRANSPARENT, 0, { slideNo, role: "ambient shape" });
    addShape(slide, "ellipse", 998, 492, 196, 196, "#E0F2FE", TRANSPARENT, 0, { slideNo, role: "ambient shape" });
    addShape(slide, "ellipse", -120, 512, 304, 304, "#FEF3C7", TRANSPARENT, 0, { slideNo, role: "ambient shape" });
    addShape(slide, "rect", 1088, 84, 4, 560, ACCENT, TRANSPARENT, 0, { slideNo, role: "ambient rule" });
    addShape(slide, "roundRect", 1110, 94, 80, 80, "#FFFFFFC7", TRANSPARENT, 0, { slideNo, role: "ambient badge" });
  }
  if (opacityPanel) {
    addShape(slide, "rect", 0, 0, W, H, "#FFFFFFB8", TRANSPARENT, 0, { slideNo, role: "plate readability overlay" });
  }
}

function addHeader(slide, slideNo, kicker, idx, total) {
  addText(slide, slideNo, String(kicker || "").toUpperCase(), 64, 34, 430, 24, {
    size: 13,
    color: ACCENT_DARK,
    bold: true,
    face: MONO_FACE,
    checkFit: false,
    role: "header",
  });
  addText(slide, slideNo, `${String(idx).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 1114, 34, 104, 24, {
    size: 13,
    color: ACCENT_DARK,
    bold: true,
    face: MONO_FACE,
    align: "right",
    checkFit: false,
    role: "header",
  });
  addShape(slide, "rect", 64, 64, 1152, 2, INK, TRANSPARENT, 0, { slideNo, role: "header rule" });
  addShape(slide, "ellipse", 57, 57, 16, 16, ACCENT, INK, 2, { slideNo, role: "header marker" });
}

function addTitleBlock(slide, slideNo, title, subtitle = null, x = 64, y = 86, w = 780, dark = false) {
  const titleColor = dark ? PAPER : INK;
  const bodyColor = dark ? PAPER : GRAPHITE;
  addText(slide, slideNo, title, x, y, w, 142, {
    size: 40,
    color: titleColor,
    bold: true,
    face: TITLE_FACE,
    role: "title",
  });
  if (subtitle) {
    addText(slide, slideNo, subtitle, x + 2, y + 148, Math.min(w, 720), 70, {
      size: 19,
      color: bodyColor,
      face: BODY_FACE,
      role: "subtitle",
    });
  }
}

function addIconBadge(slide, slideNo, x, y, accent = ACCENT, kind = "signal") {
  addShape(slide, "ellipse", x, y, 54, 54, PAPER_96, INK, 1.2, { slideNo, role: "icon badge" });
  if (kind === "flow") {
    addShape(slide, "ellipse", x + 13, y + 18, 10, 10, accent, INK, 1, { slideNo, role: "icon glyph" });
    addShape(slide, "ellipse", x + 31, y + 27, 10, 10, accent, INK, 1, { slideNo, role: "icon glyph" });
    addShape(slide, "rect", x + 22, y + 25, 19, 3, INK, TRANSPARENT, 0, { slideNo, role: "icon glyph" });
  } else if (kind === "layers") {
    addShape(slide, "roundRect", x + 13, y + 15, 26, 13, accent, INK, 1, { slideNo, role: "icon glyph" });
    addShape(slide, "roundRect", x + 18, y + 24, 26, 13, GOLD, INK, 1, { slideNo, role: "icon glyph" });
    addShape(slide, "roundRect", x + 23, y + 33, 20, 10, CORAL, INK, 1, { slideNo, role: "icon glyph" });
  } else {
    addShape(slide, "rect", x + 16, y + 29, 6, 12, accent, TRANSPARENT, 0, { slideNo, role: "icon glyph" });
    addShape(slide, "rect", x + 25, y + 21, 6, 20, accent, TRANSPARENT, 0, { slideNo, role: "icon glyph" });
    addShape(slide, "rect", x + 34, y + 14, 6, 27, accent, TRANSPARENT, 0, { slideNo, role: "icon glyph" });
  }
}

function addCard(slide, slideNo, x, y, w, h, label, body, { accent = ACCENT, fill = PAPER_96, line = INK, iconKind = "signal" } = {}) {
  if (h < 156) {
    throw new Error(`Card is too short for editable pro-deck copy: height=${h.toFixed(1)}, minimum=156.`);
  }
  addShape(slide, "roundRect", x, y, w, h, fill, line, 1.2, { slideNo, role: `card panel: ${label}` });
  addShape(slide, "rect", x, y, 8, h, accent, TRANSPARENT, 0, { slideNo, role: `card accent: ${label}` });
  addIconBadge(slide, slideNo, x + 22, y + 24, accent, iconKind);
  addText(slide, slideNo, label, x + 88, y + 22, w - 108, 28, {
    size: 15,
    color: ACCENT_DARK,
    bold: true,
    face: MONO_FACE,
    role: "card label",
  });
  const wrapped = wrapText(body, Math.max(32, Math.floor(w / 10)));
  const bodyY = y + 86;
  const bodyH = h - (bodyY - y) - 22;
  if (bodyH < 54) {
    throw new Error(`Card body area is too short: height=${bodyH.toFixed(1)}, cardHeight=${h.toFixed(1)}, label=${JSON.stringify(label)}.`);
  }
  addText(slide, slideNo, wrapped, x + 24, bodyY, w - 48, bodyH, {
    size: 15,
    color: INK,
    face: BODY_FACE,
    role: `card body: ${label}`,
  });
}

function addMetricCard(slide, slideNo, x, y, w, h, metric, label, note = null, accent = ACCENT) {
  if (h < 132) {
    throw new Error(`Metric card is too short for editable pro-deck copy: height=${h.toFixed(1)}, minimum=132.`);
  }
  addShape(slide, "roundRect", x, y, w, h, PAPER_96, INK, 1.2, { slideNo, role: `metric panel: ${label}` });
  addShape(slide, "rect", x, y, w, 7, accent, TRANSPARENT, 0, { slideNo, role: `metric accent: ${label}` });
  addText(slide, slideNo, metric, x + 22, y + 24, w - 44, 54, {
    size: 34,
    color: INK,
    bold: true,
    face: TITLE_FACE,
    role: "metric value",
  });
  addText(slide, slideNo, label, x + 24, y + 82, w - 48, 38, {
    size: 16,
    color: GRAPHITE,
    face: BODY_FACE,
    role: "metric label",
  });
  if (note) {
    addText(slide, slideNo, note, x + 24, y + h - 42, w - 48, 22, {
      size: 10,
      color: MUTED,
      face: BODY_FACE,
      role: "metric note",
    });
  }
}

function addNotes(slide, body, sourceKeys) {
  const sourceLines = (sourceKeys || []).map((key) => `- ${SOURCES[key] || key}`).join("\n");
  slide.speakerNotes.setText(`${body || ""}\n\n[Sources]\n${sourceLines}`);
}

function addBadgePills(slide, slideNo, badges = [], x = 858, y = 126) {
  badges.slice(0, 3).forEach((badge, index) => {
    const top = y + index * 40;
    addShape(slide, "roundRect", x, top, 248, 30, "#FFFFFFD9", "#D7E3F0", 1, { slideNo, role: "badge pill" });
    addText(slide, slideNo, badge, x + 16, top + 6, 216, 18, {
      size: 11,
      color: ACCENT_DARK,
      bold: true,
      face: MONO_FACE,
      align: "center",
      checkFit: false,
      role: "badge pill text",
    });
  });
}

function addReferenceCaption(slide, slideNo) {
  addText(
    slide,
    slideNo,
    "Repository snapshot: 20 Apr 2026",
    64,
    674,
    340,
    22,
    {
      size: 10,
      color: MUTED,
      face: BODY_FACE,
      checkFit: false,
      role: "caption",
    },
  );
}

async function slideCover(presentation) {
  const slideNo = 1;
  const data = SLIDES[0];
  const slide = presentation.slides.add();
  await addPlate(slide, slideNo);
  addShape(slide, "rect", 0, 0, W, H, "#FFFFFFD4", TRANSPARENT, 0, { slideNo, role: "cover contrast overlay" });
  addShape(slide, "rect", 64, 86, 8, 476, ACCENT, TRANSPARENT, 0, { slideNo, role: "cover accent rule" });
  addShape(slide, "roundRect", 834, 126, 350, 432, "#FFFFFFD8", "#D7E3F0", 1, { slideNo, role: "cover side panel" });
  if (await pathExists(ONGC_LOGO_PATH)) {
    addShape(slide, "roundRect", 972, 62, 180, 72, WHITE, "#D7E3F0", 1, { slideNo, role: "logo frame" });
    await addImage(
      slide,
      slideNo,
      { path: ONGC_LOGO_PATH, fit: "contain", alt: "ONGC logo" },
      { left: 992, top: 74, width: 140, height: 48 },
      "ongc logo",
      ONGC_LOGO_PATH,
    );
  }
  addText(slide, slideNo, data.kicker, 86, 88, 520, 26, {
    size: 13,
    color: ACCENT_DARK,
    bold: true,
    face: MONO_FACE,
    role: "kicker",
  });
  addText(slide, slideNo, data.title, 82, 130, 785, 184, {
    size: 48,
    color: INK,
    bold: true,
    face: TITLE_FACE,
    role: "cover title",
  });
  addText(slide, slideNo, data.subtitle, 86, 326, 610, 86, {
    size: 20,
    color: GRAPHITE,
    face: BODY_FACE,
    role: "cover subtitle",
  });
  [
    ["Web Console", "29 routes, role-aware hub, dense specialist modules"],
    ["Mobile Field App", "Expo Router shell with KPI strip, health watch and module cards"],
    ["Kelvin AI", "FastAPI RAG service with local Ollama and Gemma 4 model discovery"],
  ].forEach(([label, body], idx) => {
    const top = 166 + idx * 112;
    addShape(slide, "roundRect", 866, top, 286, 88, "#F8FAFC", "#D7E3F0", 1, { slideNo, role: "cover capability card" });
    addText(slide, slideNo, label, 890, top + 16, 236, 20, {
      size: 14,
      color: ACCENT_DARK,
      bold: true,
      face: MONO_FACE,
      checkFit: false,
      role: "cover capability label",
    });
    addText(slide, slideNo, body, 890, top + 40, 236, 28, {
      size: 13,
      color: GRAPHITE,
      face: BODY_FACE,
      role: "cover capability body",
    });
  });
  addShape(slide, "roundRect", 86, 456, 390, 92, PAPER_96, INK, 1.2, { slideNo, role: "cover moment panel" });
  addText(slide, slideNo, data.moment || "Replace with core idea", 112, 478, 336, 40, {
    size: 23,
    color: INK,
    bold: true,
    face: TITLE_FACE,
    role: "cover moment",
  });
  addReferenceCaption(slide, slideNo);
  addNotes(slide, data.notes, data.sources);
}

async function slideCards(presentation, idx) {
  const data = SLIDES[idx - 1];
  const slide = presentation.slides.add();
  await addPlate(slide, idx);
  addShape(slide, "rect", 0, 0, W, H, "#FFFFFFB8", TRANSPARENT, 0, { slideNo: idx, role: "content contrast overlay" });
  addHeader(slide, idx, data.kicker, idx, SLIDES.length);
  addTitleBlock(slide, idx, data.title, data.subtitle, 64, 86, 760);
  if (data.badges?.length) {
    addBadgePills(slide, idx, data.badges);
  }
  if (idx === 4 && (await pathExists(MOBILE_ICON_PATH))) {
    addShape(slide, "roundRect", 1102, 540, 84, 84, "#FFFFFFD9", "#D7E3F0", 1, { slideNo: idx, role: "mobile icon frame" });
    await addImage(
      slide,
      idx,
      { path: MOBILE_ICON_PATH, fit: "contain", alt: "Mobile app icon" },
      { left: 1113, top: 551, width: 62, height: 62 },
      "mobile icon",
      MOBILE_ICON_PATH,
    );
  }
  const cards = data.cards?.length
    ? data.cards
    : [
        ["Replace", "Add a specific, sourced point for this slide."],
        ["Author", "Use native PowerPoint chart objects for charts; use deterministic geometry for cards and callouts."],
        ["Verify", "Render previews, inspect them at readable size, and fix actionable layout issues within 3 total render loops."],
      ];
  const cols = Math.min(3, cards.length);
  const cardW = (1114 - (cols - 1) * 24) / cols;
  const iconKinds = ["signal", "flow", "layers"];
  for (let cardIdx = 0; cardIdx < cols; cardIdx += 1) {
    const [label, body] = cards[cardIdx];
    const x = 84 + cardIdx * (cardW + 24);
    addCard(slide, idx, x, 382, cardW, 214, label, body, { iconKind: iconKinds[cardIdx % iconKinds.length] });
  }
  addReferenceCaption(slide, idx);
  addNotes(slide, data.notes, data.sources);
}

async function slideMetrics(presentation, idx) {
  const data = SLIDES[idx - 1];
  const slide = presentation.slides.add();
  await addPlate(slide, idx);
  addShape(slide, "rect", 0, 0, W, H, "#FFFFFFBD", TRANSPARENT, 0, { slideNo: idx, role: "metrics contrast overlay" });
  addHeader(slide, idx, data.kicker, idx, SLIDES.length);
  addTitleBlock(slide, idx, data.title, data.subtitle, 64, 86, 700);
  if (data.badges?.length) {
    addBadgePills(slide, idx, data.badges);
  }
  const metrics = data.metrics || [
    ["00", "Replace metric", "Source"],
    ["00", "Replace metric", "Source"],
    ["00", "Replace metric", "Source"],
  ];
  const accents = [ACCENT, GOLD, CORAL];
  for (let metricIdx = 0; metricIdx < Math.min(3, metrics.length); metricIdx += 1) {
    const [metric, label, note] = metrics[metricIdx];
    addMetricCard(slide, idx, 92 + metricIdx * 370, 404, 330, 174, metric, label, note, accents[metricIdx % accents.length]);
  }
  addReferenceCaption(slide, idx);
  addNotes(slide, data.notes, data.sources);
}

async function createDeck() {
  await ensureDirs();
  if (!SLIDES.length) {
    throw new Error("SLIDES must contain at least one slide.");
  }
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });
  await slideCover(presentation);
  for (let idx = 2; idx <= SLIDES.length; idx += 1) {
    const data = SLIDES[idx - 1];
    if (data.metrics) {
      await slideMetrics(presentation, idx);
    } else {
      await slideCards(presentation, idx);
    }
  }
  return presentation;
}

async function saveBlobToFile(blob, filePath) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function writeInspectArtifact(presentation) {
  inspectRecords.unshift({
    kind: "deck",
    id: DECK_ID,
    slideCount: presentation.slides.count,
    slideSize: { width: W, height: H },
  });
  presentation.slides.items.forEach((slide, index) => {
    inspectRecords.splice(index + 1, 0, {
      kind: "slide",
      slide: index + 1,
      id: slide?.id || `slide-${index + 1}`,
    });
  });
  const lines = inspectRecords.map((record) => JSON.stringify(record)).join("\n") + "\n";
  await fs.writeFile(INSPECT_PATH, lines, "utf8");
}

async function currentRenderLoopCount() {
  const logPath = path.join(VERIFICATION_DIR, "render_verify_loops.ndjson");
  if (!(await pathExists(logPath))) return 0;
  const previous = await fs.readFile(logPath, "utf8");
  return previous.split(/\r?\n/).filter((line) => line.trim()).length;
}

async function nextRenderLoopNumber() {
  return (await currentRenderLoopCount()) + 1;
}

async function appendRenderVerifyLoop(presentation, previewPaths, pptxPath) {
  const logPath = path.join(VERIFICATION_DIR, "render_verify_loops.ndjson");
  const priorCount = await currentRenderLoopCount();
  const record = {
    kind: "render_verify_loop",
    deckId: DECK_ID,
    loop: priorCount + 1,
    maxLoops: MAX_RENDER_VERIFY_LOOPS,
    capReached: priorCount + 1 >= MAX_RENDER_VERIFY_LOOPS,
    timestamp: new Date().toISOString(),
    slideCount: presentation.slides.count,
    previewCount: previewPaths.length,
    previewDir: PREVIEW_DIR,
    inspectPath: INSPECT_PATH,
    pptxPath,
  };
  await fs.appendFile(logPath, JSON.stringify(record) + "\n", "utf8");
  return record;
}

async function verifyAndExport(presentation) {
  await ensureDirs();
  const nextLoop = await nextRenderLoopNumber();
  if (nextLoop > MAX_RENDER_VERIFY_LOOPS) {
    throw new Error(
      `Render/verify/fix loop cap reached: ${MAX_RENDER_VERIFY_LOOPS} total renders are allowed. ` +
        "Do not rerender; note any remaining visual issues in the final response.",
    );
  }
  await writeInspectArtifact(presentation);
  const previewPaths = [];
  for (let idx = 0; idx < presentation.slides.items.length; idx += 1) {
    const slide = presentation.slides.items[idx];
    const preview = await presentation.export({ slide, format: "png", scale: 1 });
    const previewPath = path.join(PREVIEW_DIR, `slide-${String(idx + 1).padStart(2, "0")}.png`);
    await saveBlobToFile(preview, previewPath);
    previewPaths.push(previewPath);
  }
  const pptxBlob = await PresentationFile.exportPptx(presentation);
  const pptxPath = path.join(OUT_DIR, "output.pptx");
  await pptxBlob.save(pptxPath);
  const loopRecord = await appendRenderVerifyLoop(presentation, previewPaths, pptxPath);
  return { pptxPath, loopRecord };
}

const presentation = await createDeck();
const result = await verifyAndExport(presentation);
console.log(result.pptxPath);
