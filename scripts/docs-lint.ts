#!/usr/bin/env node

import * as FS from "node:fs";
import * as Path from "node:path";

const repoRoot = process.cwd();
const docsDir = Path.join(repoRoot, "docs");
const rootReadme = Path.join(repoRoot, "README.md");
const requiredFiles = ["README.md", "docs/observability.md", "docs/release.md"] as const;
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

export type LintError = {
  readonly file: string;
  readonly message: string;
};

export function walkMarkdownFiles(dir: string): string[] {
  if (!FS.existsSync(dir)) return [];

  const entries = FS.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const nextPath = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(nextPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(nextPath);
    }
  }

  return files.toSorted();
}

export function stripAnchorAndQuery(target: string): string {
  const hashIndex = target.indexOf("#");
  const queryIndex = target.indexOf("?");
  const indexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  if (indexes.length === 0) return target;
  return target.slice(0, Math.min(...indexes));
}

export function isExternalLink(target: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(target);
}

export function lintDocs(): { readonly errors: LintError[]; readonly filesChecked: number } {
  const errors: LintError[] = [];

  if (!FS.existsSync(docsDir)) {
    errors.push({ file: "docs", message: "docs directory missing" });
  }

  for (const requiredFile of requiredFiles) {
    const requiredPath = Path.join(repoRoot, requiredFile);
    if (!FS.existsSync(requiredPath)) {
      errors.push({ file: requiredFile, message: "required file missing" });
    }
  }

  const files = [rootReadme, ...walkMarkdownFiles(docsDir)].filter((file, index, allFiles) => {
    if (!FS.existsSync(file)) return false;
    return allFiles.indexOf(file) === index;
  });

  for (const file of files) {
    const content = FS.readFileSync(file, "utf8");
    const relativeFile = Path.relative(repoRoot, file) || Path.basename(file);

    for (const match of content.matchAll(linkPattern)) {
      const rawTarget = match[1]?.trim();
      if (
        !rawTarget ||
        isExternalLink(rawTarget) ||
        rawTarget.startsWith("#") ||
        Path.isAbsolute(rawTarget)
      ) {
        continue;
      }

      const normalizedTarget = stripAnchorAndQuery(rawTarget);
      if (!normalizedTarget) {
        continue;
      }

      const resolvedPath = Path.resolve(Path.dirname(file), normalizedTarget);
      if (!resolvedPath.startsWith(repoRoot)) {
        errors.push({
          file: relativeFile,
          message: `link escapes repo root: ${rawTarget}`,
        });
        continue;
      }

      if (!FS.existsSync(resolvedPath)) {
        errors.push({
          file: relativeFile,
          message: `broken link: ${rawTarget}`,
        });
      }
    }
  }

  return { errors, filesChecked: files.length };
}

if (import.meta.main) {
  const result = lintDocs();

  if (result.errors.length > 0) {
    console.error(`docs lint failed. files=${result.filesChecked} errors=${result.errors.length}`);
    for (const error of result.errors) {
      console.error(`- ${error.file}: ${error.message}`);
    }
    process.exit(1);
  }

  console.log(`docs lint passed. files=${result.filesChecked}`);
}
