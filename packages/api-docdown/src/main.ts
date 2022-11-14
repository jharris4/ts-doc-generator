import { generateApiDocs } from "./api-docdown";

async function main() {
  const args = process.argv.slice(2);
  const hasArg = (char: string) => args.some((arg) => arg.includes(char));
  const operation = hasArg("e")
    ? "extract"
    : hasArg("d")
    ? "document"
    : hasArg("o")
    ? "document-original"
    : "generate";
  const docRootDir = process.cwd();
  const docApiDir = "docs/apis";
  const docMarkdownDir = "docs/generated";

  // optional
  const showInheritedMembers = false;
  const newlineKind = "crlf";
  const fileLevel = "all";
  const indexFilename = "index";
  const indexTitle = "API Reference";
  const indexBreadcrumbTitle = "Home";
  const showPropertyDefaults = true;
  const hideEmptyTableColumns = true;
  const showBreadcrumb = true;
  const useIndex = true;
  const indexBreadcrumbUrl = "";
  const showRules = true;

  generateApiDocs({
    docRootDir,
    docApiDir,
    docMarkdownDir,
    operation,
    showInheritedMembers,
    newlineKind,
    markdownOptions: {
      fileLevel,
      indexFilename,
      indexTitle,
      indexBreadcrumbTitle,
      showPropertyDefaults,
      hideEmptyTableColumns,
      showBreadcrumb,
      useIndex,
      indexBreadcrumbUrl,
      showRules,
    },
    includePackageNames: [],
    excludePackageNames: ["api-*"],
  });
}

main().catch(console.error);
