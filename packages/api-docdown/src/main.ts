import { generateApiDocs } from "./api-docdown";

async function main() {
  const args = process.argv.slice(2);
  const hasArg = (char: string) => args.some((arg) => arg.includes(char));
  const operation = hasArg("e")
    ? "extract"
    : hasArg("d")
    ? "document"
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
    },
    includePackageNames: [],
    excludePackageNames: [],
  });
}

main().catch(console.error);
