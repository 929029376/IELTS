import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StudyOverviewPanel } from "../features/study/StudyOverviewPanel";

describe("StudyOverviewPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a clear fallback when a recommended mock passage has a blank title", () => {
    render(
      <StudyOverviewPanel
        overview={{
          readiness: {
            listeningFullMockReady: true,
            readingFullMockReady: false
          },
          recommendedMockSets: {
            listening: {
              passages: [
                {
                  frequencyClass: "high",
                  id: "blank-title-p1",
                  part: "P1",
                  subject: "listening",
                  title: "   "
                }
              ],
              subject: "listening"
            },
            reading: null
          },
          subjects: {
            listening: {
              cueCount: 0,
              frequency: { high: 1, low: 0, medium: 0, unknown: 0 },
              passageCount: 1,
              questionCount: 1
            },
            reading: {
              cueCount: 0,
              frequency: { high: 0, low: 0, medium: 0, unknown: 0 },
              passageCount: 0,
              questionCount: 0
            }
          }
        }}
      />
    );

    expect(screen.getByText("Untitled passage")).toBeInTheDocument();
    expect(screen.queryByText("   ")).not.toBeInTheDocument();
  });
});
