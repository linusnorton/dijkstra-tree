/**
 * Regenerates docs/algorithm.svg.
 *
 *   npm run diagram
 *
 * The frames are a recorded trace of a real run, and the final distances are
 * cross-checked against `DijkstraTree` itself, so the diagram cannot drift from
 * the implementation it illustrates.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { DijkstraTree } from "../src/index.ts";
import type { Graph } from "../src/index.ts";

const NODES = ["A", "B", "C", "D", "E", "F", "G"];
const ORIGIN = 0;

const GRAPH: Graph = [
  { origin: "A", destination: "B", distance: 4 },
  { origin: "A", destination: "C", distance: 1 },
  { origin: "C", destination: "B", distance: 2 },
  { origin: "B", destination: "D", distance: 7 },
  { origin: "C", destination: "D", distance: 8 },
  { origin: "C", destination: "E", distance: 12 },
  { origin: "D", destination: "E", distance: 2 },
  { origin: "D", destination: "F", distance: 6 },
  { origin: "E", destination: "F", distance: 1 },
  { origin: "G", destination: "F", distance: 3 },
];

const EDGES = GRAPH.map(e => ({ from: NODES.indexOf(e.origin), to: NODES.indexOf(e.destination), w: e.distance }));

interface Frame {
  kind: "pop" | "relax";
  u: number;
  edge: number;
  total: number;
  previous: number;
  improved: boolean;
  dist: number[];
  parent: number[];
  settled: boolean[];
  heap: number[];
}

// Record a trace of the same indexed binary heap the implementation uses.
const frames: Frame[] = [];
const dist = NODES.map(() => Infinity);
const parent = NODES.map(() => -1);
const settled = NODES.map(() => false);
const heap: number[] = [];

const siftUp = (index: number) => {
  while (index > 0) {
    const p = (index - 1) >> 1;
    if (dist[heap[p]] <= dist[heap[index]]) {
      break;
    }
    [heap[p], heap[index]] = [heap[index], heap[p]];
    index = p;
  }
};

const siftDown = (index: number) => {
  while (true) {
    let c = 2 * index + 1;
    if (c >= heap.length) {
      break;
    }
    if (c + 1 < heap.length && dist[heap[c + 1]] < dist[heap[c]]) {
      c++;
    }
    if (dist[heap[c]] >= dist[heap[index]]) {
      break;
    }
    [heap[c], heap[index]] = [heap[index], heap[c]];
    index = c;
  }
};

const record = (f: Omit<Frame, "dist" | "parent" | "settled" | "heap">) =>
  frames.push({ ...f, dist: [...dist], parent: [...parent], settled: [...settled], heap: [...heap] });

dist[ORIGIN] = 0;
heap.push(ORIGIN);

while (heap.length > 0) {
  const u = heap[0];
  const last = heap.pop() as number;
  if (heap.length > 0) {
    heap[0] = last;
    siftDown(0);
  }
  settled[u] = true;
  record({ kind: "pop", u, edge: -1, total: dist[u], previous: dist[u], improved: false });

  EDGES.forEach((e, k) => {
    if (e.from !== u || settled[e.to]) {
      return;
    }
    const total = dist[u] + e.w;
    const previous = dist[e.to];
    const improved = total < previous;
    if (improved) {
      dist[e.to] = total;
      parent[e.to] = u;
      if (!heap.includes(e.to)) {
        heap.push(e.to);
      }
      siftUp(heap.indexOf(e.to));
    }
    record({ kind: "relax", u, edge: k, total, previous, improved });
  });
}

const tree = new DijkstraTree(GRAPH).getTree(NODES[ORIGIN]);
const actual = tree.toJSON();
const traced = Object.fromEntries(NODES.map((n, i) => [n, { distance: dist[i], parent: parent[i] >= 0 ? NODES[parent[i]] : null }]));
if (JSON.stringify(actual) !== JSON.stringify(traced)) {
  throw new Error(`trace disagrees with DijkstraTree\n  traced: ${JSON.stringify(traced)}\n  actual: ${JSON.stringify(actual)}`);
}

// Layout.
const CW = 860;
const CH = 510;
const POS: Array<[number, number]> = [
  [70, 200], [200, 110], [200, 290], [340, 110], [340, 290], [470, 200], [470, 92],
];
const NR = 20;

const RX = 530;
const RY = 78;
const RW = 300;
const RH = 232;

const TX = 110;
const CELL_W = 96;
const CELL_H = 30;
const HDR_Y = 352;
const DIST_Y = 362;
const PARENT_Y = DIST_Y + CELL_H;
const HEAP_Y = 450;
const colX = (c: number): number => TX + c * CELL_W;

const BG = "#fcfcfb";
const FG = "#1f2328";
const MUTED = "#6e7781";
const LINE = "#d0d7de";
const BLUE = "#0969da";
const GREEN = "#1a7f37";
const RED = "#cf222e";
const PANEL = "#ffffff";
const SANS = "ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const STEP = 1.3;
const FINAL = 4;
const TOTAL = frames.length * STEP + FINAL;

/** Opacity animation making an element visible only during [t0, t1). */
function visible(t0: number, t1: number): string {
  const a = t0 / TOTAL;
  const b = t1 / TOTAL;
  let values: string;
  let keyTimes: string;
  if (t0 <= 0) {
    values = "1;0;0";
    keyTimes = `0;${b.toFixed(5)};1`;
  } else if (t1 >= TOTAL) {
    values = "0;1";
    keyTimes = `0;${a.toFixed(5)}`;
  } else {
    values = "0;1;0;0";
    keyTimes = `0;${a.toFixed(5)};${b.toFixed(5)};1`;
  }
  return `<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${TOTAL}s" repeatCount="indefinite"/>`;
}

const INFINITY = "&#8734;";
const ARROW_L = "&#8592;";
const ARROW_R = "&#8594;";
const fmt = (v: number): string => (v === Infinity ? INFINITY : String(v));

function edge(k: number, width: number, colour: string, marker: string): string {
  const { from, to } = EDGES[k];
  const [x1, y1] = POS[from];
  const [x2, y2] = POS[to];
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  return `<line x1="${(x1 + ux * NR).toFixed(1)}" y1="${(y1 + uy * NR).toFixed(1)}" x2="${(x2 - ux * (NR + 1)).toFixed(1)}" y2="${(y2 - uy * (NR + 1)).toFixed(1)}" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" marker-end="url(#${marker})"/>`;
}

function weight(k: number, colour: string, bold: boolean): string {
  const { from, to, w } = EDGES[k];
  const x = (POS[from][0] + POS[to][0]) / 2;
  const y = (POS[from][1] + POS[to][1]) / 2;
  return `<rect x="${x - 13}" y="${y - 10}" width="26" height="19" rx="4" fill="${BG}"/>` +
    `<text x="${x}" y="${y + 4.5}" font-size="12.5" font-weight="${bold ? 700 : 500}" font-family="${MONO}" text-anchor="middle" fill="${colour}">${w}</text>`;
}

function node(m: number, fill: string, fillOpacity: number, stroke: string, strokeWidth: number, text: string): string {
  const [x, y] = POS[m];
  return `<circle cx="${x}" cy="${y}" r="${NR}" fill="${PANEL}"/>` +
    `<circle cx="${x}" cy="${y}" r="${NR}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${strokeWidth}"/>` +
    `<text x="${x}" y="${y + 5}" font-size="14" font-weight="600" text-anchor="middle" fill="${text}">${NODES[m]}</text>`;
}

function marker(id: string, colour: string): string {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${colour}"/></marker>`;
}

function cells(dists: number[], parents: number[], hot: number, hotColour: string, parentColour: string): string {
  const g: string[] = [];
  for (let m = 0; m < NODES.length; m++) {
    const x = colX(m) + CELL_W / 2;
    const isHot = m === hot;
    if (isHot) {
      g.push(`<rect x="${colX(m)}" y="${DIST_Y}" width="${CELL_W}" height="${CELL_H * 2}" fill="${hotColour}" fill-opacity="0.12" stroke="${hotColour}" stroke-width="2"/>`);
    }
    g.push(`<text x="${x}" y="${DIST_Y + 20}" font-size="13.5" font-weight="${isHot ? 700 : 500}" font-family="${MONO}" text-anchor="middle" fill="${isHot ? hotColour : FG}">${fmt(dists[m])}</text>`);
    const p = parents[m];
    g.push(`<text x="${x}" y="${PARENT_Y + 20}" font-size="11.5" font-family="${MONO}" text-anchor="middle" fill="${p >= 0 ? parentColour : MUTED}">${p >= 0 ? ARROW_L + NODES[p] : "&#183;"}</text>`);
  }
  return g.join("");
}

function heapCells(items: number[], dists: number[]): string {
  if (items.length === 0) {
    return `<text x="${TX + 8}" y="${HEAP_Y + 20}" font-size="12.5" font-family="${MONO}" fill="${MUTED}">empty</text>`;
  }
  return items.map((m, i) =>
    `<rect x="${TX + i * 74}" y="${HEAP_Y}" width="66" height="${CELL_H}" rx="6" fill="${i === 0 ? BLUE : PANEL}" fill-opacity="${i === 0 ? 0.1 : 1}" stroke="${i === 0 ? BLUE : LINE}"/>` +
    `<text x="${TX + i * 74 + 33}" y="${HEAP_Y + 20}" font-size="12.5" font-family="${MONO}" text-anchor="middle" fill="${i === 0 ? BLUE : FG}">${NODES[m]} ${fmt(dists[m])}</text>`,
  ).join("");
}

function text(line: number, content: string, colour: string, size = 13.5, mono = true): string {
  return `<text x="${RX + 22}" y="${RY + 32 + line * 30}" font-size="${size}"${mono ? ` font-family="${MONO}"` : ` font-weight="600"`} fill="${colour}">${content}</text>`;
}

const out: string[] = [];
out.push(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}" font-family="${SANS}">`,
  `<defs>${marker("grey", LINE)}${marker("blue", BLUE)}${marker("green", GREEN)}${marker("red", RED)}</defs>`,
  `<rect width="${CW}" height="${CH}" rx="10" fill="${BG}"/>`,
  `<rect x="0.5" y="0.5" width="${CW - 1}" height="${CH - 1}" rx="10" fill="none" stroke="${LINE}"/>`,
  `<text x="30" y="36" font-size="15" font-weight="600" fill="${FG}">dijkstra-tree</text>`,
  `<text x="30" y="56" font-size="12.5" fill="${MUTED}">The closest unsettled node is popped from a binary heap, then its outgoing edges are relaxed.</text>`,
);

EDGES.forEach((_, k) => out.push(edge(k, 1.5, LINE, "grey"), weight(k, MUTED, false)));
NODES.forEach((_, m) => out.push(node(m, PANEL, 1, LINE, 1.5, FG)));

out.push(`<rect x="${RX}" y="${RY}" width="${RW}" height="${RH}" rx="8" fill="${PANEL}" stroke="${LINE}"/>`);
out.push(`<text x="${TX}" y="${HDR_Y - 22}" font-size="12" font-weight="600" fill="${FG}">getTree("${NODES[ORIGIN]}")</text>`);
for (let m = 0; m < NODES.length; m++) {
  out.push(
    `<text x="${colX(m) + CELL_W / 2}" y="${HDR_Y}" font-size="12" font-weight="600" text-anchor="middle" fill="${MUTED}">${NODES[m]}</text>`,
    `<rect x="${colX(m)}" y="${DIST_Y}" width="${CELL_W}" height="${CELL_H}" fill="${PANEL}" stroke="${LINE}"/>`,
    `<rect x="${colX(m)}" y="${PARENT_Y}" width="${CELL_W}" height="${CELL_H}" fill="${PANEL}" stroke="${LINE}"/>`,
  );
}
out.push(
  `<text x="34" y="${DIST_Y + 20}" font-size="11.5" fill="${MUTED}">dist[]</text>`,
  `<text x="34" y="${PARENT_Y + 20}" font-size="11.5" fill="${MUTED}">parent[]</text>`,
  `<text x="34" y="${HEAP_Y + 20}" font-size="11.5" fill="${MUTED}">heap</text>`,
);

const treeEdges = (parents: number[]): number[] =>
  EDGES.map((e, k) => (parents[e.to] === e.from ? k : -1)).filter(k => k >= 0);

frames.forEach((f, k) => {
  // The first frame defaults to visible so renderers without SMIL still show
  // a sensible still rather than an empty panel.
  const g: string[] = [`<g opacity="${k === 0 ? 1 : 0}">${visible(k * STEP, (k + 1) * STEP)}`];
  const e = f.edge >= 0 ? EDGES[f.edge] : undefined;
  const colour = f.improved ? GREEN : RED;

  for (const t of treeEdges(f.parent)) {
    if (t !== f.edge) {
      g.push(edge(t, 2.5, GREEN, "green"), weight(t, GREEN, true));
    }
  }
  if (e) {
    g.push(edge(f.edge, 3.5, BLUE, "blue"), weight(f.edge, BLUE, true));
  }
  for (let m = 0; m < NODES.length; m++) {
    if (m === f.u) {
      g.push(node(m, BLUE, 0.12, BLUE, 2.5, BLUE));
    } else if (e && m === e.to) {
      g.push(node(m, colour, 0.12, colour, 2.5, colour));
    } else if (f.settled[m]) {
      g.push(node(m, GREEN, 0.12, GREEN, 1.5, GREEN));
    }
  }

  g.push(cells(f.dist, f.parent, e ? e.to : f.u, e ? colour : BLUE, GREEN));
  g.push(heapCells(f.heap, f.dist));

  g.push(text(0, `STEP ${k + 1} OF ${frames.length}`, MUTED, 11.5, false));
  if (!e) {
    g.push(
      text(1, `pop ${NODES[f.u]}   dist ${fmt(f.total)}`, BLUE, 14),
      text(2, `${NODES[f.u]} is the closest unsettled node,`, FG, 12.5),
      text(3, `so dist[${NODES[f.u]}] is now final`, FG, 12.5),
    );
  } else {
    g.push(
      text(1, `relax ${NODES[e.from]} ${ARROW_R} ${NODES[e.to]}   w = ${e.w}`, FG, 14),
      text(2, `dist[${NODES[e.from]}] + w = ${fmt(f.dist[e.from])} + ${e.w} = ${f.total}`, FG),
    );
    if (f.improved) {
      g.push(
        text(3, `${f.total} &lt; ${fmt(f.previous)}  ${ARROW_R} update`, GREEN),
        text(4, `dist[${NODES[e.to]}]=${f.total}  parent[${NODES[e.to]}]=${NODES[e.from]}`, GREEN, 12.5),
        text(5, f.previous === Infinity ? `push ${NODES[e.to]} onto the heap` : `sift ${NODES[e.to]} up the heap`, MUTED, 12.5),
      );
    } else {
      g.push(
        text(3, `${f.total} &lt; ${fmt(f.previous)} ?  no  ${ARROW_R} keep`, RED),
        text(4, `dist[${NODES[e.to]}] stays ${fmt(f.previous)}`, MUTED, 12.5),
      );
    }
  }
  g.push("</g>");
  out.push(g.join(""));
});

const unreachable = NODES.map((_, m) => m).filter(m => dist[m] === Infinity);
const g: string[] = [`<g opacity="0">${visible(frames.length * STEP, TOTAL)}`];
const TARGET = NODES.length - 2;
const pathTo = tree.path(NODES[TARGET]) ?? [];
const onPath = (k: number): boolean => pathTo.some((n, i) => i > 0 && NODES.indexOf(pathTo[i - 1]) === EDGES[k].from && NODES.indexOf(n) === EDGES[k].to);
for (const t of treeEdges(parent)) {
  g.push(onPath(t) ? edge(t, 4, BLUE, "blue") + weight(t, BLUE, true) : edge(t, 3, GREEN, "green") + weight(t, GREEN, true));
}
for (let m = 0; m < NODES.length; m++) {
  if (dist[m] === Infinity) {
    g.push(node(m, PANEL, 1, LINE, 1.5, MUTED));
  } else if (pathTo.includes(NODES[m])) {
    g.push(node(m, BLUE, 0.12, BLUE, 2.5, BLUE));
  } else {
    g.push(node(m, GREEN, 0.12, GREEN, 2.5, GREEN));
  }
}
g.push(cells(dist, parent, TARGET, BLUE, GREEN));
g.push(heapCells([], dist));
const call = (method: string, n: number): string => `tree.${method}("${NODES[n]}")`;
g.push(
  text(0, "RESULT", MUTED, 11.5, false),
  text(1, `const tree = getTree("${NODES[ORIGIN]}")`, FG, 13),
  text(2, `${call("distance", TARGET)}  ${ARROW_R} ${tree.distance(NODES[TARGET])}`, BLUE, 13),
  text(3, `${call("path", TARGET)}  ${ARROW_R} ${pathTo.join(" ")}`, BLUE, 13),
  text(4, `${call("parent", TARGET)}  ${ARROW_R} "${tree.parent(NODES[TARGET])}"`, FG, 13),
  text(5, `${unreachable.map(m => call("distance", m)).join(", ")}  ${ARROW_R} Infinity`, MUTED, 13),
  text(6, "green edges: shortest path tree", GREEN, 12.5),
  "</g>",
);
out.push(g.join(""));
out.push("</svg>");

mkdirSync("docs", { recursive: true });
writeFileSync("docs/algorithm.svg", out.join("\n"));
console.log(`docs/algorithm.svg: ${frames.length} steps, ${TOTAL.toFixed(1)}s loop`);
