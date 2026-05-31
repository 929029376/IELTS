import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../app/App";

describe("dashboard shell", () => {
  it("renders the local IELTS app shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "IELTS Local Practice" })).toBeInTheDocument();
    expect(screen.getByText("Mock Exam Center")).toBeInTheDocument();
    expect(screen.getByText("Intensive Practice Center")).toBeInTheDocument();
  });
});
