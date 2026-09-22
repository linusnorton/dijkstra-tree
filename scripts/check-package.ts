/**
 * Packs the library, installs the tarball into a scratch project and consumes it
 * the way a real dependant would.
 *
 * The unit tests import from `src`, so they cannot catch a broken `exports` map,
 * a missing entry in `files`, or declarations that were never emitted. This
 * checks the artifact that actually gets published.
 *
 *   npm run check:package
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), "dijkstra-tree-package-"));
const run = (cmd: string, args: string[], cwd: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

try {
  run("npm", ["run", "build"], root);

  const tarball = run("npm", ["pack", "--silent", "--pack-destination", dir], root).trim();

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "consumer", version: "1.0.0", private: true, type: "module" }),
  );
  run("npm", ["install", "--no-audit", "--no-fund", "--silent", join(dir, tarball)], dir);

  const graph = `[
  { origin: "A", destination: "B", distance: 4 },
  { origin: "A", destination: "C", distance: 1 },
  { origin: "C", destination: "B", distance: 2 },
  { origin: "D", destination: "A", distance: 1 },
]`;
  const assertions = `const tree = new DijkstraTree(${graph}).getTree("A");

assert.deepEqual(tree.distances(), { A: 0, B: 3, C: 1, D: Infinity });
assert.deepEqual(tree.path("B"), ["A", "C", "B"]);
assert.equal(tree.parent("B"), "C");
assert.deepEqual(JSON.parse(JSON.stringify(tree)).D, { distance: null, parent: null });`;

  writeFileSync(
    join(dir, "smoke.mjs"),
    `import assert from "node:assert/strict";
import { DijkstraTree } from "dijkstra-tree";

${assertions}

console.log("runtime: import resolves and behaves");
`,
  );
  run("node", ["smoke.mjs"], dir);

  writeFileSync(
    join(dir, "smoke.cjs"),
    `const assert = require("node:assert/strict");
const { DijkstraTree } = require("dijkstra-tree");

${assertions}

console.log("runtime: require resolves and behaves");
`,
  );
  run("node", ["smoke.cjs"], dir);

  writeFileSync(
    join(dir, "consumer.ts"),
    `import { DijkstraTree } from "dijkstra-tree";
import type { Graph, Node, ShortestPathTree, ShortestPathTreeJSON } from "dijkstra-tree";

const graph: Graph = [{ origin: "A", destination: "B", distance: 1 }];
const tree: ShortestPathTree = new DijkstraTree(graph).getTree("A");
const path: Node[] | undefined = tree.path("B");
const json: ShortestPathTreeJSON = tree.toJSON();
void path;
void json;
`,
  );
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "nodenext",
        moduleResolution: "nodenext",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      include: ["consumer.ts"],
    }),
  );
  run("node", [join(root, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], dir);
  console.log("types: entry point resolves under nodenext");

  console.log("package check passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
