
/**
 * Implementation of dijkstra's shortest path algorithm that returns a tree instead of a path.
 */
export class DijkstraTree {

  private readonly labels: Node[] = [];
  private readonly ids = new Map<Node, number>();
  private readonly offsets: Int32Array;
  private readonly targets: Int32Array;
  private readonly weights: Float64Array;

  constructor(graph: Graph) {
    const origins = new Int32Array(graph.length);
    const destinations = new Int32Array(graph.length);

    for (let i = 0; i < graph.length; i++) {
      origins[i] = this.getId(graph[i].origin);
      destinations[i] = this.getId(graph[i].destination);
    }

    // index the edges by origin, the edges of node n are stored between offsets[n] and offsets[n + 1]
    const numNodes = this.labels.length;
    this.offsets = new Int32Array(numNodes + 1);
    this.targets = new Int32Array(graph.length);
    this.weights = new Float64Array(graph.length);

    for (let i = 0; i < graph.length; i++) {
      this.offsets[origins[i] + 1]++;
    }
    for (let i = 0; i < numNodes; i++) {
      this.offsets[i + 1] += this.offsets[i];
    }

    const next = this.offsets.slice(0, numNodes);

    for (let i = 0; i < graph.length; i++) {
      const position = next[origins[i]]++;

      this.targets[position] = destinations[i];
      this.weights[position] = graph[i].distance;
    }
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
      distances[originId] = 0;
      this.search(originId, distances, parents);
    }

    return new ShortestPathTree(origin, this.labels, this.ids, distances, parents);
  }

  /**
   * Populate the distances and parents using a binary min-heap of node IDs keyed by their current distance
   */
  private search(originId: number, distances: Float64Array, parents: Int32Array): void {
    const heap = new Int32Array(this.labels.length);
    // position of each node in the heap, UNSEEN if it has never been queued and SETTLED once it has been removed
    const positions = new Int32Array(this.labels.length).fill(UNSEEN);
    let size = 1;

    heap[0] = originId;
    positions[originId] = 0;

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

    while (size > 0) {
      const current = heap[0];
      const distance = distances[current];

      positions[current] = SETTLED;
      size--;

      if (size > 0) {
        heap[0] = heap[size];
        siftDown(0);
      }

      for (let i = this.offsets[current]; i < this.offsets[current + 1]; i++) {
        const destination = this.targets[i];
        const newDistance = distance + this.weights[i];

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
