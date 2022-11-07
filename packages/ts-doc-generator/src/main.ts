import * as path from "path";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { ApiModel } from "@microsoft/api-extractor-model";
import {
  JsonFile,
  FileSystem,
  NewlineKind,
} from "@rushstack/node-core-library";
import { MarkdownDocumenter } from "./documenters/MarkdownDocumenter";
import { MDDocumenter } from "./documenters/MDDocumenter";
import { NewDocumenter } from "./documenters/NewDocumenter";
import { FileLevel } from "./documenters/FileLevel";

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
) => {
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

const args = process.argv.slice(2);
const DO_EXTRACT = args.length === 0 || args.some((arg) => arg.includes("e"));
const DO_GENERATE = args.length === 0 || args.some((arg) => arg.includes("g"));
const DO_GENERATE_ORIGINAL =
  args.length === 0 || args.some((arg) => arg.includes("o"));
const DO_GENERATE_NEW =
  args.length === 0 || args.some((arg) => arg.includes("n"));

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

async function main() {
  const docRootDir = process.cwd();
  const makeCurrent = (relativePath: string) =>
    path.join(docRootDir, relativePath);

  const extractorOutputPath = makeCurrent("docs/apis");
  const documenterOutputPath = makeCurrent("docs/generated");

  FileSystem.ensureFolder(extractorOutputPath);
  FileSystem.ensureFolder(documenterOutputPath);

  const pkg = JsonFile.load(makeCurrent("package.json"));

  if (DO_EXTRACT) {
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
  if (DO_GENERATE) {
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

    if (DO_GENERATE_ORIGINAL) {
      // actually this is now the newest...

      const fileLevels: FileLevel[] = Object.keys(FileLevel).map(
        (fileLevel) => fileLevel as FileLevel
      );
      for (const fileLevel of fileLevels) {
        const subOutputFolder = path.join(outputFolder, fileLevel);
        FileSystem.ensureFolder(subOutputFolder);
        const markdownDocumenter = new MarkdownDocumenter(
          {
            apiModel,
            documenterConfig: undefined, // { showInheritedMembers: true, tableOfContents: {} }
            outputFolder: subOutputFolder,
          },
          {
            fileLevel,
            indexFilename: "index",
          }
        );
        markdownDocumenter.generateFiles();
      }
    } else if (DO_GENERATE_NEW) {
      const markdownDocumenter = new NewDocumenter({
        apiModel,
        documenterConfig: undefined, // { showInheritedMembers: true, tableOfContents: {} }
        outputFolder,
      });
      markdownDocumenter.generateFiles();
    } else {
      const markdownDocumenter = new MDDocumenter(
        {
          apiModel,
          // documenterConfig: {
          //   configFilePath: "",
          //   configFile: {
          //     showInheritedMembers: true,
          //     outputTarget: "markdown",
          //     newlineKind: NewlineKind.CrLf,
          //     markdownOptions: {
          //       fileLevel: "package",
          //       indexBreadcrumb: "Home",
          //       indexFilename: "index.md",
          //       indexTitle: "Sample API Docs"
          //     },
          //   },
          // },
          documenterConfig: undefined, // { showInheritedMembers: true, tableOfContents: {} }
          outputFolder,
        },
        FileLevel.Package
      );
      markdownDocumenter.generateFiles();
    }
  }
}

main().catch(console.error);
