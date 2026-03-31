import { mock } from "bun:test";

export type ComparablePositionLike = {
  line: number;
  character: number;
};

mock.module("vscode", () => ({
  Selection: class {
    constructor(public start: unknown, public end: unknown) { }
  },
  Position: class {
    constructor(public line: number, public character: number) { }

    compareTo(other: ComparablePositionLike) {
      if (this.line !== other.line) return this.line - other.line;
      return this.character - other.character;
    }
  },
}));