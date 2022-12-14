// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from "path";
import { PackageName, FileSystem } from "@rushstack/node-core-library";
import {
  DocSection,
  DocPlainText,
  DocLinkTag,
  TSDocConfiguration,
  StringBuilder,
  DocNodeKind,
  DocParagraph,
  DocCodeSpan,
  DocFencedCode,
  StandardTags,
  DocBlock,
  DocComment,
  DocNodeContainer,
} from "@microsoft/tsdoc";
import {
  ApiModel,
  ApiItem,
  ApiEnum,
  ApiPackage,
  ApiItemKind,
  ApiReleaseTagMixin,
  ApiDocumentedItem,
  ApiClass,
  ReleaseTag,
  ApiStaticMixin,
  ApiPropertyItem,
  ApiInterface,
  Excerpt,
  ApiParameterListMixin,
  ApiReturnTypeMixin,
  ApiDeclaredItem,
  ApiNamespace,
  ExcerptTokenKind,
  IResolveDeclarationReferenceResult,
  ApiTypeAlias,
  ExcerptToken,
  ApiOptionalMixin,
  ApiInitializerMixin,
  ApiProtectedMixin,
  ApiReadonlyMixin,
  IFindApiItemsResult,
  ApiCallSignature,
} from "@microsoft/api-extractor-model";

import { CustomDocNodes } from "../nodes/CustomDocNodeKind";
import { DocAnchor } from "../nodes/DocAnchor";
import { DocHeading } from "../nodes/DocHeading";
import { DocHorizontalRule } from "../nodes/DocHorizontalRule";
import { DocLineBreak } from "../nodes/DocLineBreak";
import { DocTable } from "../nodes/DocTable";
import { DocEmphasisSpan } from "../nodes/DocEmphasisSpan";
import { DocTableRow } from "../nodes/DocTableRow";
import { DocTableCell } from "../nodes/DocTableCell";
import { DocNoteBox } from "../nodes/DocNoteBox";
import { Utilities } from "../utils/Utilities";
import { CustomMarkdownEmitter } from "../markdown/CustomMarkdownEmitter";
import { PluginLoader } from "../plugin/PluginLoader";
import {
  IMarkdownDocumenterFeatureOnBeforeWritePageArgs,
  MarkdownDocumenterFeatureContext,
} from "../plugin/MarkdownDocumenterFeature";
import { DocumenterConfig } from "./DocumenterConfig";
import { MarkdownDocumenterAccessor } from "../plugin/MarkdownDocumenterAccessor";
import { FileLevel } from "./FileLevel";
import { createItemPath, ApiItemPath } from "./ApiItemPath";

export interface IMarkdownDocumenterOptions {
  apiModel: ApiModel;
  documenterConfig: DocumenterConfig | undefined;
  outputFolder: string;
}

export interface DocumenterStats {
  packageCount: number;
  fileCount: number;
}

class Logger {
  private readonly _packageNames: string[] = [];
  private readonly _fileNames: string[] = [];

  logPackage(packageName: string): void {
    this._packageNames.push(packageName);
  }

  logFile(fileName: string): void {
    this._fileNames.push(fileName);
  }

  get packageNames(): string[] {
    return this._packageNames;
  }

  get packageCount(): number {
    return this._packageNames.length;
  }

  get fileNames(): string[] {
    return this._fileNames;
  }

  get fileCount(): number {
    return this._fileNames.length;
  }

  get stats(): DocumenterStats {
    const { fileCount, packageCount } = this;
    return {
      fileCount,
      packageCount,
    };
  }
}

/**
 * Renders API documentation in the Markdown file format.
 * For more info:  https://en.wikipedia.org/wiki/Markdown
 */
export class MarkdownDocumenter {
  private readonly _fileLevel: FileLevel;
  private _currentItemPath: ApiItemPath;
  private readonly _apiModel: ApiModel;
  private readonly _tsdocConfiguration: TSDocConfiguration;
  private readonly _markdownEmitter: CustomMarkdownEmitter;
  private readonly _outputFolder: string;
  private readonly _pluginLoader: PluginLoader;
  private readonly _documenterConfig: DocumenterConfig;
  private readonly _logger: Logger;

  public constructor(options: IMarkdownDocumenterOptions) {
    const documenterConfig = (this._documenterConfig = DocumenterConfig.prepare(
      options.documenterConfig?.configFile
    ));
    const fileLevel = (this._fileLevel = documenterConfig.fileLevel);
    this._currentItemPath = createItemPath(
      options.apiModel,
      fileLevel,
      documenterConfig.configFile.markdownOptions.indexFilename
    );
    this._apiModel = options.apiModel;
    this._outputFolder = options.outputFolder;
    this._tsdocConfiguration = CustomDocNodes.configuration;
    this._markdownEmitter = new CustomMarkdownEmitter(this._apiModel);

    this._pluginLoader = new PluginLoader();
    this._logger = new Logger();
  }

  private isCollapsedInterface(apiItem: ApiItem): boolean {
    if (apiItem.kind === ApiItemKind.Interface) {
      const { members, extendsTypes } = apiItem as ApiInterface;
      return (
        this._documenterConfig.configFile.markdownOptions
          .collapseCallSignatures &&
        members.length === 1 &&
        members[0].kind === ApiItemKind.CallSignature &&
        (extendsTypes === undefined || extendsTypes.length === 0)
      );
    }
    return false;
  }

  private isCollapsedCallSignature(apiItem: ApiItem): boolean {
    if (
      apiItem.kind === ApiItemKind.CallSignature &&
      apiItem.parent !== undefined &&
      apiItem.parent.kind === ApiItemKind.Interface
    ) {
      const { members, extendsTypes } = apiItem.parent as ApiInterface;
      return (
        this._documenterConfig.configFile.markdownOptions
          .collapseCallSignatures &&
        members.length === 1 &&
        (extendsTypes === undefined || extendsTypes.length === 0)
      );
    }
    return false;
  }

  public generateFiles(): DocumenterStats {
    if (this._documenterConfig) {
      this._pluginLoader.load(this._documenterConfig, () => {
        return new MarkdownDocumenterFeatureContext({
          apiModel: this._apiModel,
          outputFolder: this._outputFolder,
          documenter: new MarkdownDocumenterAccessor({
            getLinkForApiItem: (apiItem: ApiItem) => {
              return this._getLinkFilenameForApiItem(apiItem);
            },
          }),
        });
      });
    }

    // console.log();
    this._deleteOldOutputFiles();

    this._writeApiItemPage(this._apiModel, null);

    if (this._pluginLoader.markdownDocumenterFeature) {
      this._pluginLoader.markdownDocumenterFeature.onFinished({});
    }
    return this._logger.stats;
  }

  private _writeApiItemPages(
    apiItems: ApiItem[],
    parentOutput: DocSection,
    addRule: boolean,
    showLineBreaks: boolean
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    for (const apiItem of apiItems) {
      if (showLineBreaks) {
        parentOutput.appendNode(new DocLineBreak({ configuration }));
      }
      this._writeApiItemPage(apiItem, parentOutput);
    }
    if (addRule) {
      parentOutput.appendNode(new DocHorizontalRule({ configuration }));
    }
  }

  private _writeApiItemPage(
    apiItem: ApiItem,
    parentOutput: DocSection | null
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    const output: DocSection = new DocSection({ configuration });
    const savedItemPath = this._currentItemPath;
    const itemPath = (this._currentItemPath =
      this._currentItemPath.createPathForItem(apiItem));
    const isCollapsedInterface = this.isCollapsedInterface(apiItem);
    const isCollapsedCallSignature = this.isCollapsedCallSignature(apiItem);

    if (itemPath.getIsFileLevel()) {
      this._writeBreadcrumb(output, apiItem);
    }

    if (!isCollapsedCallSignature && itemPath.getHasAnchor()) {
      const itemAnchorLink = itemPath.getAnchorPath();
      output.appendNode(new DocAnchor({ configuration, name: itemAnchorLink }));
    }

    const scopedName: string = apiItem.getScopedNameWithinPackage();
    const level = itemPath.getHeaderLevel();

    switch (apiItem.kind) {
      case ApiItemKind.Class:
        output.appendNode(
          new DocHeading({ configuration, level, title: `${scopedName} class` })
        );
        break;
      case ApiItemKind.Enum:
        output.appendNode(
          new DocHeading({ configuration, level, title: `${scopedName} enum` })
        );
        break;
      case ApiItemKind.Interface:
        if (isCollapsedInterface) {
          output.appendNode(
            new DocHeading({
              configuration,
              level,
              title: `${scopedName} call signature`,
            })
          );
        } else {
          output.appendNode(
            new DocHeading({
              configuration,
              level,
              title: `${scopedName} interface`,
            })
          );
        }
        break;
      case ApiItemKind.CallSignature:
        if (!isCollapsedCallSignature) {
          const parentPrefix = apiItem.parent
            ? apiItem.parent.displayName + "."
            : "";

          const overloadSuffix =
            "call-" + this.getCallSignatureIndex(apiItem as ApiCallSignature);

          output.appendNode(
            new DocHeading({
              configuration,
              level,
              title: `${parentPrefix}${overloadSuffix} call signature`,
            })
          );
        }

        break;
      case ApiItemKind.Constructor:
      case ApiItemKind.ConstructSignature:
        output.appendNode(
          new DocHeading({ configuration, level, title: scopedName })
        );
        break;
      case ApiItemKind.Method:
      case ApiItemKind.MethodSignature:
        output.appendNode(
          new DocHeading({
            configuration,
            level,
            title: `${scopedName} method`,
          })
        );
        break;
      case ApiItemKind.Function:
        output.appendNode(
          new DocHeading({
            configuration,
            level,
            title: `${scopedName} function`,
          })
        );
        break;
      case ApiItemKind.Model:
        const title =
          this._documenterConfig.configFile.markdownOptions.indexTitle;
        output.appendNode(new DocHeading({ configuration, level, title }));
        break;
      case ApiItemKind.Namespace:
        output.appendNode(
          new DocHeading({
            configuration,
            level,
            title: `${scopedName} namespace`,
          })
        );
        break;
      case ApiItemKind.Package:
        // console.log(`Writing ${apiItem.displayName} package`);
        this._logger.logPackage(apiItem.displayName);
        const unscopedPackageName: string = PackageName.getUnscopedName(
          apiItem.displayName
        );
        output.appendNode(
          new DocHeading({
            configuration,
            level,
            title: `${unscopedPackageName} package`,
          })
        );
        break;
      case ApiItemKind.Property:
      case ApiItemKind.PropertySignature:
        output.appendNode(
          new DocHeading({
            configuration,
            level,
            title: `${scopedName} property`,
          })
        );
        break;
      case ApiItemKind.TypeAlias:
        output.appendNode(
          new DocHeading({ configuration, level, title: `${scopedName} type` })
        );
        break;
      case ApiItemKind.Variable:
        output.appendNode(
          new DocHeading({
            configuration,
            level,
            title: `${scopedName} variable`,
          })
        );
        break;
      default:
        throw new Error("Unsupported API item kind: " + apiItem.kind);
    }

    if (ApiReleaseTagMixin.isBaseClassOf(apiItem)) {
      if (apiItem.releaseTag === ReleaseTag.Beta) {
        this._writeBetaWarning(output);
      }
    }

    const decoratorBlocks: DocBlock[] = [];

    if (apiItem instanceof ApiDocumentedItem) {
      const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

      if (tsdocComment) {
        decoratorBlocks.push(
          ...tsdocComment.customBlocks.filter(
            (block) =>
              block.blockTag.tagNameWithUpperCase ===
              StandardTags.decorator.tagNameWithUpperCase
          )
        );

        if (tsdocComment.deprecatedBlock) {
          output.appendNode(
            new DocNoteBox({ configuration }, [
              new DocParagraph({ configuration }, [
                new DocPlainText({
                  configuration,
                  text: "Warning: This API is now obsolete. ",
                }),
              ]),
              ...tsdocComment.deprecatedBlock.content.nodes,
            ])
          );
        }

        this._appendSection(output, tsdocComment.summarySection);
      }
    }

    if (!isCollapsedInterface && apiItem instanceof ApiDeclaredItem) {
      if (apiItem.excerpt.text.length > 0) {
        output.appendNode(
          new DocParagraph({ configuration }, [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: "Signature:" }),
            ]),
          ])
        );
        if (isCollapsedCallSignature && apiItem.parent !== undefined) {
          const parentCode = (apiItem.parent as ApiInterface)
            .getExcerptWithModifiers()
            .trim();
          output.appendNode(
            new DocFencedCode({
              configuration,
              code:
                parentCode +
                " {\n  " +
                apiItem.getExcerptWithModifiers() +
                "\n}",
              language: "typescript",
            })
          );
        } else {
          output.appendNode(
            new DocFencedCode({
              configuration,
              code: apiItem.getExcerptWithModifiers(),
              language: "typescript",
            })
          );
        }
      }

      this._writeHeritageTypes(output, apiItem);
    }

    if (decoratorBlocks.length > 0) {
      output.appendNode(
        new DocParagraph({ configuration }, [
          new DocEmphasisSpan({ configuration, bold: true }, [
            new DocPlainText({ configuration, text: "Decorators:" }),
          ]),
        ])
      );
      for (const decoratorBlock of decoratorBlocks) {
        output.appendNodes(decoratorBlock.content.nodes);
      }
    }

    let appendRemarks: boolean = true;
    switch (apiItem.kind) {
      case ApiItemKind.Class:
      case ApiItemKind.Interface:
      case ApiItemKind.Namespace:
      case ApiItemKind.Package:
        this._writeRemarksSection(output, apiItem);
        appendRemarks = false;
        break;
    }

    switch (apiItem.kind) {
      case ApiItemKind.Class:
        this._writeClassTables(output, apiItem as ApiClass);
        break;
      case ApiItemKind.Enum:
        this._writeEnumTables(output, apiItem as ApiEnum);
        break;
      case ApiItemKind.Interface:
        this._writeInterfaceTables(output, apiItem as ApiInterface);
        break;
      case ApiItemKind.CallSignature:
      case ApiItemKind.Constructor:
      case ApiItemKind.ConstructSignature:
      case ApiItemKind.Method:
      case ApiItemKind.MethodSignature:
      case ApiItemKind.Function:
        this._writeParameterTables(output, apiItem as ApiParameterListMixin);
        this._writeThrowsSection(output, apiItem);
        break;
      case ApiItemKind.Namespace:
        this._writePackageOrNamespaceTables(output, apiItem as ApiNamespace);
        break;
      case ApiItemKind.Model:
        this._writeModelTable(output, apiItem as ApiModel);
        break;
      case ApiItemKind.Package:
        this._writePackageOrNamespaceTables(output, apiItem as ApiPackage);
        break;
      case ApiItemKind.Property:
      case ApiItemKind.PropertySignature:
        break;
      case ApiItemKind.TypeAlias:
        break;
      case ApiItemKind.Variable:
        break;
      default:
        throw new Error("Unsupported API item kind: " + apiItem.kind);
    }

    if (appendRemarks) {
      this._writeRemarksSection(output, apiItem);
    }
    this._writeDefaultSection(output, apiItem);

    if (itemPath.getIsFileLevel()) {
      const relativeFilename =
        this._fileLevel === FileLevel.Model || apiItem === this._apiModel
          ? "index.md"
          : itemPath.getFilePath();
      const filename: string = path.join(this._outputFolder, relativeFilename);

      const stringBuilder: StringBuilder = new StringBuilder();

      stringBuilder.append(
        "<!-- Do not edit this file. It is automatically generated by API Documenter. -->\n\n"
      );

      this._markdownEmitter.emit(stringBuilder, output, {
        contextApiItem: apiItem,
        // this filename is actually used for building links, so the Filename part should be renamed...
        onGetFilenameForApiItem: (apiItemForFilename: ApiItem) => {
          return itemPath.getRelativeLink(apiItemForFilename);
        },
      });

      let pageContent: string = stringBuilder.toString();

      if (this._pluginLoader.markdownDocumenterFeature) {
        // Allow the plugin to customize the pageContent
        const eventArgs: IMarkdownDocumenterFeatureOnBeforeWritePageArgs = {
          apiItem: apiItem,
          outputFilename: filename,
          pageContent: pageContent,
        };
        this._pluginLoader.markdownDocumenterFeature.onBeforeWritePage(
          eventArgs
        );
        pageContent = eventArgs.pageContent;
      }

      this._logger.logFile(filename);
      FileSystem.writeFile(filename, pageContent, {
        convertLineEndings: this._documenterConfig.newlineKind,
      });
    } else if (parentOutput) {
      parentOutput.appendNodes(output.nodes);
    }
    this._currentItemPath = savedItemPath;
  }

  private _writeHeritageTypes(
    output: DocSection,
    apiItem: ApiDeclaredItem
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    if (apiItem instanceof ApiClass) {
      if (apiItem.extendsType) {
        const extendsParagraph: DocParagraph = new DocParagraph(
          { configuration },
          [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: "Extends: " }),
            ]),
          ]
        );
        this._appendExcerptWithHyperlinks(
          extendsParagraph,
          apiItem.extendsType.excerpt
        );
        output.appendNode(extendsParagraph);
      }
      if (apiItem.implementsTypes.length > 0) {
        const implementsParagraph: DocParagraph = new DocParagraph(
          { configuration },
          [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: "Implements: " }),
            ]),
          ]
        );
        let needsComma: boolean = false;
        for (const implementsType of apiItem.implementsTypes) {
          if (needsComma) {
            implementsParagraph.appendNode(
              new DocPlainText({ configuration, text: ", " })
            );
          }
          this._appendExcerptWithHyperlinks(
            implementsParagraph,
            implementsType.excerpt
          );
          needsComma = true;
        }
        output.appendNode(implementsParagraph);
      }
    }

    if (apiItem instanceof ApiInterface) {
      if (apiItem.extendsTypes.length > 0) {
        const extendsParagraph: DocParagraph = new DocParagraph(
          { configuration },
          [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: "Extends: " }),
            ]),
          ]
        );
        let needsComma: boolean = false;
        for (const extendsType of apiItem.extendsTypes) {
          if (needsComma) {
            extendsParagraph.appendNode(
              new DocPlainText({ configuration, text: ", " })
            );
          }
          this._appendExcerptWithHyperlinks(
            extendsParagraph,
            extendsType.excerpt
          );
          needsComma = true;
        }
        output.appendNode(extendsParagraph);
      }
    }

    if (apiItem instanceof ApiTypeAlias) {
      const refs: ExcerptToken[] = apiItem.excerptTokens.filter(
        (token) =>
          token.kind === ExcerptTokenKind.Reference &&
          token.canonicalReference &&
          this._apiModel.resolveDeclarationReference(
            token.canonicalReference,
            undefined
          ).resolvedApiItem
      );
      if (refs.length > 0) {
        const referencesParagraph: DocParagraph = new DocParagraph(
          { configuration },
          [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: "References: " }),
            ]),
          ]
        );
        let needsComma: boolean = false;
        const visited: Set<string> = new Set();
        for (const ref of refs) {
          if (visited.has(ref.text)) {
            continue;
          }
          visited.add(ref.text);

          if (needsComma) {
            referencesParagraph.appendNode(
              new DocPlainText({ configuration, text: ", " })
            );
          }

          this._appendExcerptTokenWithHyperlinks(referencesParagraph, ref);
          needsComma = true;
        }
        output.appendNode(referencesParagraph);
      }
    }
  }

  private _appendHeading(output: DocSection, title: string): void {
    const { configuration } = output;
    if (this._fileLevel === FileLevel.Member) {
      // This is for perfect compatibility with the original implementation
      output.appendNode(new DocHeading({ configuration, title }));
    } else {
      const level = this._currentItemPath.getHeaderLevelChild();
      const suffix = ":";
      if (level !== undefined) {
        output.appendNode(
          new DocHeading({ configuration, title: title + suffix, level })
        );
      } else {
        output.appendNode(
          new DocParagraph({ configuration }, [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: title + suffix }),
            ]),
          ])
        );
      }
    }
  }

  private _appendTableHeading(
    output: DocSection,
    title: string,
    useLineBreaks: boolean
  ): void {
    if (useLineBreaks) {
      const { configuration } = output;
      output.appendNode(new DocLineBreak({ configuration }));
    }
    this._appendHeading(output, title);
  }

  private _writeRemarksSection(output: DocSection, apiItem: ApiItem): void {
    if (apiItem instanceof ApiDocumentedItem) {
      const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

      if (tsdocComment) {
        // Write the @remarks block
        if (tsdocComment.remarksBlock) {
          this._appendHeading(output, "Remarks");
          this._appendSection(output, tsdocComment.remarksBlock.content);
        }

        // Write the @example blocks
        const exampleBlocks: DocBlock[] = tsdocComment.customBlocks.filter(
          (x) =>
            x.blockTag.tagNameWithUpperCase ===
            StandardTags.example.tagNameWithUpperCase
        );

        let exampleNumber: number = 1;
        for (const exampleBlock of exampleBlocks) {
          const heading: string =
            exampleBlocks.length > 1 ? `Example ${exampleNumber}` : "Example";

          this._appendHeading(output, heading);

          this._appendSection(output, exampleBlock.content);

          ++exampleNumber;
        }
      }
    }
  }

  private _writeDefaultSection(output: DocSection, apiItem: ApiItem): void {
    if (
      apiItem instanceof ApiPropertyItem &&
      apiItem instanceof ApiDocumentedItem
    ) {
      const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

      if (tsdocComment) {
        const defaultTags = tsdocComment.customBlocks.filter(
          (b) =>
            b.blockTag.tagNameWithUpperCase ===
            StandardTags.defaultValue.tagNameWithUpperCase
        );
        if (defaultTags !== undefined && defaultTags.length === 1) {
          const defaultTag = defaultTags[0];
          this._appendHeading(output, "Default Value");
          this._appendSection(output, defaultTag.content);
        }
      }
    }
  }

  private _writeThrowsSection(output: DocSection, apiItem: ApiItem): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    if (apiItem instanceof ApiDocumentedItem) {
      const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

      if (tsdocComment) {
        // Write the @throws blocks
        const throwsBlocks: DocBlock[] = tsdocComment.customBlocks.filter(
          (x) =>
            x.blockTag.tagNameWithUpperCase ===
            StandardTags.throws.tagNameWithUpperCase
        );

        if (throwsBlocks.length > 0) {
          const heading: string = "Exceptions";
          this._appendHeading(output, heading);

          for (const throwsBlock of throwsBlocks) {
            this._appendSection(output, throwsBlock.content);
          }
        }
      }
    }
  }

  /**
   * GENERATE PAGE: MODEL
   */
  private _writeModelTable(output: DocSection, apiModel: ApiModel): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const packagesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Package", "Description"],
      skipEmptyColumns: this._getHideEmptyTableColumns(),
    });

    const apiMembersPackages: ApiItem[] = [];

    for (const apiMember of apiModel.members) {
      const row: DocTableRow = new DocTableRow({ configuration }, [
        this._createTitleCell(apiMember),
        this._createDescriptionCell(apiMember),
      ]);

      switch (apiMember.kind) {
        case ApiItemKind.Package:
          packagesTable.addRow(row);
          apiMembersPackages.push(apiMember);
          break;
      }
    }

    const useRule =
      this._documenterConfig.configFile.markdownOptions.showRules &&
      this._currentItemPath.getIsFileLevelExact();
    const useLineBreaks = false;
    if (useRule) {
      output.appendNode(new DocHorizontalRule({ configuration }));
    }

    if (packagesTable.rows.length > 0) {
      this._appendTableHeading(output, "Packages", useLineBreaks);
      output.appendNode(packagesTable);
      this._writeApiItemPages(
        apiMembersPackages,
        output,
        useRule,
        useLineBreaks
      );
    }
  }

  /**
   * GENERATE PAGE: PACKAGE or NAMESPACE
   */
  private _writePackageOrNamespaceTables(
    output: DocSection,
    apiContainer: ApiPackage | ApiNamespace
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const classesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Class", "Description"],
    });

    const enumerationsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Enumeration", "Description"],
    });

    const functionsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Function", "Description"],
    });

    const interfacesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Interface", "Description"],
    });

    const collapsedInterfacesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Call Signature", "Description"],
    });

    const namespacesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Namespace", "Description"],
    });

    const variablesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Variable", "Description"],
    });

    const typeAliasesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Type Alias", "Description"],
    });

    const apiMembers: ReadonlyArray<ApiItem> =
      apiContainer.kind === ApiItemKind.Package
        ? (apiContainer as ApiPackage).entryPoints[0].members
        : (apiContainer as ApiNamespace).members;
    const apiMembersClasses: ApiItem[] = [];
    const apiMembersEnums: ApiItem[] = [];
    const apiMembersInterfaces: ApiItem[] = [];
    const apiMembersCollapsedInterfaces: ApiItem[] = [];
    const apiMembersNamespaces: ApiItem[] = [];
    const apiMembersFunctions: ApiItem[] = [];
    const apiMembersTypeAliases: ApiItem[] = [];
    const apiMembersVariables: ApiItem[] = [];

    for (const apiMember of apiMembers) {
      const row: DocTableRow = new DocTableRow({ configuration }, [
        this._createTitleCell(apiMember),
        this._createDescriptionCell(apiMember),
      ]);

      switch (apiMember.kind) {
        case ApiItemKind.Class:
          classesTable.addRow(row);
          apiMembersClasses.push(apiMember);
          break;

        case ApiItemKind.Enum:
          enumerationsTable.addRow(row);
          apiMembersEnums.push(apiMember);
          break;

        case ApiItemKind.Interface:
          if (this.isCollapsedInterface(apiMember)) {
            collapsedInterfacesTable.addRow(row);
            apiMembersCollapsedInterfaces.push(apiMember);
          } else {
            interfacesTable.addRow(row);
            apiMembersInterfaces.push(apiMember);
          }
          break;

        case ApiItemKind.Namespace:
          namespacesTable.addRow(row);
          apiMembersNamespaces.push(apiMember);
          break;

        case ApiItemKind.Function:
          functionsTable.addRow(row);
          apiMembersFunctions.push(apiMember);
          break;

        case ApiItemKind.TypeAlias:
          typeAliasesTable.addRow(row);
          apiMembersTypeAliases.push(apiMember);
          break;

        case ApiItemKind.Variable:
          variablesTable.addRow(row);
          apiMembersVariables.push(apiMember);
          break;
      }
    }

    const useRule =
      this._documenterConfig.configFile.markdownOptions.showRules &&
      this._currentItemPath.getIsFileLevelExact();
    if (useRule) {
      output.appendNode(new DocHorizontalRule({ configuration }));
    }
    const useLineBreaks =
      this._documenterConfig.configFile.markdownOptions.showLineBreaks &&
      this._fileLevel !== FileLevel.Export &&
      this._fileLevel !== FileLevel.Member;

    if (classesTable.rows.length > 0) {
      this._appendTableHeading(output, "Classes", useLineBreaks);
      output.appendNode(classesTable);
      this._writeApiItemPages(
        apiMembersClasses,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (enumerationsTable.rows.length > 0) {
      this._appendTableHeading(output, "Enumerations", useLineBreaks);
      output.appendNode(enumerationsTable);
      this._writeApiItemPages(apiMembersEnums, output, useRule, useLineBreaks);
    }
    if (functionsTable.rows.length > 0) {
      this._appendTableHeading(output, "Functions", useLineBreaks);
      output.appendNode(functionsTable);
      this._writeApiItemPages(
        apiMembersFunctions,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (collapsedInterfacesTable.rows.length > 0) {
      this._appendTableHeading(output, "Call Signatures", useLineBreaks); // TODO - make this configurable?
      output.appendNode(collapsedInterfacesTable);
      this._writeApiItemPages(
        apiMembersCollapsedInterfaces,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (interfacesTable.rows.length > 0) {
      this._appendTableHeading(output, "Interfaces", useLineBreaks);
      output.appendNode(interfacesTable);
      this._writeApiItemPages(
        apiMembersInterfaces,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (namespacesTable.rows.length > 0) {
      this._appendTableHeading(output, "Namespaces", useLineBreaks);
      output.appendNode(namespacesTable);
      this._writeApiItemPages(
        apiMembersNamespaces,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (typeAliasesTable.rows.length > 0) {
      this._appendTableHeading(output, "Type Aliases", useLineBreaks);
      output.appendNode(typeAliasesTable);
      this._writeApiItemPages(
        apiMembersTypeAliases,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (variablesTable.rows.length > 0) {
      this._appendTableHeading(output, "Variables", useLineBreaks);
      output.appendNode(variablesTable);
      this._writeApiItemPages(
        apiMembersVariables,
        output,
        useRule,
        useLineBreaks
      );
    }
  }

  private _getShowPropertyDefaults(): boolean {
    return this._documenterConfig.configFile.markdownOptions
      .showPropertyDefaults;
  }

  private _getHideEmptyTableColumns(): boolean {
    return this._documenterConfig.configFile.markdownOptions
      .hideEmptyTableColumns;
  }

  /**
   * GENERATE PAGE: CLASS
   */
  private _writeClassTables(output: DocSection, apiClass: ApiClass): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const eventsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Property", "Modifiers", "Type", "Description"],
    });

    const constructorsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Constructor", "Modifiers", "Description"],
    });

    const propertiesTable: DocTable = new DocTable({
      configuration,
      headerTitles: this._getShowPropertyDefaults()
        ? ["Property", "Modifiers", "Type", "Default", "Description"]
        : ["Property", "Modifiers", "Type", "Description"],
    });

    const methodsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Method", "Modifiers", "Description"],
    });

    const apiMembers: readonly ApiItem[] =
      this._getMembersAndWriteIncompleteWarning(apiClass, output);
    const apiMembersConstructors: ApiItem[] = [];
    const apiMembersMethods: ApiItem[] = [];
    const apiMembersProperties: ApiItem[] = [];
    const apiMembersEvents: ApiItem[] = [];

    for (const apiMember of apiMembers) {
      const isInherited: boolean = apiMember.parent !== apiClass;
      switch (apiMember.kind) {
        case ApiItemKind.Constructor: {
          constructorsTable.addRow(
            new DocTableRow({ configuration }, [
              this._createTitleCell(apiMember),
              this._createModifiersCell(apiMember),
              this._createDescriptionCell(apiMember, isInherited),
            ])
          );

          apiMembersConstructors.push(apiMember);
          break;
        }
        case ApiItemKind.Method: {
          methodsTable.addRow(
            new DocTableRow({ configuration }, [
              this._createTitleCell(apiMember),
              this._createModifiersCell(apiMember),
              this._createDescriptionCell(apiMember, isInherited),
            ])
          );

          apiMembersMethods.push(apiMember);
          break;
        }
        case ApiItemKind.Property: {
          if ((apiMember as ApiPropertyItem).isEventProperty) {
            eventsTable.addRow(
              new DocTableRow({ configuration }, [
                this._createTitleCell(apiMember),
                this._createModifiersCell(apiMember),
                this._createPropertyTypeCell(apiMember),
                this._createDescriptionCell(apiMember, isInherited),
              ])
            );
            apiMembersEvents.push(apiMember);
          } else {
            if (this._getShowPropertyDefaults()) {
              propertiesTable.addRow(
                new DocTableRow({ configuration }, [
                  this._createTitleCell(apiMember),
                  this._createModifiersCell(apiMember),
                  this._createPropertyTypeCell(apiMember),
                  this._createPropertyDefaultCell(apiMember),
                  this._createDescriptionCell(apiMember, isInherited),
                ])
              );
            } else {
              propertiesTable.addRow(
                new DocTableRow({ configuration }, [
                  this._createTitleCell(apiMember),
                  this._createModifiersCell(apiMember),
                  this._createPropertyTypeCell(apiMember),
                  this._createDescriptionCell(apiMember, isInherited),
                ])
              );
            }
            apiMembersProperties.push(apiMember);
          }

          break;
        }
      }
    }

    const useRule =
      this._documenterConfig.configFile.markdownOptions.showRules &&
      this._currentItemPath.getIsFileLevelExact();
    if (useRule) {
      output.appendNode(new DocHorizontalRule({ configuration }));
    }
    const useLineBreaks =
      this._documenterConfig.configFile.markdownOptions.showLineBreaks &&
      this._fileLevel !== FileLevel.Member;

    if (eventsTable.rows.length > 0) {
      this._appendTableHeading(output, "Events", useLineBreaks);
      output.appendNode(eventsTable);
      this._writeApiItemPages(apiMembersEvents, output, useRule, useLineBreaks);
    }

    if (constructorsTable.rows.length > 0) {
      this._appendTableHeading(output, "Constructors", useLineBreaks);
      output.appendNode(constructorsTable);
      this._writeApiItemPages(
        apiMembersConstructors,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (propertiesTable.rows.length > 0) {
      this._appendTableHeading(output, "Properties", useLineBreaks);
      output.appendNode(propertiesTable);
      this._writeApiItemPages(
        apiMembersProperties,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (methodsTable.rows.length > 0) {
      this._appendTableHeading(output, "Methods", useLineBreaks);
      output.appendNode(methodsTable);
      this._writeApiItemPages(
        apiMembersMethods,
        output,
        useRule,
        useLineBreaks
      );
    }
  }

  /**
   * GENERATE PAGE: ENUM
   */
  private _writeEnumTables(output: DocSection, apiEnum: ApiEnum): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const enumMembersTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Member", "Value", "Description"],
    });

    for (const apiEnumMember of apiEnum.members) {
      enumMembersTable.addRow(
        new DocTableRow({ configuration }, [
          new DocTableCell({ configuration }, [
            new DocParagraph({ configuration }, [
              new DocPlainText({
                configuration,
                text: Utilities.getConciseSignature(apiEnumMember),
              }),
            ]),
          ]),
          this._createInitializerCell(apiEnumMember),
          this._createDescriptionCell(apiEnumMember),
        ])
      );
    }

    if (enumMembersTable.rows.length > 0) {
      this._appendHeading(output, "Enumeration Members");
      output.appendNode(enumMembersTable);
    }
  }

  /**
   * GENERATE PAGE: INTERFACE
   */
  private _writeInterfaceTables(
    output: DocSection,
    apiInterface: ApiInterface
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    if (this.isCollapsedInterface(apiInterface)) {
      this._writeApiItemPage(apiInterface.members[0], output);
      return;
    }

    const eventsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Property", "Modifiers", "Type", "Description"],
    });

    const propertiesTable: DocTable = new DocTable({
      configuration,
      headerTitles: this._getShowPropertyDefaults()
        ? ["Property", "Modifiers", "Type", "Default", "Description"]
        : ["Property", "Modifiers", "Type", "Description"],
    });

    const methodsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Method", "Description"],
    });

    const callSignaturesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Call Signature", "Description"],
    });

    const apiMembers: readonly ApiItem[] =
      this._getMembersAndWriteIncompleteWarning(apiInterface, output);
    const apiMembersMethods: ApiItem[] = [];
    const apiMembersCallSignatures: ApiItem[] = [];
    const apiMembersProperties: ApiItem[] = [];
    const apiMembersEvents: ApiItem[] = [];

    for (const apiMember of apiMembers) {
      const isInherited: boolean = apiMember.parent !== apiInterface;
      switch (apiMember.kind) {
        case ApiItemKind.ConstructSignature:
        case ApiItemKind.MethodSignature: {
          methodsTable.addRow(
            new DocTableRow({ configuration }, [
              this._createTitleCell(apiMember),
              this._createDescriptionCell(apiMember, isInherited),
            ])
          );

          apiMembersMethods.push(apiMember);
          break;
        }
        case ApiItemKind.CallSignature: {
          callSignaturesTable.addRow(
            new DocTableRow({ configuration }, [
              this._createTitleCell(apiMember),
              this._createDescriptionCell(apiMember, isInherited),
            ])
          );

          apiMembersCallSignatures.push(apiMember);
          break;
        }
        case ApiItemKind.PropertySignature: {
          if ((apiMember as ApiPropertyItem).isEventProperty) {
            eventsTable.addRow(
              new DocTableRow({ configuration }, [
                this._createTitleCell(apiMember),
                this._createModifiersCell(apiMember),
                this._createPropertyTypeCell(apiMember),
                this._createDescriptionCell(apiMember, isInherited),
              ])
            );
            apiMembersEvents.push(apiMember);
          } else {
            if (this._getShowPropertyDefaults()) {
              propertiesTable.addRow(
                new DocTableRow({ configuration }, [
                  this._createTitleCell(apiMember),
                  this._createModifiersCell(apiMember),
                  this._createPropertyTypeCell(apiMember),
                  this._createPropertyDefaultCell(apiMember),
                  this._createDescriptionCell(apiMember, isInherited),
                ])
              );
            } else {
              propertiesTable.addRow(
                new DocTableRow({ configuration }, [
                  this._createTitleCell(apiMember),
                  this._createModifiersCell(apiMember),
                  this._createPropertyTypeCell(apiMember),
                  this._createDescriptionCell(apiMember, isInherited),
                ])
              );
            }
            apiMembersProperties.push(apiMember);
          }

          break;
        }
      }
    }

    const useRule =
      this._documenterConfig.configFile.markdownOptions.showRules &&
      this._currentItemPath.getIsFileLevelExact();
    if (useRule) {
      output.appendNode(new DocHorizontalRule({ configuration }));
    }
    const useLineBreaks =
      this._documenterConfig.configFile.markdownOptions.showLineBreaks &&
      this._fileLevel !== FileLevel.Member;

    if (eventsTable.rows.length > 0) {
      this._appendTableHeading(output, "Events", useLineBreaks);
      output.appendNode(eventsTable);
      this._writeApiItemPages(apiMembersEvents, output, useRule, useLineBreaks);
    }

    if (propertiesTable.rows.length > 0) {
      this._appendTableHeading(output, "Properties", useLineBreaks);
      output.appendNode(propertiesTable);
      this._writeApiItemPages(
        apiMembersProperties,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (methodsTable.rows.length > 0) {
      this._appendTableHeading(output, "Methods", useLineBreaks);
      output.appendNode(methodsTable);
      this._writeApiItemPages(
        apiMembersMethods,
        output,
        useRule,
        useLineBreaks
      );
    }

    if (
      this._documenterConfig.configFile.markdownOptions.showCallSignatures &&
      callSignaturesTable.rows.length > 0
    ) {
      this._appendTableHeading(output, "Call Signatures", useLineBreaks);
      output.appendNode(callSignaturesTable);
      this._writeApiItemPages(
        apiMembersCallSignatures,
        output,
        useRule,
        useLineBreaks
      );
    }
  }

  /**
   * GENERATE PAGE: FUNCTION-LIKE
   */
  private _writeParameterTables(
    output: DocSection,
    apiParameterListMixin: ApiParameterListMixin
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const parametersTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Parameter", "Type", "Description"],
    });
    for (const apiParameter of apiParameterListMixin.parameters) {
      const parameterDescription: DocSection = new DocSection({
        configuration,
      });

      if (apiParameter.isOptional) {
        parameterDescription.appendNodesInParagraph([
          new DocEmphasisSpan({ configuration, italic: true }, [
            new DocPlainText({ configuration, text: "(Optional)" }),
          ]),
          new DocPlainText({ configuration, text: " " }),
        ]);
      }

      if (apiParameter.tsdocParamBlock) {
        this._appendAndMergeSection(
          parameterDescription,
          apiParameter.tsdocParamBlock.content
        );
      }

      parametersTable.addRow(
        new DocTableRow({ configuration }, [
          new DocTableCell({ configuration }, [
            new DocParagraph({ configuration }, [
              new DocPlainText({ configuration, text: apiParameter.name }),
            ]),
          ]),
          new DocTableCell({ configuration }, [
            this._createParagraphForTypeExcerpt(
              apiParameter.parameterTypeExcerpt
            ),
          ]),
          new DocTableCell({ configuration }, parameterDescription.nodes),
        ])
      );
    }

    if (parametersTable.rows.length > 0) {
      this._appendHeading(output, "Parameters");
      output.appendNode(parametersTable);
    }

    if (ApiReturnTypeMixin.isBaseClassOf(apiParameterListMixin)) {
      const returnTypeExcerpt: Excerpt =
        apiParameterListMixin.returnTypeExcerpt;
      output.appendNode(
        new DocParagraph({ configuration }, [
          new DocEmphasisSpan({ configuration, bold: true }, [
            new DocPlainText({ configuration, text: "Returns:" }),
          ]),
        ])
      );

      output.appendNode(this._createParagraphForTypeExcerpt(returnTypeExcerpt));

      if (apiParameterListMixin instanceof ApiDocumentedItem) {
        if (
          apiParameterListMixin.tsdocComment &&
          apiParameterListMixin.tsdocComment.returnsBlock
        ) {
          this._appendSection(
            output,
            apiParameterListMixin.tsdocComment.returnsBlock.content
          );
        }
      }
    }
  }

  private _createParagraphForTypeExcerpt(excerpt: Excerpt): DocParagraph {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const paragraph: DocParagraph = new DocParagraph({ configuration });

    if (!excerpt.text.trim()) {
      paragraph.appendNode(
        new DocPlainText({ configuration, text: "(not declared)" })
      );
    } else {
      this._appendExcerptWithHyperlinks(paragraph, excerpt);
    }

    return paragraph;
  }

  private _appendExcerptWithHyperlinks(
    docNodeContainer: DocNodeContainer,
    excerpt: Excerpt
  ): void {
    for (const token of excerpt.spannedTokens) {
      this._appendExcerptTokenWithHyperlinks(docNodeContainer, token);
    }
  }

  private _appendExcerptTokenWithHyperlinks(
    docNodeContainer: DocNodeContainer,
    token: ExcerptToken
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    // Markdown doesn't provide a standardized syntax for hyperlinks inside code spans, so we will render
    // the type expression as DocPlainText.  Instead of creating multiple DocParagraphs, we can simply
    // discard any newlines and let the renderer do normal word-wrapping.
    const unwrappedTokenText: string = token.text.replace(/[\r\n]+/g, " ");

    // If it's hyperlinkable, then append a DocLinkTag
    if (token.kind === ExcerptTokenKind.Reference && token.canonicalReference) {
      const apiItemResult: IResolveDeclarationReferenceResult =
        this._apiModel.resolveDeclarationReference(
          token.canonicalReference,
          undefined
        );

      if (apiItemResult.resolvedApiItem) {
        docNodeContainer.appendNode(
          new DocLinkTag({
            configuration,
            tagName: "@link",
            linkText: unwrappedTokenText,
            urlDestination: this._getLinkFilenameForApiItem(
              apiItemResult.resolvedApiItem
            ),
          })
        );
        return;
      }
    }

    // Otherwise append non-hyperlinked text
    docNodeContainer.appendNode(
      new DocPlainText({ configuration, text: unwrappedTokenText })
    );
  }

  private getCallSignatureIndex(apiItem: ApiCallSignature): string {
    return apiItem.overloadIndex !== undefined
      ? "" + apiItem.overloadIndex
      : "0";
  }

  private _createTitleCell(apiItem: ApiItem): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    let linkText: string =
      apiItem.kind === ApiItemKind.CallSignature
        ? "call-" + this.getCallSignatureIndex(apiItem as ApiCallSignature)
        : Utilities.getConciseSignature(apiItem);
    if (ApiOptionalMixin.isBaseClassOf(apiItem) && apiItem.isOptional) {
      linkText += "?";
    }

    return new DocTableCell({ configuration }, [
      new DocParagraph({ configuration }, [
        new DocLinkTag({
          configuration,
          tagName: "@link",
          linkText: linkText,
          urlDestination: this._getLinkFilenameForApiItem(apiItem),
        }),
      ]),
    ]);
  }

  /**
   * This generates a DocTableCell for an ApiItem including the summary section and "(BETA)" annotation.
   *
   * @remarks
   * We mostly assume that the input is an ApiDocumentedItem, but it's easier to perform this as a runtime
   * check than to have each caller perform a type cast.
   */
  private _createDescriptionCell(
    apiItem: ApiItem,
    isInherited: boolean = false
  ): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const section: DocSection = new DocSection({ configuration });

    if (ApiReleaseTagMixin.isBaseClassOf(apiItem)) {
      if (apiItem.releaseTag === ReleaseTag.Beta) {
        section.appendNodesInParagraph([
          new DocEmphasisSpan({ configuration, bold: true, italic: true }, [
            new DocPlainText({ configuration, text: "(BETA)" }),
          ]),
          new DocPlainText({ configuration, text: " " }),
        ]);
      }
    }

    if (ApiOptionalMixin.isBaseClassOf(apiItem) && apiItem.isOptional) {
      section.appendNodesInParagraph([
        new DocEmphasisSpan({ configuration, italic: true }, [
          new DocPlainText({ configuration, text: "(Optional)" }),
        ]),
        new DocPlainText({ configuration, text: " " }),
      ]);
    }

    if (apiItem instanceof ApiDocumentedItem) {
      if (apiItem.tsdocComment !== undefined) {
        this._appendAndMergeSection(
          section,
          apiItem.tsdocComment.summarySection
        );
      }
    }

    if (isInherited && apiItem.parent) {
      section.appendNode(
        new DocParagraph({ configuration }, [
          new DocPlainText({ configuration, text: "(Inherited from " }),
          new DocLinkTag({
            configuration,
            tagName: "@link",
            linkText: apiItem.parent.displayName,
            urlDestination: this._getLinkFilenameForApiItem(apiItem.parent),
          }),
          new DocPlainText({ configuration, text: ")" }),
        ])
      );
    }

    return new DocTableCell({ configuration }, section.nodes);
  }

  private _createModifiersCell(apiItem: ApiItem): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const section: DocSection = new DocSection({ configuration });

    if (ApiProtectedMixin.isBaseClassOf(apiItem)) {
      if (apiItem.isProtected) {
        section.appendNode(
          new DocParagraph({ configuration }, [
            new DocCodeSpan({ configuration, code: "protected" }),
          ])
        );
      }
    }

    if (ApiReadonlyMixin.isBaseClassOf(apiItem)) {
      if (apiItem.isReadonly) {
        section.appendNode(
          new DocParagraph({ configuration }, [
            new DocCodeSpan({ configuration, code: "readonly" }),
          ])
        );
      }
    }

    if (ApiStaticMixin.isBaseClassOf(apiItem)) {
      if (apiItem.isStatic) {
        section.appendNode(
          new DocParagraph({ configuration }, [
            new DocCodeSpan({ configuration, code: "static" }),
          ])
        );
      }
    }

    return new DocTableCell({ configuration }, section.nodes);
  }

  private _createPropertyTypeCell(apiItem: ApiItem): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const section: DocSection = new DocSection({ configuration });

    if (apiItem instanceof ApiPropertyItem) {
      section.appendNode(
        this._createParagraphForTypeExcerpt(apiItem.propertyTypeExcerpt)
      );
    }

    return new DocTableCell({ configuration }, section.nodes);
  }

  private _createPropertyDefaultCell(apiItem: ApiItem): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const section: DocSection = new DocSection({ configuration });

    if (
      apiItem instanceof ApiPropertyItem &&
      apiItem instanceof ApiDocumentedItem
    ) {
      const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

      if (tsdocComment) {
        const defaultTags = tsdocComment.customBlocks.filter(
          (b) =>
            b.blockTag.tagNameWithUpperCase ===
            StandardTags.defaultValue.tagNameWithUpperCase
        );
        if (defaultTags !== undefined && defaultTags.length === 1) {
          const defaultTag = defaultTags[0];
          section.appendNodes(defaultTag.content.nodes);
        }
      }
    }

    return new DocTableCell({ configuration }, section.nodes);
  }

  private _createInitializerCell(apiItem: ApiItem): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const section: DocSection = new DocSection({ configuration });

    if (ApiInitializerMixin.isBaseClassOf(apiItem)) {
      if (apiItem.initializerExcerpt) {
        section.appendNodeInParagraph(
          new DocCodeSpan({
            configuration,
            code: apiItem.initializerExcerpt.text,
          })
        );
      }
    }

    return new DocTableCell({ configuration }, section.nodes);
  }

  private _writeBreadcrumb(output: DocSection, apiItem: ApiItem): void {
    const {
      showBreadcrumb,
      indexBreadcrumbTitle,
      indexBreadcrumbUrl,
      useIndex,
    } = this._documenterConfig.configFile.markdownOptions;
    if (!showBreadcrumb) {
      return;
    }
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    if (useIndex) {
      const indexUrlDestination =
        indexBreadcrumbUrl !== ""
          ? indexBreadcrumbUrl
          : this._getLinkFilenameForApiItem(this._apiModel);

      output.appendNodeInParagraph(
        new DocLinkTag({
          configuration,
          tagName: "@link",
          linkText: indexBreadcrumbTitle,
          urlDestination: indexUrlDestination,
        })
      );
    }

    for (const hierarchyItem of apiItem.getHierarchy()) {
      switch (hierarchyItem.kind) {
        case ApiItemKind.Model:
        case ApiItemKind.EntryPoint:
          // We don't show the model as part of the breadcrumb because it is the root-level container.
          // We don't show the entry point because today API Extractor doesn't support multiple entry points;
          // this may change in the future.
          break;
        default:
          output.appendNodesInParagraph([
            new DocPlainText({
              configuration,
              text: " > ",
            }),
            new DocLinkTag({
              configuration,
              tagName: "@link",
              linkText: hierarchyItem.displayName,
              urlDestination: this._getLinkFilenameForApiItem(hierarchyItem),
            }),
          ]);
      }
    }
  }

  private _writeBetaWarning(output: DocSection): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    const betaWarning: string =
      "This API is provided as a preview for developers and may change" +
      " based on feedback that we receive.  Do not use this API in a production environment.";
    output.appendNode(
      new DocNoteBox({ configuration }, [
        new DocParagraph({ configuration }, [
          new DocPlainText({ configuration, text: betaWarning }),
        ]),
      ])
    );
  }

  private _appendSection(output: DocSection, docSection: DocSection): void {
    for (const node of docSection.nodes) {
      output.appendNode(node);
    }
  }

  private _appendAndMergeSection(
    output: DocSection,
    docSection: DocSection
  ): void {
    let firstNode: boolean = true;
    for (const node of docSection.nodes) {
      if (firstNode) {
        if (node.kind === DocNodeKind.Paragraph) {
          output.appendNodesInParagraph(node.getChildNodes());
          firstNode = false;
          continue;
        }
      }
      firstNode = false;

      output.appendNode(node);
    }
  }

  private _getMembersAndWriteIncompleteWarning(
    apiClassOrInterface: ApiClass | ApiInterface,
    output: DocSection
  ): readonly ApiItem[] {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    if (!this._documenterConfig.configFile.showInheritedMembers) {
      return apiClassOrInterface.members;
    }

    const result: IFindApiItemsResult =
      apiClassOrInterface.findMembersWithInheritance();

    // If the result is potentially incomplete, write a short warning communicating this.
    if (result.maybeIncompleteResult) {
      output.appendNode(
        new DocParagraph({ configuration }, [
          new DocEmphasisSpan({ configuration, italic: true }, [
            new DocPlainText({
              configuration,
              text: "(Some inherited members may not be shown because they are not represented in the documentation.)",
            }),
          ]),
        ])
      );
    }

    // Log the messages for diagnostic purposes.
    // for (const message of result.messages) {
    //   console.log(
    //     `Diagnostic message for findMembersWithInheritance: ${message.text}`
    //   );
    // }

    return result.items;
  }

  private _getLinkFilenameForApiItem(apiItem: ApiItem): string {
    return this._currentItemPath.getRelativeLink(apiItem);
  }

  private _deleteOldOutputFiles(): void {
    // console.log("Deleting old output from " + this._outputFolder);
    FileSystem.ensureEmptyFolder(this._outputFolder);
  }
}
