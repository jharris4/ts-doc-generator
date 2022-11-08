import * as path from "path";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { ApiModel } from "@microsoft/api-extractor-model";
import {
  JsonFile,
  FileSystem,
  NewlineKind,
} from "@rushstack/node-core-library";
import { MarkdownDocumenter } from "./documenters/MarkdownDocumenter";
import { DocumenterConfig } from "./documenters/DocumenterConfig";

export type FileLevel =
  | "model"
  | "package"
  | "namespace"
  | "export"
  | "member"
  | "all";

const packageFilter = (path: string) => !path.includes("ts-doc-generator");
// const packageFilter = (path: string) => path.includes("package-case");
// const packageFilter = (path: string) => path.includes("package-namespaced");

interface ExtractorBundle {
  extractorConfig: ExtractorConfig | null;
  extractorErrorMessage: string | null;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const buildExtractorConfig = (
  packagePath: string,
  extractorOutputPath: string,
  includePaths: string[] = ["**/*.d.ts"]
): ExtractorBundle => {
  let extractorConfig: ExtractorConfig | null = null;
  let extractorErrorMessage: string | null = null;
  const packageJSONPath = path.join(packagePath, "package.json");
  try {
    const pkg = JsonFile.load(packageJSONPath);
    const { name, types, typings } = pkg;
    if (name && (types || typings)) {
      const typeEntry = path.join(packagePath, types || typings);
      const extractorConfigObject = {
        projectFolder: packagePath,
        // enumMemberOrder: "preserve", // "by-name"
        mainEntryPointFilePath: typeEntry,
        compiler: {
          overrideTsconfig: {
            compilerOptions: {
              baseUrl: ".",
              allowJs: false,
              checkJs: false,
            },
            include: includePaths,
          },
        },
        apiReport: {
          enabled: false,
          reportFileName: "<unscopedPackageName>.api.md",
          // reportFolder: "<projectFolder>/etc/",
          // reportTempFolder: "<projectFolder>/temp/",
          // includeForgottenExports: false
        },
        docModel: {
          enabled: true,
          apiJsonFilePath: path.join(
            extractorOutputPath,
            "<unscopedPackageName>.api.json"
          ),
        },
        tsdocMetadata: {
          enabled: false,
        },
        dtsRollup: {
          enabled: false,
        },
      };
      try {
        extractorConfig = ExtractorConfig.prepare({
          configObject: extractorConfigObject,
          configObjectFullPath: "", // TODO - what should this be?
          packageJsonFullPath: packageJSONPath,
          packageJson: pkg,
        });
      } catch (e) {
        extractorErrorMessage =
          "extractor error for package " + name + ": " + getErrorMessage(e);
      }
    } else {
      const missing: string =
        !types && !typings ? (!name ? "name & types" : "types") : "name";
      extractorErrorMessage =
        "package.json missing " + missing + ": " + packageJSONPath;
    }
  } catch (e) {
    extractorErrorMessage = "package.json not found: " + packageJSONPath;
  }
  if (extractorErrorMessage) {
    console.error(extractorErrorMessage);
  }
  return {
    extractorConfig,
    extractorErrorMessage,
  };
};

interface DocumenterBundle {
  documenterConfig: DocumenterConfig | null;
  documenterErrorMessage: string | null;
}

const buildDocumenterConfig = (
  fileLevel: FileLevel = "package"
): DocumenterBundle => {
  let documenterConfig: DocumenterConfig | null = null;
  let documenterErrorMessage: string | null = null;
  try {
    documenterConfig = DocumenterConfig.prepare({
      outputTarget: "markdown",
      showInheritedMembers: false,
      markdownOptions: {
        fileLevel,
        indexFilename: "index",
        indexTitle: "API Reference",
        indexBreadcrumb: "Home",
        hideEmptyTableColumns: true,
        showPropertyDefaults: true,
      },
    });
  } catch (e) {
    documenterErrorMessage = "documenter error : " + getErrorMessage(e);
  }
  return {
    documenterConfig,
    documenterErrorMessage,
  };
};
// TODO - make these CLI options
/*
- extract - only creates api.json
- generate - only creates api.md
- document - creates api.json and api.md
- packageDirs
  - packageDirs - "packages/mypackage                   - document mypackage
  - packageDirs - "packages"                            - document all packages in packages directory
  - packageDirs - ""                                    - document root package workspace packages
- packagePaths
  - packagePaths - "packages/mypackage/package.json"    - document mypackage
  - packagePaths - "package.json"                       - document root package workspace packages
- packageTypes
  - packageTypes - "packages/mypackage/dist/index.d.ts" - document mypackage
  - packageTypes - "packages/mypackage/dist/index.d.ts" - document mypackage, yourpackage
                 - "packages/yourpackage/dist/index.d.ts"

All of the package examples above except the last show single values,
but each of them supports one or many values.

let packageDirs: string | string[]; // "" | [""];
let packagePaths: string | string[]; // "" | [""];
let packageTypes: string | string[]; // "" | [""];

*/

interface GenerateDocOptions {
  docRootDir: string;
  docApiDir: string;
  docMarkdownDir: string;
  operation: "extract" | "generate" | "document";
  fileLevel: "model" | "package" | "namespace" | "export" | "member" | "all";
}

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
  const fileLevel = "all";
  generateApiDocs({
    docRootDir,
    docApiDir,
    docMarkdownDir,
    operation,
    fileLevel,
  });
}

async function generateApiDocs(options: GenerateDocOptions) {
  const { docRootDir, docApiDir, docMarkdownDir, operation } = options;
  const makeCurrent = (relativePath: string) =>
    path.join(docRootDir, relativePath);

  const extractorOutputPath = makeCurrent(docApiDir);
  const documenterOutputPath = makeCurrent(docMarkdownDir);

  FileSystem.ensureFolder(extractorOutputPath);
  FileSystem.ensureFolder(documenterOutputPath);

  const pkg = JsonFile.load(makeCurrent("package.json"));

  if (operation === "extract" || operation === "generate") {
    const extractorConfigs: Array<ExtractorConfig> = [];
    const extractorErrorMessages: string[] = [];
    const addExtractorConfig = (extractorBundle: ExtractorBundle) => {
      const { extractorConfig, extractorErrorMessage } = extractorBundle;
      if (extractorConfig) {
        extractorConfigs.push(extractorConfig);
      }
      if (extractorErrorMessage) {
        extractorErrorMessages.push(extractorErrorMessage);
      }
    };
    if (pkg.types || pkg.typings) {
      addExtractorConfig(
        buildExtractorConfig(makeCurrent(""), extractorOutputPath)
      );
    } else if (pkg.workspaces) {
      let packagePaths: Array<string> = [];
      const workspaces = pkg.workspaces.map((workspace: string) => {
        const lastSlashIndex = workspace.lastIndexOf("/");
        if (lastSlashIndex !== -1) {
          if (workspace.substring(lastSlashIndex).indexOf("*") !== -1) {
            return workspace.substring(0, lastSlashIndex);
          }
        }
        return workspace;
      });
      for (let workspace of workspaces) {
        // console.log("check: ", workspace, FileSystem.getRealPath(workspace));
        packagePaths = packagePaths.concat(
          FileSystem.readFolderItems(makeCurrent(workspace))
            .filter((i) => i.isDirectory())
            .map((i) => path.join(workspace, i.name))
        );
      }
      // console.log("\n\n\n\n^^^^^^^^ package paths: ", packagePaths);
      packagePaths = packagePaths.filter(packageFilter);
      // packagePaths = ["packages/ts-doc-generator"];

      if (packagePaths.length > 0) {
        for (let packagePath of packagePaths) {
          addExtractorConfig(
            buildExtractorConfig(
              makeCurrent(packagePath),
              extractorOutputPath,
              ["**/*.d.ts"]
            )
          );
        }
      }
    }

    const succeededExtractors: Array<any> = [];
    const failedExtractors: Array<any> = [];
    if (extractorConfigs.length > 0) {
      FileSystem.ensureEmptyFolder(extractorOutputPath);
      for (let extractorConfig of extractorConfigs) {
        try {
          const extractorResult = Extractor.invoke(extractorConfig, {
            localBuild: true,
            showVerboseMessages: true,
          });

          if (extractorResult.succeeded) {
            succeededExtractors.push({ extractorConfig, extractorResult });
          } else {
            console.error(
              `API Extractor completed with ${extractorResult.errorCount} errors` +
                ` and ${extractorResult.warningCount} warnings`
            );
            console.log("extractor no success result: ", extractorResult);
            failedExtractors.push({ extractorConfig, extractorResult });
          }
        } catch (e) {
          console.log("error e", e);
          failedExtractors.push({ extractorConfig, extractorResult: null });
        }
      }
    }

    console.log("**** succeededExtractors: ", succeededExtractors.length);
  }
  if (operation === "document" || operation === "generate") {
    const apiModel = new ApiModel();
    const inputFolder = extractorOutputPath;
    if (!FileSystem.exists(inputFolder)) {
      throw new Error("The input folder does not exist: " + inputFolder);
    }
    const outputFolder = documenterOutputPath;
    FileSystem.ensureFolder(outputFolder);
    for (const filename of FileSystem.readFolderItemNames(inputFolder)) {
      if (filename.match(/\.api\.json$/i) && packageFilter(filename)) {
        console.log(`Reading ${filename}`);
        const filenamePath = path.join(inputFolder, filename);
        apiModel.loadPackage(filenamePath);
      }
    }

    if (options.fileLevel === "all") {
      const fileLevels: string[] = [
        "model",
        "package",
        "namespace",
        "export",
        "member",
      ];
      for (const fileLevel of fileLevels) {
        const subOutputFolder = path.join(outputFolder, fileLevel);
        FileSystem.ensureFolder(subOutputFolder);
        const { documenterConfig, documenterErrorMessage } =
          buildDocumenterConfig(fileLevel as FileLevel);
        if (documenterConfig) {
          const markdownDocumenter = new MarkdownDocumenter({
            apiModel,
            documenterConfig,
            outputFolder: subOutputFolder,
          });
          markdownDocumenter.generateFiles();
        } else {
          console.error("Generator error: " + documenterErrorMessage);
        }
      }
    } else {
      const { documenterConfig, documenterErrorMessage } =
        buildDocumenterConfig(options.fileLevel as FileLevel);
      if (documenterConfig) {
        const markdownDocumenter = new MarkdownDocumenter({
          apiModel,
          documenterConfig,
          outputFolder,
        });
        markdownDocumenter.generateFiles();
      } else {
        console.error("Generator error: " + documenterErrorMessage);
      }
    }
  }
  if (operation === "generate") {
    FileSystem.ensureEmptyFolder(extractorOutputPath);
  }
}

main().catch(console.error);
