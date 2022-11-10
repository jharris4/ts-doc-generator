import * as path from "path";
import * as glob from "glob";
import * as micromatch from "micromatch";
import {
  Extractor,
  ExtractorConfig,
  ExtractorMessage,
  ExtractorResult,
} from "@microsoft/api-extractor";
import { ApiModel } from "@microsoft/api-extractor-model";
import {
  JsonFile,
  FileSystem,
  PackageName,
} from "@rushstack/node-core-library";
import { MarkdownDocumenter } from "api-markdown-documenter/lib/documenters/MarkdownDocumenter";
import { DocumenterConfig } from "api-markdown-documenter/lib/documenters/DocumenterConfig";
import {
  FileLevelString,
  NewlineKindString,
  IConfigFileMarkdown,
} from "api-markdown-documenter/lib/documenters/IConfigFile";

interface ExtractorBundle {
  extractorConfig: ExtractorConfig | null;
  extractorErrorMessage: string | null;
  packageName: string;
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
  let packageName: string = "";
  const packageJSONPath = path.join(packagePath, "package.json");
  try {
    const pkg = JsonFile.load(packageJSONPath);
    const { name, types, typings } = pkg;
    if (name) {
      packageName = PackageName.getUnscopedName(name);
    }
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
  // if (extractorErrorMessage) {
  //   console.error(extractorErrorMessage);
  // }
  return {
    extractorConfig,
    extractorErrorMessage,
    packageName,
  };
};

interface DocumenterBundle {
  documenterConfig: DocumenterConfig | null;
  documenterErrorMessage: string | null;
}

interface BuildDocConfigOptions {
  fileLevel?: FileLevelString;
  indexFilename?: string;
  indexTitle?: string;
  indexBreadcrumbTitle?: string;
  hideEmptyTableColumns?: boolean;
  showPropertyDefaults?: boolean;
  showBreadcrumb?: boolean;
  useIndex?: boolean;
  indexBreadcrumbUrl?: string;
  showRules?: boolean;
  showInheritedMembers?: boolean;
  newlineKind?: NewlineKindString;
}

const buildMarkdownDocumenterConfig = (
  options: BuildDocConfigOptions = {}
): DocumenterBundle => {
  const {
    fileLevel,
    indexFilename,
    indexTitle,
    indexBreadcrumbTitle,
    hideEmptyTableColumns,
    showPropertyDefaults,
    showBreadcrumb,
    useIndex,
    indexBreadcrumbUrl,
    showRules,
    showInheritedMembers,
    newlineKind,
  } = options;
  let documenterConfig: DocumenterConfig | null = null;
  let documenterErrorMessage: string | null = null;
  try {
    documenterConfig = DocumenterConfig.prepare({
      outputTarget: "markdown",
      newlineKind,
      showInheritedMembers,
      markdownOptions: {
        fileLevel,
        indexFilename,
        indexTitle,
        indexBreadcrumbTitle,
        hideEmptyTableColumns,
        showPropertyDefaults,
        showBreadcrumb,
        useIndex,
        indexBreadcrumbUrl,
        showRules,
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
  markdownOptions: IConfigFileMarkdown;
  showInheritedMembers: boolean;
  newlineKind: NewlineKindString;
  includePackageNames: string[];
  excludePackageNames: string[];
}

export interface GenerateDocOptionsMaybe {
  docRootDir: string;
  docApiDir: string;
  docMarkdownDir: string;
  operation: "extract" | "generate" | "document";
  markdownOptions?: IConfigFileMarkdown;
  showInheritedMembers?: boolean;
  newlineKind?: NewlineKindString;
  includePackageNames?: string[];
  excludePackageNames?: string[];
}

function prepareOptions(
  maybeOptions: GenerateDocOptionsMaybe
): GenerateDocOptions {
  const { docRootDir, docApiDir, docMarkdownDir, operation } = maybeOptions;
  const { includePackageNames = [], excludePackageNames = [] } = maybeOptions;
  const { markdownOptions, showInheritedMembers, newlineKind } =
    DocumenterConfig.getDefaultConfig(maybeOptions);
  return {
    docRootDir,
    docApiDir,
    docMarkdownDir,
    operation,
    markdownOptions,
    showInheritedMembers,
    newlineKind,
    includePackageNames,
    excludePackageNames,
  };
}

function getPath(dir: string, cwd?: string): string {
  if (cwd && dir.startsWith(".")) {
    return path.join(cwd, dir.substring(1));
  } else {
    return dir;
  }
}

function makeRelative(dir: string, base: string): string {
  if (!dir.startsWith("/")) {
    return path.join(base, dir);
  } else {
    return dir;
  }
}

function ensureTrailingSlash(pattern: string): string {
  return pattern.endsWith("/") ? pattern : pattern + "/";
}

function isMatch(
  matchPackagePaths: string[],
  packagePath: string,
  include: boolean
): boolean {
  if (matchPackagePaths.length === 0) {
    return include;
  }
  return micromatch.isMatch(packagePath, matchPackagePaths);
}

function getPackageNameFilter(options: {
  includePackageNames: string[];
  excludePackageNames: string[];
}): (packageName: string) => boolean {
  const { includePackageNames, excludePackageNames } = options;
  if (includePackageNames.length > 0 || excludePackageNames.length > 0) {
    return (packageName: string) => {
      const isIncluded = isMatch(includePackageNames, packageName, true);
      const isExcluded = isMatch(excludePackageNames, packageName, false);
      return isIncluded && !isExcluded;
    };
  }
  return () => true;
}

interface ExtractorResultBundle {
  extractorConfig: ExtractorConfig;
  extractorResult: ExtractorResult | null;
  errorMessage: string | null;
}

export function generateApiDocs(
  maybeOptions: GenerateDocOptionsMaybe,
  cwd?: string
) {
  const options: GenerateDocOptions = prepareOptions(maybeOptions);
  const { docRootDir, docApiDir, docMarkdownDir, operation } = options;
  const { includePackageNames, excludePackageNames } = options;
  const packageNameFilter = getPackageNameFilter({
    includePackageNames,
    excludePackageNames,
  });

  const rootPath = getPath(docRootDir, cwd);
  const makeRootRel = (relativePath: string) =>
    makeRelative(relativePath, rootPath);

  const extractorOutputPath = makeRootRel(getPath(docApiDir, cwd));
  const documenterOutputPath = makeRootRel(getPath(docMarkdownDir, cwd));

  FileSystem.ensureFolder(extractorOutputPath);
  FileSystem.ensureFolder(documenterOutputPath);

  const pkg = JsonFile.load(makeRootRel("package.json"));

  if (operation === "extract" || operation === "generate") {
    const extractorConfigs: Array<ExtractorConfig> = [];
    const extractorErrorMessages: string[] = [];
    const addExtractorConfig = (extractorBundle: ExtractorBundle) => {
      const { extractorConfig, extractorErrorMessage, packageName } =
        extractorBundle;
      if (
        packageName !== "" &&
        packageNameFilter(packageName) &&
        extractorConfig
      ) {
        extractorConfigs.push(extractorConfig);
      }
      if (
        (packageName === "" || packageNameFilter(packageName)) &&
        extractorErrorMessage
      ) {
        extractorErrorMessages.push(extractorErrorMessage);
      }
    };
    if (pkg.types || pkg.typings) {
      addExtractorConfig(
        buildExtractorConfig(makeRootRel(""), extractorOutputPath)
      );
    } else if (pkg.workspaces) {
      let packagePaths: string[] = [];

      packagePaths = pkg.workspaces.reduce(
        (packagePaths: string[], workspace: string): string[] => {
          const workspacePackagePaths = glob.sync(
            ensureTrailingSlash(workspace)
          );
          packagePaths = packagePaths.concat(workspacePackagePaths);
          return packagePaths;
        },
        []
      );

      if (packagePaths.length > 0) {
        for (let packagePath of packagePaths) {
          addExtractorConfig(
            buildExtractorConfig(
              makeRootRel(packagePath),
              extractorOutputPath,
              ["**/*.d.ts"]
            )
          );
        }
      }
    }

    const succeededExtractors: ExtractorResultBundle[] = [];
    const failedExtractors: ExtractorResultBundle[] = [];
    if (extractorConfigs.length > 0) {
      FileSystem.ensureEmptyFolder(extractorOutputPath);
      for (let extractorConfig of extractorConfigs) {
        try {
          const extractorResult = Extractor.invoke(extractorConfig, {
            localBuild: true,
            showVerboseMessages: false,
            showDiagnostics: false,
            messageCallback: (message: ExtractorMessage) => {
              message.handled = true;
            },
          });

          if (extractorResult.succeeded) {
            succeededExtractors.push({
              extractorConfig,
              extractorResult,
              errorMessage: null,
            });
          } else {
            // console.error(
            //   `API Extractor completed with ${extractorResult.errorCount} errors` +
            //     ` and ${extractorResult.warningCount} warnings`
            // );
            // console.log("extractor no success result: ", extractorResult);
            failedExtractors.push({
              extractorConfig,
              extractorResult,
              errorMessage: null,
            });
          }
        } catch (e) {
          // console.log("error e", e);
          failedExtractors.push({
            extractorConfig,
            extractorResult: null,
            errorMessage: getErrorMessage(e),
          });
        }
      }
    }

    const succeededCount = succeededExtractors.length;
    const failedCount = extractorErrorMessages.length + failedExtractors.length;

    const totalCount = succeededCount + failedCount;
    console.log("Extractors succeeded: " + succeededCount + " / " + totalCount);
    if (failedCount > 0) {
      console.log("Extractors failed: " + failedCount + " / " + totalCount);
      for (let errorMessage of extractorErrorMessages) {
        console.error(errorMessage + "\n");
      }
      for (let failedExtractor of failedExtractors) {
        const { extractorResult, errorMessage } = failedExtractor;
        if (extractorResult) {
          console.error(
            `API Extractor completed with ${extractorResult.errorCount} errors` +
              ` and ${extractorResult.warningCount} warnings` +
              "\n"
          );
        } else if (errorMessage) {
          console.error(errorMessage + "\n");
        }
      }
    }
  }
  if (operation === "document" || operation === "generate") {
    const apiModel = new ApiModel();
    const inputFolder = extractorOutputPath;
    if (!FileSystem.exists(inputFolder)) {
      throw new Error("The input folder does not exist: " + inputFolder);
    }
    const outputFolder = documenterOutputPath;
    FileSystem.ensureFolder(outputFolder);
    const apiFilenames: string[] = [];
    for (const filename of FileSystem.readFolderItemNames(inputFolder)) {
      if (filename.match(/\.api\.json$/i) && packageNameFilter(filename)) {
        // console.log(`Reading ${filename}`);
        apiFilenames.push(filename);
        const filenamePath = path.join(inputFolder, filename);
        apiModel.loadPackage(filenamePath);
      }
    }
    if (operation === "document") {
      console.log("Documenter loaded api files: " + apiFilenames.length);
    }
    const { showInheritedMembers, newlineKind, markdownOptions } = options;
    const {
      fileLevel,
      indexFilename,
      indexTitle,
      indexBreadcrumbTitle,
      hideEmptyTableColumns,
      showPropertyDefaults,
      showBreadcrumb,
      indexBreadcrumbUrl,
      useIndex,
      showRules
    } = markdownOptions;

    const baseDocumenterConfig = {
      indexFilename,
      indexTitle,
      indexBreadcrumbTitle,
      hideEmptyTableColumns,
      showPropertyDefaults,
      showBreadcrumb,
      indexBreadcrumbUrl,
      useIndex,
      showRules,
      showInheritedMembers,
      newlineKind,
    };

    if (fileLevel === "all") {
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
          buildMarkdownDocumenterConfig({
            ...baseDocumenterConfig,
            fileLevel: fileLevel as FileLevelString,
          });
        if (documenterConfig) {
          const markdownDocumenter = new MarkdownDocumenter({
            apiModel,
            documenterConfig,
            outputFolder: subOutputFolder,
          });
          const { packageCount, fileCount } = markdownDocumenter.generateFiles();
          console.log("Documenter with fileLevel " + fileLevel + " created " + fileCount + " files for " + packageCount + " packages");
        } else {
          console.error("Generator error: " + documenterErrorMessage);
        }
      }
    } else {
      const { documenterConfig, documenterErrorMessage } =
        buildMarkdownDocumenterConfig({
          ...baseDocumenterConfig,
          fileLevel,
        });
      if (documenterConfig) {
        const markdownDocumenter = new MarkdownDocumenter({
          apiModel,
          documenterConfig,
          outputFolder,
        });
        const { packageCount, fileCount } = markdownDocumenter.generateFiles();
        console.log("Documenter created " + fileCount + " files for " + packageCount + " packages");
      } else {
        console.error("Generator error: " + documenterErrorMessage);
      }
    }
  }
  if (operation === "generate") {
    FileSystem.ensureEmptyFolder(extractorOutputPath);
  }
}
