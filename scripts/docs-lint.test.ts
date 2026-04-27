import * as Path from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { isExternalLink, stripAnchorAndQuery, walkMarkdownFiles } from "./docs-lint.ts";

describe("docs-lint helpers", () => {
  it("strips anchors and query params from local targets", () => {
    expect(stripAnchorAndQuery("./docs/release.md#anchors?ignored")).toBe("./docs/release.md");
    expect(stripAnchorAndQuery("./docs/release.md?foo=bar#anchor")).toBe("./docs/release.md");
    expect(stripAnchorAndQuery("./docs/release.md")).toBe("./docs/release.md");
  });

  it("recognizes external link schemes", () => {
    expect(isExternalLink("https://example.com")).toBe(true);
    expect(isExternalLink("mailto:test@example.com")).toBe(true);
    expect(isExternalLink("tel:+15555555555")).toBe(true);
    expect(isExternalLink("./docs/release.md")).toBe(false);
  });

  it("walks markdown files recursively in sorted order", () => {
    const tempDir = mkdtempSync(Path.join(tmpdir(), "t3code-docs-lint-"));
    tempDirs.push(tempDir);

    mkdirSync(Path.join(tempDir, "docs", "nested"), { recursive: true });
    writeFileSync(Path.join(tempDir, "docs", "b.md"), "# b\n");
    writeFileSync(Path.join(tempDir, "docs", "nested", "a.md"), "# a\n");
    writeFileSync(Path.join(tempDir, "docs", "nested", "ignore.txt"), "nope\n");

    expect(walkMarkdownFiles(Path.join(tempDir, "docs"))).toEqual([
      Path.join(tempDir, "docs", "b.md"),
      Path.join(tempDir, "docs", "nested", "a.md"),
    ]);
  });
});

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});
