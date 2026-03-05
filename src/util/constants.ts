export const CLASS_ATTRIBUTE_REGEX =
  /\b(?:class|className|ngClass|class:list)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;

export const DEFAULT_DYNAMIC_CLASS_FUNCTIONS = ["clsx", "cn", "classnames"];
export const DEFAULT_IGNORE_COMMENT = "tailwindocd-ignore";
export const DEFAULT_CUSTOM_CLASS_REGEX: CustomClassRegexSetting[] = [];

export type CustomClassRegexSetting = string | [string, string];

export type ClassSelectionOptions = {
  dynamicClassFunctions: string[];
  ignoreCommentMarker: string;
  customClassRegex: CustomClassRegexSetting[];
};
