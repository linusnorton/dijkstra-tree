
/**
 * Implementation of dijkstra's shortest path algorithm that returns a tree instead of a path.
 */
export class DijkstraTree {

  private readonly labels: Node[] = [];
  private readonly ids = new Map<Node, number>();
  private readonly search: IndexedDijkstra;

  constructor(graph: Graph) {
    const origins = new Int32Array(graph.length);
    const destinations = new Int32Array(graph.length);

    for (let i = 0; i < graph.length; i++) {
      origins[i] = this.getId(graph[i].origin);
      destinations[i] = this.getId(graph[i].destination);
    }

    // index the edges by origin, the edges of node n are stored between offsets[n] and offsets[n + 1]
    const numNodes = this.labels.length;
    const offsets = new Int32Array(numNodes + 1);
    const targets = new Int32Array(graph.length);
    const weights = new Float64Array(graph.length);

    for (let i = 0; i < graph.length; i++) {
      offsets[origins[i] + 1]++;
    }
    for (let i = 0; i < numNodes; i++) {
      offsets[i + 1] += offsets[i];
    }

    const next = offsets.slice(0, numNodes);

    for (let i = 0; i < graph.length; i++) {
      const position = next[origins[i]]++;

      targets[position] = destinations[i];
      weights[position] = graph[i].distance;
    }

    this.search = new IndexedDijkstra(numNodes, [{ offsets, targets, weights }]);
  }

  /**
   * Return the numeric ID of a node label, assigning one if it has not been seen before
   */
  private getId(node: Node): number {
    let id = this.ids.get(node);

    if (id === undefined) {
      id = this.labels.length;
      this.ids.set(node, id);
      this.labels.push(node);
    }

    return id;
  }

  /**
   * Return a shortest path tree from the given node to every other node in the graph
   */
  public getTree(origin: Node): ShortestPathTree {
    const numNodes = this.labels.length;
    const distances = new Float64Array(numNodes).fill(Infinity);
    const parents = new Int32Array(numNodes).fill(NO_PARENT);
    const originId = this.ids.get(origin);

    if (originId !== undefined) {
      this.search.search(originId, distances, parents);
    }

    return new ShortestPathTree(origin, this.labels, this.ids, distances, parents);
  }

}

/**
 * Edges indexed by origin: the edges of node n are stored between offsets[n] and offsets[n + 1] of targets and weights
 */
export interface EdgeIndex {
  offsets: Int32Array | Uint32Array;
  targets: Int32Array | Uint32Array | Uint16Array;
  weights: Float64Array | Float32Array | Int32Array | Uint32Array;
}

/**
 * Dijkstra's algorithm over integer node IDs, writing into buffers owned by the caller.
 *
 * The graph is the union of one or more edge indexes over the same nodes, so a base graph can be combined with a
 * small set of extra edges without copying it.
 *
 * An instance reuses its internal buffers between calls, so it must not be shared between concurrent searches.
 */
export class IndexedDijkstra {

  public readonly size: number;
  private readonly edges: readonly EdgeIndex[];
  private readonly heap: Int32Array;
  // position of each node in the heap, UNSEEN if it has not been queued in this search and SETTLED once removed
  private readonly positions: Int32Array;
  private readonly settledNodes: Int32Array;

  constructor(size: number, edges: readonly EdgeIndex[]) {
    this.size = size;
    this.edges = edges;
    this.heap = new Int32Array(size);
    this.positions = new Int32Array(size).fill(UNSEEN);
    this.settledNodes = new Int32Array(size);
  }

  /**
   * Fill distances and parents with the shortest path tree from the origin. Returns the number of nodes reached,
   * which are listed in settlement order by `settled`
   */
  public search(origin: number, distances: Float64Array, parents: Int32Array): number {
    distances.fill(Infinity);
    parents.fill(NO_PARENT);
    distances[origin] = 0;
    this.settledNodes[0] = origin;

    return this.searchFrom(this.settledNodes, 1, distances, parents);
  }

  /**
   * Continue a search from existing distances and parents.
   *
   * The labels must describe paths that exist and every edge leaving a node that is not in `dirty` must already be
   * relaxed. That is the state after a completed search, with the labels of `dirty` lowered by edges added since.
   * Only nodes whose labels change are visited. Returns the number of nodes settled, which are listed in settlement
   * order by `settled` and are exactly the nodes whose labels may differ from the ones passed in.
   */
  public searchFrom(dirty: ArrayLike<number>, dirtyCount: number, distances: Float64Array, parents: Int32Array): number {
    const heap = this.heap;
    const positions = this.positions;
    const settled = this.settledNodes;
    let size = 0;
    let settledCount = 0;

    const siftUp = (index: number) => {
      const node = heap[index];
      const distance = distances[node];

      while (index > 0) {
        const parentIndex = (index - 1) >> 1;
        const parent = heap[parentIndex];

        if (distances[parent] <= distance) {
          break;
        }

        heap[index] = parent;
        positions[parent] = index;
        index = parentIndex;
      }

      heap[index] = node;
      positions[node] = index;
    };

    const siftDown = (index: number) => {
      const node = heap[index];
      const distance = distances[node];

      while (true) {
        let childIndex = 2 * index + 1;

        if (childIndex >= size) {
          break;
        }
        if (childIndex + 1 < size && distances[heap[childIndex + 1]] < distances[heap[childIndex]]) {
          childIndex++;
        }
        if (distances[heap[childIndex]] >= distance) {
          break;
        }

        heap[index] = heap[childIndex];
        positions[heap[index]] = index;
        index = childIndex;
      }

      heap[index] = node;
      positions[node] = index;
    };

    // dirty may be the settled buffer itself, so it is read before anything is settled
    for (let i = 0; i < dirtyCount; i++) {
      const node = dirty[i];

      if (positions[node] === UNSEEN) {
        heap[size] = node;
        positions[node] = size++;
        siftUp(size - 1);
      }
    }

    while (size > 0) {
      const current = heap[0];
      const distance = distances[current];

      positions[current] = SETTLED;
      settled[settledCount++] = current;
      size--;

      if (size > 0) {
        heap[0] = heap[size];
        siftDown(0);
      }

      for (let e = 0; e < this.edges.length; e++) {
        const { offsets, targets, weights } = this.edges[e];
        const end = offsets[current + 1];

        for (let i = offsets[current]; i < end; i++) {
          const destination = targets[i];
          const newDistance = distance + weights[i];

          if (newDistance < distances[destination] && positions[destination] !== SETTLED) {
            distances[destination] = newDistance;
            parents[destination] = current;

            if (positions[destination] === UNSEEN) {
              heap[size] = destination;
              positions[destination] = size++;
            }

            siftUp(positions[destination]);
          }
        }
      }
    }

    for (let i = 0; i < settledCount; i++) {
      positions[settled[i]] = UNSEEN;
    }

    return settledCount;
  }

  /**
   * Nodes settled by the last search, valid up to the count it returned
   */
  public get settled(): Int32Array {
    return this.settledNodes;
  }

}

const UNSEEN = -1;
const SETTLED = -2;
const NO_PARENT = -1;

/**
 * Shortest distance to each node from the origin, and the previous node on the shortest path to it
 */
export class ShortestPathTree {

  public readonly origin: Node;
  private readonly labels: Node[];
  private readonly ids: Map<Node, number>;
  private readonly distanceById: Float64Array;
  private readonly parentById: Int32Array;

  constructor(
    origin: Node,
    labels: Node[],
    ids: Map<Node, number>,
    distanceById: Float64Array,
    parentById: Int32Array
  ) {
    this.origin = origin;
    this.labels = labels;
    this.ids = ids;
    this.distanceById = distanceById;
    this.parentById = parentById;
  }

  /**
   * Distance from the origin to the given node, Infinity if it cannot be reached
   */
  public distance(node: Node): number {
    const id = this.ids.get(node);

    return id === undefined ? Infinity : this.distanceById[id];
  }

  /**
   * Previous node on the shortest path to the given node, undefined for the origin and unreachable nodes
   */
  public parent(node: Node): Node | undefined {
    const id = this.ids.get(node);

    return id === undefined || this.parentById[id] === NO_PARENT ? undefined : this.labels[this.parentById[id]];
  }

  /**
   * Nodes on the shortest path from the origin to the given node inclusive, undefined if it cannot be reached
   */
  public path(node: Node): Node[] | undefined {
    let id = this.ids.get(node);

    if (id === undefined || this.distanceById[id] === Infinity) {
      return undefined;
    }

    const path: Node[] = [];

    for (; id !== NO_PARENT; id = this.parentById[id]) {
      path.push(this.labels[id]);
    }

    return path.reverse();
  }

  /**
   * Distance to every node in the graph
   */
  public distances(): Record<Node, number> {
    const result: Record<Node, number> = {};

    for (let i = 0; i < this.labels.length; i++) {
      result[this.labels[i]] = this.distanceById[i];
    }

    return result;
  }

  /**
   * Distance and parent of every node in the graph. JSON has no Infinity so unreachable nodes serialize with a
   * distance of null
   */
  public toJSON(): ShortestPathTreeJSON {
    const result: ShortestPathTreeJSON = {};

    for (let i = 0; i < this.labels.length; i++) {
      const parent = this.parentById[i];

      result[this.labels[i]] = {
        distance: this.distanceById[i],
        parent: parent === NO_PARENT ? null : this.labels[parent]
      };
    }

    return result;
  }

}

/**
 * A node is just represented by it's label
 */
export type Node = string;

/**
 * Weighted connection between two nodes
 */
export interface Edge {
  origin: Node;
  destination: Node;
  distance: number;
}

/**
 * A graph is represented by a list of edges
 */
export type Graph = Edge[];

/**
 * Plain object form of a ShortestPathTree
 */
export interface ShortestPathTreeJSON {
  [node: string]: {
    distance: number;
    parent: Node | null;
  };
}
