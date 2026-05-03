import { describe, expect, it } from "vitest";
import { validateAnalyzeResponse } from "../../../../src/ai/validators/analyze-response.validator";

describe("validateAnalyzeResponse", () => {
    it("should parse valid analyze JSON", () => {
        var result = validateAnalyzeResponse(JSON.stringify({
            analysis: "Article is useful.",
            suggestions: ["Add examples", "Improve title"],
            severity: "warning",
        }));

        expect(result).toEqual({
            analysis: "Article is useful.",
            suggestions: ["Add examples", "Improve title"],
            severity: "warning",
        });
    });

    it("should parse valid analyze JSON wrapped in markdown fence", () => {
        var result = validateAnalyzeResponse([
            "```json",
            JSON.stringify({
                analysis: "Article is good.",
                suggestions: ["Add conclusion"],
                severity: "info",
            }),
            "```",
        ].join("\n"));

        expect(result).toEqual({
            analysis: "Article is good.",
            suggestions: ["Add conclusion"],
            severity: "info",
        });
    });

    it("should return safe fallback for invalid JSON", () => {
        var result = validateAnalyzeResponse("not json");

        expect(result).toEqual({
            analysis: "not json",
            suggestions: [],
            severity: "info",
        });
    });

    it("should return safe fallback for invalid response shape", () => {
        var result = validateAnalyzeResponse(JSON.stringify({
            analysis: "Article has problems.",
            suggestions: ["Fix it"],
            severity: "critical",
        }));

        expect(result).toEqual({
            analysis: JSON.stringify({
                analysis: "Article has problems.",
                suggestions: ["Fix it"],
                severity: "critical",
            }),
            suggestions: [],
            severity: "info",
        });
    });
});