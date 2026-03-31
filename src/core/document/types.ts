export type CustomClassRegexSetting = string | [string] | [string, string];

export type ClassSelectionOptions = {
  dynamicClassFunctions: string[];
  ignoreCommentMarker: string;
  customClassRegex: CustomClassRegexSetting[];
};