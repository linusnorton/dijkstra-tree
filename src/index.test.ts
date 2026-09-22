
import {describe, expect, it} from "vitest";
import {DijkstraTree} from "./index";

describe("DijkstraTree", () => {

  it("find the shortest path to each node", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 10 },
      { origin: "B", destination: "C", distance: 10 },
      { origin: "B", destination: "C", distance: 5 },
      { origin: "C", destination: "D", distance: 11 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A").distances();
    const expected = {
      "A": 0,
      "B": 10,
      "C": 15,
      "D": 26
    };

    expect(result).toEqual(expected);
  });

  it("sorts the edges", () => {
    const graph = [
      { origin: "B", destination: "C", distance: 5 },
      { origin: "C", destination: "D", distance: 11 },
      { origin: "A", destination: "B", distance: 10 },
      { origin: "B", destination: "C", distance: 10 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A").distances();
    const expected = {
      "A": 0,
      "B": 10,
      "C": 15,
      "D": 26
    };

    expect(result).toEqual(expected);
  });

  it("recalculates distances when finding shortest nodes", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 10 },
      { origin: "B", destination: "C", distance: 10 },
      { origin: "B", destination: "C", distance: 5 },
      { origin: "C", destination: "D", distance: 6 },
      { origin: "A", destination: "D", distance: 1 },
      { origin: "D", destination: "C", distance: 1 },
      { origin: "C", destination: "B", distance: 1 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A").distances();
    const expected = {
      "A": 0,
      "B": 3,
      "C": 2,
      "D": 1
    };

    expect(result).toEqual(expected);
  });

  it("fails gracefully when given an invalid graph", () => {
    const algorithm = new DijkstraTree([]);
    const result = algorithm.getTree("A").distances();
    const expected = {};

    expect(result).toEqual(expected);
  });

  it("does not overwrite the distance to the origin", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 1 },
      { origin: "B", destination: "A", distance: 1 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A").distances();
    const expected = {
      "A": 0,
      "B": 1
    };

    expect(result).toEqual(expected);
  });

  it("supports zero distance edges", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 0 },
      { origin: "B", destination: "C", distance: 2 },
      { origin: "A", destination: "C", distance: 5 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A").distances();
    const expected = {
      "A": 0,
      "B": 0,
      "C": 2
    };

    expect(result).toEqual(expected);
  });

  it("returns Infinity for unreachable nodes", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 1 },
      { origin: "C", destination: "D", distance: 1 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A").distances();
    const expected = {
      "A": 0,
      "B": 1,
      "C": Infinity,
      "D": Infinity
    };

    expect(result).toEqual(expected);
  });

  it("returns Infinity for every node when the origin is not in the graph", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 1 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("Z").distances();
    const expected = {
      "A": Infinity,
      "B": Infinity
    };

    expect(result).toEqual(expected);
  });

  describe("ShortestPathTree", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 10 },
      { origin: "B", destination: "C", distance: 10 },
      { origin: "B", destination: "C", distance: 5 },
      { origin: "C", destination: "D", distance: 11 },
      { origin: "A", destination: "D", distance: 30 },
      { origin: "E", destination: "D", distance: 1 },
    ];
    const tree = new DijkstraTree(graph).getTree("A");

    it("knows its origin", () => {
      expect(tree.origin).toBe("A");
    });

    it("returns the distance to a node", () => {
      expect(tree.distance("A")).toBe(0);
      expect(tree.distance("D")).toBe(26);
      expect(tree.distance("E")).toBe(Infinity);
      expect(tree.distance("Z")).toBe(Infinity);
    });

    it("returns the previous node on the shortest path", () => {
      expect(tree.parent("A")).toBeUndefined();
      expect(tree.parent("C")).toBe("B");
      expect(tree.parent("D")).toBe("C");
      expect(tree.parent("E")).toBeUndefined();
      expect(tree.parent("Z")).toBeUndefined();
    });

    it("returns the shortest path to a node", () => {
      expect(tree.path("A")).toEqual(["A"]);
      expect(tree.path("D")).toEqual(["A", "B", "C", "D"]);
      expect(tree.path("E")).toBeUndefined();
      expect(tree.path("Z")).toBeUndefined();
    });

    it("serializes to JSON", () => {
      expect(JSON.parse(JSON.stringify(tree))).toEqual({
        A: { distance: 0, parent: null },
        B: { distance: 10, parent: "A" },
        C: { distance: 15, parent: "B" },
        D: { distance: 26, parent: "C" },
        E: { distance: null, parent: null },
      });
    });
  });

});
