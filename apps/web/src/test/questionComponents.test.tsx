import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("renders IELTS true-false-not-given questions as fixed answer choices", () => {
    const onChange = vi.fn();

    render(
      <AnswerInput
        questionId="q-tfng"
        questionType="true_false_not_given"
        value=""
        onChange={onChange}
      />
    );

    const answer = screen.getByLabelText("Answer for question q-tfng");
    expect(answer).toHaveRole("combobox");
    expect(within(answer).getByRole("option", { name: "TRUE" })).toBeInTheDocument();
    expect(within(answer).getByRole("option", { name: "FALSE" })).toBeInTheDocument();
    expect(within(answer).getByRole("option", { name: "NOT GIVEN" })).toBeInTheDocument();

    fireEvent.change(answer, { target: { value: "NOT GIVEN" } });

    expect(onChange).toHaveBeenCalledWith("NOT GIVEN");
  });

  it("renders IELTS yes-no-not-given questions as fixed answer choices", () => {
    const onChange = vi.fn();

    render(
      <AnswerInput
        questionId="q-ynng"
        questionType="yes_no_not_given"
        value=""
        onChange={onChange}
      />
    );

    const answer = screen.getByLabelText("Answer for question q-ynng");
    expect(answer).toHaveRole("combobox");
    expect(within(answer).getByRole("option", { name: "YES" })).toBeInTheDocument();
    expect(within(answer).getByRole("option", { name: "NO" })).toBeInTheDocument();
    expect(within(answer).getByRole("option", { name: "NOT GIVEN" })).toBeInTheDocument();

    fireEvent.change(answer, { target: { value: "YES" } });

    expect(onChange).toHaveBeenCalledWith("YES");
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
