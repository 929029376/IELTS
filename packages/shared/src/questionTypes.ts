export const questionTypes = [
  "fill_blank",
  "single_choice",
  "multiple_choice",
  "matching",
  "true_false_not_given",
  "yes_no_not_given",
  "short_answer",
  "table_completion",
  "form_completion",
  "flow_completion",
  "map_label"
] as const;

export type QuestionType = (typeof questionTypes)[number];
