
/**
 * Implementation of dijkstra's shortest path algorithm that returns a tree instead of a path.
 */
export class DijkstraTree {

  private readonly nodeEdges: NodeEdges;

  constructor(graph: Graph) {
    this.nodeEdges = graph.reduce(this.getNodeEdges, {});
  }

  /**
   * Index the edges by origin
   */
  private getNodeEdges(nodes: NodeEdges, edge: Edge): NodeEdges {
    nodes[edge.origin] = nodes[edge.origin] || [];
    nodes[edge.origin].push(edge);

    return nodes;
  }

  /**
   * Return a shortest path tree from the given node to every other node the graph. Nodes not connected by an edge will
   * have a distance of Number.MAX_SAFE_INTEGER
   */
  public getTree(origin: Node): ShortestPathTree {
    // set the initial distance to each node to the maximum length
    const distances: ShortestPathTree = {};
    // queue of unchecked edges
    const queue: Queue = [];

    // set the initial distance to each node to max and add each node to the queue
    for (const node of Object.keys(this.nodeEdges)) {
      const distance = node === origin ? 0 : Number.MAX_SAFE_INTEGER;

      queue.push([node, distance]);
      distances[node] = {
        distance,
        path: [origin]
      };
    }
    // while we have edges left to check
    while (queue.length > 0) {
      // note that the sort is descending (longest first) as pop() is faster than shift()
      queue.sort((a, b) => b[1] - a[1]);

      // take closest node off the queue
      const [current, distance] = queue.pop() as [Node, number];

      // iterate the nodes edges
      for (const edge of this.nodeEdges[current] || []) {
        // see if the new distance is shorter than the one we have
        const newDistance = Math.min(
            distances[edge.destination] !== undefined ? distances[edge.destination].distance : Number.MAX_SAFE_INTEGER,
            distance + edge.distance
        );
        const indexInQueue = queue.findIndex(queueItem => queueItem[0] === edge.destination);

        /**
         * Update the tree (distance and paths)
         *
         * If newDistance is shorter than previous distance then update it
         * otherwise if distance exists do nothing if it doesn't exist create it.
         */
        // update the tree and the queue
        // If newDistance is shorter than previous distance then update it otherwise do nothing
        if (distances[edge.destination] && newDistance < distances[edge.destination].distance) {
          distances[edge.destination] = {
            distance: newDistance,
            path: [...distances[edge.origin].path, edge.destination]
          }
        } else if (distances[edge.destination] === undefined) { // If edge destination is not stored create it
          distances[edge.destination] = {
            distance: newDistance,
            path: [...distances[edge.origin].path, edge.destination]
          }
        }
        queue[indexInQueue] = [edge.destination, newDistance];
      }
    }
    return distances;
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
 * Distances to each node
 */
export interface ShortestPathTree {
  [destination: string]: {
    distance: number,
    path: string[]
  };
}

/**
 * Index of origin nodes and all their edges
 */
interface NodeEdges {
  [node: string]: Edge[];
}

/**
 * Sortable queue of Node and shortest distance to Node
 */
type Queue = [Node, number][];
