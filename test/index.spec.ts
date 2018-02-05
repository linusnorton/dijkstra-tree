
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
      "A": 0,
      "B": 10,
      "C": 15,
      "D": 26
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
      "A": 0,
      "B": 10,
      "C": 15,
      "D": 26
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
      "A": 0,
      "B": 3,
      "C": 2,
      "D": 1
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