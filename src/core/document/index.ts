export { CLASS_ATTRIBUTE_REGEX } from "./patterns";
export {
  escapeForRegex,
  findClosingParen,
  getQuotedStringRanges,
} from "./parsing";
export { getClassSelections, shouldIgnoreLine } from "./selections";
export type {
  ClassSelectionOptions,
  CustomClassRegexSetting,
} from "./types";