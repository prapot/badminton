import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "../safeRedirect";

describe("safeRedirectPath", () => {
    it.each([
        "/",
        "/profile",
        "/tournament/abc?tab=matches#court-2",
        "/history/7",
    ])("keeps the on-site path %s", (path) => {
        expect(safeRedirectPath(path)).toBe(path);
    });

    it.each([
        ["absolute URL", "https://evil.example"],
        ["protocol-relative", "//evil.example"],
        ["backslash", "/\\evil.example"],
        ["tab trick", "/\t/evil.example"],
        ["newline trick", "/\n/evil.example"],
        ["javascript: URL", "javascript:alert(1)"],
        ["relative path", "profile"],
        ["empty", ""],
        ["null", null],
        ["undefined", undefined],
    ])("falls back for %s", (_, value) => {
        expect(safeRedirectPath(value)).toBe("/");
    });

    it("uses the given fallback", () => {
        expect(safeRedirectPath("//evil.example", "/profile")).toBe("/profile");
    });
});
