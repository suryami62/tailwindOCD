import { describe, expect, it } from "bun:test";
import {
  createMockDocument,
  getSelectionTexts,
} from "../helpers/mockDocument";

const { getClassSelections } = require("../../core/document");

const defaultSelectionOptions = {
  dynamicClassFunctions: ["clsx", "cn", "classnames"],
  ignoreCommentMarker: "tailwindocd-ignore",
  customClassRegex: [],
};

describe("document selections", () => {
  it("ignores multiline class attribute when marker exists on later line", () => {
    const text = `<div className="p-2\nm-2" /> // tailwindocd-ignore`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, defaultSelectionOptions);

    expect(selections).toHaveLength(0);
  });

  it("still captures multiline class attribute without ignore marker", () => {
    const text = `<div className="p-2\nm-2" />`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, defaultSelectionOptions);

    expect(selections).toHaveLength(1);
  });

  it("captures custom class strings from a single regex pattern", () => {
    const text = `{% set tw_myvariable = "px-4 py-4" %}`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      ...defaultSelectionOptions,
      customClassRegex: [
        "{%\\s*set\\s+tw_\\w+\\s*=\\s*[\"']([^\"']*)[\"']\\s*%}",
      ],
    });

    expect(getSelectionTexts(document, selections)).toEqual(["px-4 py-4"]);
  });

  it("supports classRegex-style tuple patterns", () => {
    const text = `{% set tw_myvariable = "px-4 py-4" %}`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      ...defaultSelectionOptions,
      customClassRegex: [
        [
          "{%\\s*set\\s+tw_\\w+\\s*=\\s*([\"'][^\"']*[\"'])\\s*%}",
          "[\"']([^\"']*)[\"']",
        ],
      ],
    });

    expect(getSelectionTexts(document, selections)).toEqual(["px-4 py-4"]);
  });

  it("creates separate selections for each upstream tuple match", () => {
    const text = `const value = clsx("px-4 py-4", isActive && "text-sm");`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      ...defaultSelectionOptions,
      customClassRegex: [["clsx\\(([^)]*)\\)", "\"([^\"]*)\""]],
    });

    expect(getSelectionTexts(document, selections)).toEqual([
      "px-4 py-4",
      "text-sm",
    ]);
  });

  it("requires an outer capture group for tuple patterns", () => {
    const text = `{% set tw_myvariable = "px-4 py-4" %}`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      ...defaultSelectionOptions,
      customClassRegex: [
        [
          "{%\\s*set\\s+tw_\\w+\\s*=\\s*[\"'][^\"']*[\"']\\s*%}",
          "[\"']([^\"']*)[\"']",
        ],
      ],
    });

    expect(selections).toHaveLength(0);
  });

  it("accepts upstream single-element array patterns", () => {
    const text = `const value = tw("px-4 py-4");`;
    const document = createMockDocument(text);

    const selections = getClassSelections(document, {
      ...defaultSelectionOptions,
      customClassRegex: [["tw\\(\"([^\"]*)\"\\)"]],
    });

    expect(getSelectionTexts(document, selections)).toEqual(["px-4 py-4"]);
  });

  it("reuses cached dynamic function regex across repeated calls", () => {
    const text = `const value = clsx("px-4 py-4", isActive && "text-sm");`;
    const document = createMockDocument(text);

    const firstSelections = getClassSelections(document, defaultSelectionOptions);
    const secondSelections = getClassSelections(document, defaultSelectionOptions);

    expect(getSelectionTexts(document, firstSelections)).toEqual([
      "px-4 py-4",
      "text-sm",
    ]);
    expect(getSelectionTexts(document, secondSelections)).toEqual([
      "px-4 py-4",
      "text-sm",
    ]);
  });

  it("reuses cached tuple regexes across repeated calls", () => {
    const text = `const value = clsx("px-4 py-4", isActive && "text-sm");`;
    const document = createMockDocument(text);
    const selectionOptions = {
      ...defaultSelectionOptions,
      customClassRegex: [["clsx\\(([^)]*)\\)", "\"([^\"]*)\""]],
    };

    const firstSelections = getClassSelections(document, selectionOptions);
    const secondSelections = getClassSelections(document, selectionOptions);

    expect(getSelectionTexts(document, firstSelections)).toEqual([
      "px-4 py-4",
      "text-sm",
    ]);
    expect(getSelectionTexts(document, secondSelections)).toEqual([
      "px-4 py-4",
      "text-sm",
    ]);
  });
});