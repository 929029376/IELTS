import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswerInput } from "../features/questions/AnswerInput";
import { QuestionNavigator } from "../features/questions/QuestionNavigator";

describe("question components", () => {
  it("renders a text answer input for fill blank questions", () => {
    render(
      <AnswerInput
        questionId="q1"
        questionType="fill_blank"
        value="tea"
        onChange={() => undefined}
      />
    );

    expect(screen.getByLabelText("Answer for question q1")).toHaveValue("tea");
  });

  it("renders question navigation states", () => {
    render(
      <QuestionNavigator
        items={[
          { questionNumber: 1, state: "current" },
          { questionNumber: 2, state: "answered" },
          { questionNumber: 3, state: "marked" },
          { questionNumber: 4, state: "incorrect" }
        ]}
      />
    );

    expect(screen.getByLabelText("Question 1, current")).toBeInTheDocument();
    expect(screen.getByLabelText("Question 2, answered")).toBeInTheDocument();
    expect(screen.getByLabelText("Question 3, marked")).toBeInTheDocument();
    expect(screen.getByLabelText("Question 4, incorrect")).toBeInTheDocument();
  });
});
