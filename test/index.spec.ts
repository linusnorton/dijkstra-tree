
import * as chai from "chai";
import {DijkstraTree} from "../src";

describe("DijkstraTree", () => {

  it("find the shortest path to each node", () => {
    const graph = [
      { origin: "A", destination: "B", distance: 10 },
      { origin: "B", destination: "C", distance: 10 },
      { origin: "B", destination: "C", distance: 5 },
      { origin: "C", destination: "D", distance: 11 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A");
    const expected = {
      "A": { distance: 0, path: ["A"] },
      "B": { distance: 10, path: ["A", "B"] },
      "C": { distance: 15, path: ["A", "B", "C"] },
      "D": { distance: 26, path: ["A", "B", "C", "D"] }
    };

    chai.expect(result).to.deep.equal(expected);
  });

  it("sorts the edges", () => {
    const graph = [
      { origin: "B", destination: "C", distance: 5 },
      { origin: "C", destination: "D", distance: 11 },
      { origin: "A", destination: "B", distance: 10 },
      { origin: "B", destination: "C", distance: 10 },
    ];

    const algorithm = new DijkstraTree(graph);
    const result = algorithm.getTree("A");
    const expected = {
      "A": { distance: 0, path: ["A"] },
      "B": { distance: 10, path: ["A", "B"] },
      "C": { distance: 15, path: ["A", "B", "C"] },
      "D": { distance: 26, path: ["A", "B", "C", "D"] }
    };

    chai.expect(result).to.deep.equal(expected);
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
    const result = algorithm.getTree("A");
    const expected = {
      "A": { distance: 0, path: ["A"] },
      "B": { distance: 3, path: ["A", "D", "C", "B"] },
      "C": { distance: 2, path: ["A", "D", "C"] },
      "D": { distance: 1, path: ["A", "D"] }
    };

    chai.expect(result).to.deep.equal(expected);
  });

  it("fails gracefully when given an invalid graph", () => {
    const algorithm = new DijkstraTree([]);
    const result = algorithm.getTree("A");
    const expected = {};

    chai.expect(result).to.deep.equal(expected);
  });

});
