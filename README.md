# dijkstra-tree

Implementation of [Dijkstra's algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) that returns a [shortest path tree](https://en.wikipedia.org/wiki/Shortest-path_tree) instead of a path between two nodes.

![The closest unsettled node is popped from a binary heap and its outgoing edges are relaxed. dist[] and parent[] update when a shorter route is found, and the parent pointers form the shortest path tree that tree.path() walks. G has no route from A, so its distance stays Infinity.](docs/algorithm.svg)

## Install

```
npm install --save dijkstra-tree
```

## Usage

```ts
import { DijkstraTree } from "dijkstra-tree";

const graph = [
  { origin: "A", destination: "B", distance: 10 },
  { origin: "B", destination: "C", distance: 10 },
  { origin: "B", destination: "C", distance: 5 },
  { origin: "C", destination: "D", distance: 11 },
  { origin: "E", destination: "D", distance: 1 },
];

const tree = new DijkstraTree(graph).getTree("A");

tree.distance("D");   // 26
tree.path("D");       // ["A", "B", "C", "D"]
tree.parent("D");     // "C"
tree.distance("E");   // Infinity
tree.path("E");       // undefined

tree.distances();
// { A: 0, B: 10, C: 15, D: 26, E: Infinity }

JSON.stringify(tree);
// {"A":{"distance":0,"parent":null},"B":{"distance":10,"parent":"A"},"C":{"distance":15,"parent":"B"},
//  "D":{"distance":26,"parent":"C"},"E":{"distance":null,"parent":null}}
```

`getTree` returns a `ShortestPathTree`:

| Member | Returns |
|---|---|
| `origin` | The node the tree was built from |
| `distance(node)` | Distance from the origin, `Infinity` if the node cannot be reached |
| `parent(node)` | Previous node on the shortest path, `undefined` for the origin and unreachable nodes |
| `path(node)` | Nodes from the origin to `node` inclusive, `undefined` if the node cannot be reached |
| `distances()` | `{ [node]: distance }` for every node in the graph |
| `toJSON()` | `{ [node]: { distance, parent } }` for every node, with `null` for no parent. JSON has no `Infinity`, so unreachable nodes serialize with a distance of `null` |

The tree stores one parent pointer per node, so `path` is built on demand and costs only the length of the path.

Distances must be non-negative. When there are parallel edges between two nodes, the cheapest one is used.

### Integer graphs and incremental searches

`IndexedDijkstra` is the search `DijkstraTree` is built on. It works on integer node IDs and edges that are already indexed by origin, and writes into buffers you own, so running a search from every node allocates nothing.

```ts
import { IndexedDijkstra } from "dijkstra-tree";

// edges of node n are stored between offsets[n] and offsets[n + 1]
const base = {
  offsets: new Int32Array([0, 1, 2, 2]),
  targets: new Int32Array([1, 2]),
  weights: new Float64Array([10, 10]),
};
const search = new IndexedDijkstra(3, [base]);
const distances = new Float64Array(3);
const parents = new Int32Array(3);

search.search(0, distances, parents);   // distances [0, 10, 20], parents [-1, 0, 1]
```

The graph can be made of several edge indexes over the same nodes, which is how a large base graph is combined with a few extra edges without copying it. After adding edges, `searchFrom` continues a completed search instead of starting again: lower the labels the new edges improve, pass those nodes as `dirty`, and only the nodes whose labels change are visited.

```ts
const extra = {
  offsets: new Int32Array([0, 1, 1, 1]),
  targets: new Int32Array([2]),
  weights: new Float64Array([5]),
};
const incremental = new IndexedDijkstra(3, [base, extra]);

distances[2] = 5;
parents[2] = 0;

const count = incremental.searchFrom([2], 1, distances, parents);
incremental.settled.subarray(0, count);   // [2], the only node whose label changed
```

`settled` lists the nodes visited by the last search, so a caller keeping one set of labels per origin can put back exactly the ones a search changed. An instance reuses its internal buffers and must not be shared between concurrent searches.

### Upgrading from 0.x

`getTree` used to return the distances object directly, with `Number.MAX_SAFE_INTEGER` for unreachable nodes. Use `getTree(origin).distances()` and check for `Infinity` instead. The package is now ESM; CommonJS projects can still `require` it on Node 20.19 or newer.

## Performance

Node labels are mapped to integer IDs and the edges are stored in typed arrays when the `DijkstraTree` is constructed, so repeated calls to `getTree` only pay for the search. The returned tree wraps the typed arrays from the search rather than copying them into an object. The search uses an indexed binary heap, giving `O((V + E) log V)` per call.

## Development

```
npm test               # vitest
npm run typecheck
npm run build
npm run diagram        # regenerate docs/algorithm.svg
npm run check:package  # pack, install and import the published artifact
```

`npm run diagram` records a trace of a real run and cross-checks it against `DijkstraTree`, so the diagram cannot drift from the implementation. CI fails if `docs/algorithm.svg` is stale.

Releases are published to npm when the version in `package.json` changes on `master`.

## Contributing

Issues, PRs and contributions are welcome. Please ensure any changes have an accompanying test.
