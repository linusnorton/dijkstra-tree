# dijkstra-tree

Implementation of [Dijkstra's algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm) that returns a [shortest path tree](https://en.wikipedia.org/wiki/Shortest-path_tree) instead of a path between two nodes.

## Install

```
npm install --save dijkstra-tree
```

## Usage

```
import {DijkstraTree} from "../src";

const graph = [
  { origin: "A", destination: "B", distance: 10 },
  { origin: "B", destination: "C", distance: 10 },
  { origin: "B", destination: "C", distance: 5 },
  { origin: "C", destination: "D", distance: 11 },
];

const algorithm = new DijkstraTree(graph);
const result = algorithm.getTree("A");

console.log(result);
// {
//   "A": 0,
//   "B": 10,
//   "C": 15,
//   "D": 26
// };

```

## Testing

```
npm test
```

## Contributing

Issues, PRs and contributions are welcome. Please ensure any changes have an accompanying test.
