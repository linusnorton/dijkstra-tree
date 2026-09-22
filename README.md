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
