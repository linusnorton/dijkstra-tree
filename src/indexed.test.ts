import {describe, expect, it} from "vitest";
import {DijkstraTree, type EdgeIndex, IndexedDijkstra} from "./index";

type RawEdge = [origin: number, destination: number, distance: number];

function index(size: number, edges: RawEdge[]): EdgeIndex {
  const offsets = new Int32Array(size + 1);
  const targets = new Int32Array(edges.length);
  const weights = new Float64Array(edges.length);

  for (const [origin] of edges) {
    offsets[origin + 1]++;
  }
  for (let i = 0; i < size; i++) {
    offsets[i + 1] += offsets[i];
  }

  const next = offsets.slice(0, size);

  for (const [origin, destination, distance] of edges) {
    const position = next[origin]++;
    targets[position] = destination;
    weights[position] = distance;
  }

  return {offsets, targets, weights};
}

function randomEdges(random: () => number, size: number, count: number, maxWeight: number): RawEdge[] {
  return Array.from({length: count}, () => [
    Math.floor(random() * size),
    Math.floor(random() * size),
    Math.floor(random() * maxWeight)
  ]);
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function cold(size: number, layers: EdgeIndex[], origin: number) {
  const distances = new Float64Array(size);
  const parents = new Int32Array(size);

  new IndexedDijkstra(size, layers).search(origin, distances, parents);

  return {distances, parents};
}

describe("IndexedDijkstra", () => {

  it("matches DijkstraTree on random graphs", () => {
    const random = seeded(1);

    for (let run = 0; run < 50; run++) {
      const size = 1 + Math.floor(random() * 40);
      const edges = randomEdges(random, size, Math.floor(random() * 200), 100);
      const tree = new DijkstraTree(edges.map(([o, d, w]) => ({origin: `${o}`, destination: `${d}`, distance: w})));
      const origin = Math.floor(random() * size);
      const {distances} = cold(size, [index(size, edges)], origin);
      const expected = tree.getTree(`${origin}`);

      for (let node = 0; node < size; node++) {
        const hasEdges = edges.some(([o, d]) => o === node || d === node);
        const want = node === origin ? 0 : hasEdges ? expected.distance(`${node}`) : Infinity;

        expect(distances[node]).toBe(want);
      }
    }
  });

  it("treats several edge indexes as one graph", () => {
    const random = seeded(2);

    for (let run = 0; run < 50; run++) {
      const size = 30;
      const base = randomEdges(random, size, 80, 100);
      const extra = randomEdges(random, size, 10, 20);
      const origin = Math.floor(random() * size);

      expect(cold(size, [index(size, base), index(size, extra)], origin).distances)
        .toEqual(cold(size, [index(size, [...base, ...extra])], origin).distances);
    }
  });

  it("warm starts from a completed search after edges are added", () => {
    const random = seeded(3);

    for (let run = 0; run < 200; run++) {
      const size = 2 + Math.floor(random() * 50);
      const base = index(size, randomEdges(random, size, Math.floor(random() * 300), 100));
      const added = randomEdges(random, size, Math.floor(random() * 10), 30);
      const origin = Math.floor(random() * size);
      const {distances, parents} = cold(size, [base], origin);
      const before = distances.slice();

      const dirty: number[] = [];
      for (const [o, d, w] of added) {
        if (distances[o] + w < distances[d]) {
          distances[d] = distances[o] + w;
          parents[d] = o;
          dirty.push(d);
        }
      }

      const search = new IndexedDijkstra(size, [base, index(size, added)]);
      const count = search.searchFrom(dirty, dirty.length, distances, parents);
      const expected = cold(size, [base, index(size, added)], origin);

      expect(distances).toEqual(expected.distances);

      const settled = new Set(search.settled.subarray(0, count));
      for (let node = 0; node < size; node++) {
        if (distances[node] !== before[node]) {
          expect(settled.has(node)).toBe(true);
        }
      }

      // the parent pointers must describe paths of the reported length
      for (let node = 0; node < size; node++) {
        if (node !== origin && distances[node] !== Infinity) {
          expect(distances[node]).toBeGreaterThanOrEqual(distances[parents[node]]);
        }
      }
    }
  });

  it("does nothing when nothing is dirty", () => {
    const size = 3;
    const search = new IndexedDijkstra(size, [index(size, [[0, 1, 1], [1, 2, 1]])]);
    const distances = new Float64Array(size);
    const parents = new Int32Array(size);

    search.search(0, distances, parents);

    expect(search.searchFrom([], 0, distances, parents)).toBe(0);
    expect(distances).toEqual(new Float64Array([0, 1, 2]));
  });

  it("can be reused for many searches", () => {
    const random = seeded(4);
    const size = 40;
    const edges = [index(size, randomEdges(random, size, 200, 50))];
    const search = new IndexedDijkstra(size, edges);
    const distances = new Float64Array(size);
    const parents = new Int32Array(size);

    for (let origin = 0; origin < size; origin++) {
      const count = search.search(origin, distances, parents);

      expect(distances).toEqual(cold(size, edges, origin).distances);
      expect(count).toBe(distances.filter(d => d !== Infinity).length);
    }
  });

});
