// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from "path";
import {
  PackageName,
  FileSystem,
  NewlineKind,
} from "@rushstack/node-core-library";
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
  DocHtmlStartTag,
  DocHtmlEndTag,
  DocHtmlAttribute,
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
} from "@microsoft/api-extractor-model";

import { CustomDocNodes } from "../nodes/CustomDocNodeKind";
import { DocHeading } from "../nodes/DocHeading";
import { DocHorizontalRule } from "../nodes/DocHorizontalRule";
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
import { IMarkdownDocumenterOptions } from "./MarkdownDocumenter";
import { MarkdownDocumenterAccessor } from "../plugin/MarkdownDocumenterAccessor";
import { FileLevel } from "./FileLevel";
// import { IConfigFileMarkdown } from "./IConfigFile";

// todo - need to make ItemPaths (terrible name btw) handle the type suffix for last path (this.apiItem.kind)

export namespace KindInfo {
  const { Model, Package, Namespace } = ApiItemKind;
  const { Class, Enum, Function, Interface, TypeAlias, Variable } = ApiItemKind;
  const { ConstructSignature, Constructor, EnumMember } = ApiItemKind;
  const { Method, MethodSignature } = ApiItemKind;
  const { Property, PropertySignature } = ApiItemKind;
  const { EntryPoint, CallSignature, IndexSignature, None } = ApiItemKind;

  interface KindInfo {
    kind: ApiItemKind;
    labelTitle: string;
    labelTable: string;
    memberKinds: ApiItemKind[];
  }

  function createKindInfoMap(): Map<ApiItemKind, KindInfo> {
    const kindChildKindsMap: Map<ApiItemKind, ApiItemKind[]> = new Map();

    const setChildKinds = (kind: ApiItemKind, childKinds: ApiItemKind[]) => {
      kindChildKindsMap.set(kind, childKinds);
    };

    const getPackageMembers = (pkg: ApiPackage) => pkg.entryPoints[0].members;
    const getOtherMembers = (item: ApiItem) => item.members;

    const modelMemberKinds = [Package];

    const packageOrNamespaceMemberKinds = [
      Class,
      Enum,
      Interface,
      Namespace,
      Function,
      TypeAlias,
      Variable,
    ];

    const classMemberKinds = [Constructor];

    const enumMemberKinds = [EnumMember];

    const interfaceMemberKinds = [Constructor];

    setChildKinds(Model, modelMemberKinds);
    setChildKinds(Package, packageOrNamespaceMemberKinds);
    setChildKinds(Namespace, packageOrNamespaceMemberKinds);
    setChildKinds(Class, classMemberKinds);
    setChildKinds(Enum, enumMemberKinds);
    setChildKinds(Interface, interfaceMemberKinds);

    const kindInfoMap: Map<ApiItemKind, KindInfo> = new Map();

    const getMembersByKind = (apiItem: ApiItem) => {};

    const addInfo = (
      kind: ApiItemKind,
      labelTitle: string,
      labelTable: string,
      memberKinds: ApiItemKind[] = []
    ) => {
      kindInfoMap.set(kind, { kind, labelTitle, labelTable, memberKinds });
    };
    addInfo(ApiItemKind.CallSignature, "", "");
    addInfo(ApiItemKind.Class, "class", "classes");
    addInfo(ApiItemKind.Constructor, "constructor", "constructors");
    addInfo(ApiItemKind.ConstructSignature, "constructor", "constructors");
    addInfo(ApiItemKind.EntryPoint, "", "");
    addInfo(ApiItemKind.Enum, "enum", "enums");
    addInfo(ApiItemKind.EnumMember, "member", "members");
    addInfo(ApiItemKind.Function, "function", "functions");
    addInfo(ApiItemKind.IndexSignature, "", "");
    addInfo(ApiItemKind.Interface, "interface", "interfaces");
    addInfo(ApiItemKind.Method, "method", "methods");
    addInfo(ApiItemKind.MethodSignature, "method", "methods");
    addInfo(ApiItemKind.Model, "", "");
    addInfo(ApiItemKind.Namespace, "namespace", "namespaces");
    addInfo(ApiItemKind.Package, "package", "packages");
    addInfo(ApiItemKind.Property, "property", "properties");
    addInfo(ApiItemKind.PropertySignature, "property", "properties");
    addInfo(ApiItemKind.TypeAlias, "type", "types");
    addInfo(ApiItemKind.Variable, "variable", "variables");
    addInfo(ApiItemKind.None, "", "");
    return kindInfoMap;
  }

  const kindInfoMap = createKindInfoMap();
  const createEmptyInfoMap = () => ({
    kind: ApiItemKind.None,
    memberKinds: [],
    labelTitle: "",
    labelTable: "",
  });

  export function getKindInfo(apiItem: ApiItem): KindInfo {
    const kindInfo = kindInfoMap.get(apiItem.kind);
    return kindInfo ? kindInfo : createEmptyInfoMap();
  }
}

export namespace IsKind {
  export namespace Api {
    const { Model, Package, Namespace } = ApiItemKind;
    const { Class, Enum, Function, Interface, TypeAlias, Variable } =
      ApiItemKind;
    const { ConstructSignature, Constructor, EnumMember } = ApiItemKind;
    const { Method, MethodSignature } = ApiItemKind;
    const { Property, PropertySignature } = ApiItemKind;
    const { EntryPoint, CallSignature, IndexSignature, None } = ApiItemKind;

    export const modelKinds = [Model];
    export const packageKinds = [Package];
    export const namespaceKinds = [Namespace];
    export const exportKinds = [
      Class,
      Enum,
      Function,
      Interface,
      TypeAlias,
      Variable,
    ];
    export const memberKinds = [
      ConstructSignature,
      Constructor,
      EnumMember,
      Method,
      MethodSignature,
      Property,
      PropertySignature,
    ];
    export const ignoredKinds = [CallSignature, IndexSignature, None];
    export const skippedKinds = [EntryPoint];
  }

  function arrayToMap(kinds: ApiItemKind[]): Map<ApiItemKind, boolean> {
    const kindMap: Map<ApiItemKind, boolean> = new Map();
    for (const kind of kinds) {
      kindMap.set(kind, true);
    }
    return kindMap;
  }

  function createFileLevelKindMap(
    exact: boolean = false
  ): Map<FileLevel, Map<ApiItemKind, boolean>> {
    const kindsForFileLevelMap: Map<
      FileLevel,
      Map<ApiItemKind, boolean>
    > = new Map();
    let kindsCollected: ApiItemKind[] = [];

    const addToMap = (fileLevel: FileLevel, kinds: ApiItemKind[]) => {
      kindsCollected = exact ? kinds : kindsCollected.concat(kinds);
      kindsForFileLevelMap.set(fileLevel, arrayToMap(kindsCollected));
    };

    addToMap(FileLevel.Model, Api.modelKinds);
    addToMap(FileLevel.Package, Api.packageKinds);
    addToMap(FileLevel.Namespace, Api.namespaceKinds);
    addToMap(FileLevel.Export, Api.exportKinds);
    addToMap(FileLevel.Member, Api.memberKinds);
    return kindsForFileLevelMap;
  }

  const fileLevelKindMap: Map<
    FileLevel,
    Map<ApiItemKind, boolean>
  > = createFileLevelKindMap();

  const fileLevelKindExactMap: Map<
    FileLevel,
    Map<ApiItemKind, boolean>
  > = createFileLevelKindMap(true);

  const skippedKindMap = arrayToMap(Api.skippedKinds);
  const ignoredKindMap = arrayToMap(Api.ignoredKinds);

  export function isFileLevelKind(
    fileLevel: FileLevel,
    apiItem: ApiItem
  ): boolean {
    return fileLevelKindMap.get(fileLevel)?.get(apiItem.kind) === true;
  }

  export function isFileLevelKindExact(
    fileLevel: FileLevel,
    apiItem: ApiItem
  ): boolean {
    return fileLevelKindExactMap.get(fileLevel)?.get(apiItem.kind) === true;
  }

  export function isIncludedKind(apiItem: ApiItem): boolean {
    return fileLevelKindMap.get(FileLevel.Member)?.get(apiItem.kind) === true;
  }

  export function isSkippedKind(apiItem: ApiItem): boolean {
    return skippedKindMap.get(apiItem.kind) === true;
  }

  export function isIgnoredKind(apiItem: ApiItem): boolean {
    return ignoredKindMap.get(apiItem.kind) === true;
  }
}

export namespace HtmlEntity {
  // TODO move up top
  export function toHtmlEntityChar(char: string, isUrl: boolean): string {
    if (char && char.length) {
      const code = char.charCodeAt(0).toString(16).toLowerCase();
      return isUrl ? "x" + code : "&#x" + code + ";";
    }
    return char;
  }

  export function toHtmlEntity(
    text: string,
    isUrl: boolean,
    charCount: number = 1
  ): string {
    const numChars = text && text.length ? Math.min(text.length, charCount) : 0;
    let resultText = text;
    if (numChars > 0) {
      resultText = "";
      for (let i = 0; i < numChars; i++) {
        resultText += toHtmlEntityChar(text[i], isUrl);
      }
      if (numChars !== text.length) {
        resultText += text.slice(numChars);
      }
    }
    return isUrl ? resultText.toLowerCase() : resultText;
  }
}

interface IApiItemPathsOptions {
  fileLevel: FileLevel;
  apiItem: ApiItem;
}

// TODO - investigate Map<Key,Value> Key ordering when using Map.set(k, v)

class ApiItemPaths implements IApiItemPathsOptions {
  private readonly _fileLevel: FileLevel;
  private readonly _apiItem: ApiItem;
  private readonly _filePaths: string[];
  private readonly _anchorPaths: string[];
  private readonly _fileApiItems: ApiItem[];
  private readonly _anchorApiItems: ApiItem[];

  static headerJoiner: string = "&#x002e;";
  static anchorJoiner: string = "x002e";
  static fileJoiner: string = ".";
  static headerTypePrefix: string = " ";
  static anchorTypePrefix: string = "-";

  static getPathForItem(apiItem: ApiItem): string {
    const { kind, displayName } = apiItem;
    if (kind === ApiItemKind.Package) {
      return PackageName.getUnscopedName(displayName);
    }
    if (
      ApiParameterListMixin.isBaseClassOf(apiItem) &&
      apiItem.overloadIndex > 1
    ) {
      return displayName + "_" + (apiItem.overloadIndex - 1);
    }
    return displayName;
  }

  public constructor(options: IApiItemPathsOptions) {
    const fileLevel = (this._fileLevel = options.fileLevel);
    const apiItem = (this._apiItem = options.apiItem);
    const filePaths: string[] = (this._filePaths = []);
    const anchorPaths: string[] = (this._anchorPaths = []);
    const fileApiItems: ApiItem[] = (this._fileApiItems = []);
    const anchorApiItems: ApiItem[] = (this._anchorApiItems = []);
    for (const hierarchyItem of apiItem.getHierarchy()) {
      if (
        hierarchyItem.kind !== ApiItemKind.Model &&
        IsKind.isIncludedKind(hierarchyItem) &&
        !IsKind.isSkippedKind(hierarchyItem) &&
        !IsKind.isIgnoredKind(hierarchyItem)
      ) {
        const path = ApiItemPaths.getPathForItem(hierarchyItem);
        const isFileLevel = IsKind.isFileLevelKind(fileLevel, hierarchyItem);
        const targetPaths = isFileLevel ? filePaths : anchorPaths;
        const targetItems = isFileLevel ? fileApiItems : anchorApiItems;
        targetPaths.push(
          isFileLevel ? Utilities.getSafeFilenameForName(path) : path
        );
        targetItems.push(hierarchyItem);
      }
    }
  }

  public get fileLevel() {
    return this._fileLevel;
  }

  public get apiItem() {
    return this._apiItem;
  }

  public get filePaths() {
    return this._filePaths;
  }

  public get anchorPaths() {
    return this._anchorPaths;
  }

  public get fileApiItems() {
    return this._fileApiItems;
  }

  public get lastFileItem(): ApiItem {
    return this._fileApiItems[this._fileApiItems.length - 1];
  }

  public get anchorApiItems() {
    return this._anchorApiItems;
  }

  getHasAnchor(): boolean {
    return this.anchorPaths.length > 0;
  }

  getIsFileLevel(): boolean {
    return IsKind.isFileLevelKind(this.fileLevel, this.apiItem);
  }

  getIsFileLevelExact(): boolean {
    return (
      this.apiItem.parent !== undefined &&
      IsKind.isFileLevelKindExact(this.fileLevel, this.apiItem.parent)
    );
  }

  /*
   * weirdly the level mappings are: 1 => ##, 2 => ###, 3 => ###, 4 => ####, 5 => ####
   */
  getHeaderLevel(): number {
    const { length } = this.anchorPaths;
    return length === 0 ? 1 : length === 1 ? 3 : 5;
  }

  // TODO - add support for headerIndent, defaults to "", could be "-" or "&nbsp;" etc

  getHeaderLevelChild(): number {
    return this.anchorPaths.length === 0 ? 3 : 5;
  }

  getAnchorSuffixOld(prefix: string): string {
    const { labelTitle } = KindInfo.getKindInfo(this.apiItem);
    return labelTitle ? prefix + labelTitle : "";
  }

  getAnchorSuffix(isUrl: boolean): string {
    const { labelTitle } = KindInfo.getKindInfo(this.apiItem);
    const prefix = isUrl
      ? ApiItemPaths.anchorTypePrefix
      : ApiItemPaths.headerTypePrefix;
    return labelTitle ? prefix + labelTitle : "";
  }

  private getJoinedAnchorPaths(isUrl: boolean): string {
    const joiner = isUrl
      ? ApiItemPaths.anchorJoiner
      : ApiItemPaths.headerJoiner;
    const mapper = (ap: string) => HtmlEntity.toHtmlEntity(ap, isUrl);
    return this.anchorPaths.map(mapper).join(joiner);
  }

  getHeaderText(): string {
    const headerText: string =
      this.anchorPaths.length > 0
        ? this.getJoinedAnchorPaths(false)
        : ApiItemPaths.getPathForItem(this.apiItem);
    return headerText + this.getAnchorSuffix(false);
  }

  getFilePath(): string {
    return this.filePaths.join(ApiItemPaths.fileJoiner) + ".md";
  }

  getAnchorPath(): string {
    const anchorPath: string = this.getJoinedAnchorPaths(true);
    return anchorPath + this.getAnchorSuffix(true);
  }

  getExternalLink(): string {
    return (
      "./" +
      this.getFilePath() +
      (this.getHasAnchor() ? "#" + this.getAnchorPath() : "")
    );
  }

  getRelativeLink(apiItem: ApiItem): string {
    const itemPaths = new ApiItemPaths({
      fileLevel: this.fileLevel,
      apiItem,
    });
    const sameFile = this.lastFileItem === itemPaths.lastFileItem;
    return sameFile
      ? itemPaths.getHasAnchor()
        ? "#" + itemPaths.getAnchorPath()
        : "./"
      : itemPaths.getExternalLink();
  }
}

function getApiItemPaths(fileLevel: FileLevel, apiItem: ApiItem): ApiItemPaths {
  return new ApiItemPaths({
    fileLevel,
    apiItem,
  });
}

/**
 * Renders API documentation in the Markdown file format.
 * For more info:  https://en.wikipedia.org/wiki/Markdown
 */
export class MDDocumenter {
  private readonly _apiModel: ApiModel;
  private readonly _documenterConfig: DocumenterConfig | undefined;
  private readonly _tsdocConfiguration: TSDocConfiguration;
  private readonly _markdownEmitter: CustomMarkdownEmitter;
  private readonly _outputFolder: string;
  private readonly _fileLevel: FileLevel;
  private readonly _pluginLoader: PluginLoader;
  private _fileItemPaths: ApiItemPaths;

  // TODO - pass fileLevel et al via options
  public constructor(
    options: IMarkdownDocumenterOptions,
    fileLevel: FileLevel
  ) {
    this._apiModel = options.apiModel;
    this._documenterConfig = options.documenterConfig;
    this._outputFolder = options.outputFolder;
    this._fileLevel = fileLevel;
    this._tsdocConfiguration = CustomDocNodes.configuration;
    this._markdownEmitter = new CustomMarkdownEmitter(this._apiModel);

    this._pluginLoader = new PluginLoader();

    // only needed so the typescript compiler knows it's never null/undefined
    this._fileItemPaths = new ApiItemPaths({
      apiItem: this._apiModel,
      fileLevel: this._fileLevel,
    });
  }

  get fileLevel() {
    return this._fileLevel;
  }

  public generateFiles(): void {
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

    const visitMembers = (item: ApiItem): void => {
      const { kind, members } = item;
      if (members && members.length > 0) {
        const childMembers =
          kind === ApiItemKind.Package
            ? members.flatMap((m) => m.members)
            : members;
        if (
          item.kind !== ApiItemKind.Model &&
          item.kind !== ApiItemKind.Package
        ) {
          const nameMap: Map<string, ApiItem[]> = new Map();
          for (const member of childMembers) {
            const name = member.displayName.toLowerCase();
            const existingItems = nameMap.get(name);
            const newItems =
              existingItems !== undefined
                ? existingItems.concat(member)
                : [member];
            nameMap.set(name, newItems);
          }
          for (const member of childMembers) {
            const name = member.displayName.toLowerCase();
            const existingItems = nameMap.get(name);
            if (existingItems !== undefined && existingItems.length > 1) {
            }
          }
        }
        console.log("visiting: " + kind + " " + item.displayName);
        for (const member of childMembers) {
          visitMembers(member);
        }
      }
    };
    visitMembers(this._apiModel);

    console.log();
    this._deleteOldOutputFiles();

    this._writeApiItemPage(this._apiModel, null);

    if (this._pluginLoader.markdownDocumenterFeature) {
      this._pluginLoader.markdownDocumenterFeature.onFinished({});
    }
  }

  /*
   * weirdly the level mappings are: 1 => ##, 2 => ###, 3 => ###, 4 => ####, 5 => ####
   */
  private _appendHeadingInternal(
    output: DocSection,
    apiItem: ApiItem,
    title: string,
    isChild: boolean
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    const itemPaths = this._fileItemPaths;
    const level = isChild
      ? itemPaths.getHeaderLevelChild()
      : itemPaths.getHeaderLevel();
    output.appendNode(new DocHeading({ configuration, title, level }));
    // this._appendAnchor(output, title);
    // this._appendAnchor(output, "abcdef");
  }

  private _appendHeading(
    output: DocSection,
    apiItem: ApiItem,
    title: string
  ): void {
    this._appendHeadingInternal(output, apiItem, title, false);
  }

  private _appendHeadingChild(
    output: DocSection,
    apiItem: ApiItem,
    title: string
  ): void {
    this._appendHeadingInternal(output, apiItem, title, true);
  }

  private _appendHeadingBold(output: DocSection, text: string): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    output.appendNode(
      new DocParagraph({ configuration }, [
        new DocEmphasisSpan({ configuration, bold: true }, [
          new DocPlainText({ configuration, text }),
        ]),
      ])
    );
  }

  private _appendHorizontalRule(output: DocSection): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    output.appendNode(new DocHorizontalRule({ configuration }));
  }

  // private _appendAnchor(output: DocSection, name: string): void {
  //   const configuration: TSDocConfiguration = this._tsdocConfiguration;
  //   output.appendNodes([
  //     new DocHtmlStartTag({
  //       configuration,
  //       name: "a",
  //       htmlAttributes: [
  //         new DocHtmlAttribute({
  //           configuration,
  //           name: "name",
  //           value: name,
  //         }),
  //       ],
  //     }),
  //     new DocHtmlEndTag({ configuration, name: "a" }),
  //   ]);
  // }

  private _writeApiItemPages(
    parentItem: ApiItem,
    apiItems: ApiItem[],
    parentOutput: DocSection | null
  ): void {
    const itemPaths = this._fileItemPaths;

    if (itemPaths.getIsFileLevel()) {
      if (apiItems.length > 0) {
        let first = true;
        if (itemPaths.getIsFileLevelExact()) {
          this._appendHorizontalRule(parentOutput as DocSection);
        }
        for (const apiItem of apiItems) {
          if (first) {
            first = false;
          } else if (parentOutput) {
            this._appendHorizontalRule(parentOutput);
          }
          this._writeApiItemPage(apiItem, parentOutput);
        }
        if (itemPaths.getIsFileLevelExact()) {
          this._appendHorizontalRule(parentOutput as DocSection);
        }
      }
    } else {
      for (const apiItem of apiItems) {
        this._writeApiItemPage(apiItem, parentOutput);
      }
    }
  }

  private _getHeadingTitle(apiItem: ApiItem) {
    if (apiItem === this._apiModel) {
      return "API Documentation"; // TODO - make this configurable
    } else {
      return this._fileItemPaths.getHeaderText();
    }
  }

  private _getItemPaths(apiItem: ApiItem): ApiItemPaths {
    return getApiItemPaths(this.fileLevel, apiItem);
  }

  private _writeApiItemPage(
    apiItem: ApiItem,
    parentOutput: DocSection | null
  ): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;
    const output: DocSection = new DocSection({ configuration });
    const savedFileItemPaths = this._fileItemPaths;
    const itemPaths = (this._fileItemPaths = this._getItemPaths(apiItem));

    // ORDER - breadcrumb
    if (itemPaths.getIsFileLevel()) {
      this._writeBreadcrumb(output);
    }

    // ORDER - main heading
    this._appendHeading(output, apiItem, this._getHeadingTitle(apiItem));

    // ORDER - beta warning
    if (ApiReleaseTagMixin.isBaseClassOf(apiItem)) {
      if (apiItem.releaseTag === ReleaseTag.Beta) {
        this._writeBetaWarning(output);
      }
    }

    // ORDER - populate decoratorBlocks from apiItem.tsdocComment
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

    // ORDER - signature section
    if (apiItem instanceof ApiDeclaredItem) {
      if (apiItem.excerpt.text.length > 0) {
        output.appendNode(
          new DocParagraph({ configuration }, [
            new DocEmphasisSpan({ configuration, bold: true }, [
              new DocPlainText({ configuration, text: "Signature:" }),
            ]),
          ])
        );
        output.appendNode(
          new DocFencedCode({
            configuration,
            code: apiItem.getExcerptWithModifiers(),
            language: "typescript",
          })
        );
      }
    }

    // ORDER - appendRemarks related code
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
    if (appendRemarks) {
      this._writeRemarksSection(output, apiItem);
    }

    // ORDER - this is where class/enum/interface tables are added
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

    // ORDER - heritage types
    if (apiItem instanceof ApiDeclaredItem) {
      this._writeHeritageTypes(output, apiItem);
    }

    // ORDER - render decorator blocks
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

    // ORDER - write file to disk or parent output
    if (itemPaths.getIsFileLevel()) {
      // TODO - make this configurable
      const filename =
        this._fileLevel === FileLevel.Model || apiItem === this._apiModel
          ? "index.md"
          : itemPaths.getFilePath();
      const pageFilename: string = path.join(this._outputFolder, filename);
      const stringBuilder: StringBuilder = new StringBuilder();
      stringBuilder.append(
        "<!-- Do not edit this file. It is automatically generated by API Documenter. -->\n\n"
      );

      this._markdownEmitter.emit(stringBuilder, output, {
        contextApiItem: apiItem,
        // this filename is actually used for building links, so the Filename part should be renamed...
        onGetFilenameForApiItem: (apiItemForFilename: ApiItem) => {
          // return filename;
          return itemPaths.getRelativeLink(apiItemForFilename);
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

      FileSystem.writeFile(pageFilename, pageContent, {
        convertLineEndings: this._documenterConfig
          ? this._documenterConfig.newlineKind
          : NewlineKind.CrLf,
      });
    } else if (parentOutput) {
      parentOutput.appendNodes(output.nodes);
    }
    this._fileItemPaths = savedFileItemPaths;
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

  private _writeRemarksSection(output: DocSection, apiItem: ApiItem): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    if (apiItem instanceof ApiDocumentedItem) {
      const tsdocComment: DocComment | undefined = apiItem.tsdocComment;

      if (tsdocComment) {
        // Write the @remarks block
        if (tsdocComment.remarksBlock) {
          this._appendHeadingBold(output, "Remarks:");
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

          this._appendHeadingBold(output, heading);

          this._appendSection(output, exampleBlock.content);

          ++exampleNumber;
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
          const heading: string = "Exceptions:";
          this._appendHeadingBold(output, heading);

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

    if (packagesTable.rows.length > 0) {
      this._appendHeadingChild(output, apiModel, "Packages");
      output.appendNode(packagesTable);
    }

    this._writeApiItemPages(apiModel, apiMembersPackages, output);
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
          interfacesTable.addRow(row);
          apiMembersInterfaces.push(apiMember);
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

    this._appendHorizontalRule(output);

    if (classesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Classes");
      output.appendNode(classesTable);
    }

    if (enumerationsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Enumerations");
      output.appendNode(enumerationsTable);
    }
    if (functionsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Functions");
      output.appendNode(functionsTable);
    }

    if (interfacesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Interfaces");
      output.appendNode(interfacesTable);
    }

    if (namespacesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Namespaces");
      output.appendNode(namespacesTable);
    }

    if (variablesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Variables");
      output.appendNode(variablesTable);
    }

    if (typeAliasesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Type Aliases");
      output.appendNode(typeAliasesTable);
    }

    this._writeApiItemPages(
      apiContainer,
      Array.prototype.concat.apply(
        [],
        [
          apiMembersClasses,
          apiMembersEnums,
          apiMembersInterfaces,
          apiMembersNamespaces,
          apiMembersFunctions,
          apiMembersTypeAliases,
          apiMembersVariables,
        ]
      ),
      output
    );
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
      headerTitles: ["Property", "Modifiers", "Type", "Description"],
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
            propertiesTable.addRow(
              new DocTableRow({ configuration }, [
                this._createTitleCell(apiMember),
                this._createModifiersCell(apiMember),
                this._createPropertyTypeCell(apiMember),
                this._createDescriptionCell(apiMember, isInherited),
              ])
            );
            apiMembersProperties.push(apiMember);
          }
          break;
        }
      }
    }

    if (eventsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Events:");
      output.appendNode(eventsTable);
    }

    if (constructorsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Constructors:");
      output.appendNode(constructorsTable);
    }

    if (propertiesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Properties:");
      output.appendNode(propertiesTable);
    }

    if (methodsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Methods:");
      output.appendNode(methodsTable);
    }

    this._writeApiItemPages(
      apiClass,
      Array.prototype.concat.apply(
        [],
        [
          apiMembersEvents,
          apiMembersConstructors,
          apiMembersProperties,
          apiMembersMethods,
        ]
      ),
      output
    );
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
      this._appendHeadingBold(output, "Enumeration Members:");
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

    const eventsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Property", "Modifiers", "Type", "Description"],
    });

    const propertiesTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Property", "Modifiers", "Type", "Description"],
    });

    const methodsTable: DocTable = new DocTable({
      configuration,
      headerTitles: ["Method", "Description"],
    });

    const apiMembers: readonly ApiItem[] =
      this._getMembersAndWriteIncompleteWarning(apiInterface, output);
    const apiMembersMethods: ApiItem[] = [];
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
            propertiesTable.addRow(
              new DocTableRow({ configuration }, [
                this._createTitleCell(apiMember),
                this._createModifiersCell(apiMember),
                this._createPropertyTypeCell(apiMember),
                this._createDescriptionCell(apiMember, isInherited),
              ])
            );
            apiMembersProperties.push(apiMember);
          }

          break;
        }
      }
    }

    if (eventsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Events:");
      output.appendNode(eventsTable);
    }

    if (propertiesTable.rows.length > 0) {
      this._appendHeadingBold(output, "Properties:");
      output.appendNode(propertiesTable);
    }

    if (methodsTable.rows.length > 0) {
      this._appendHeadingBold(output, "Methods:");
      output.appendNode(methodsTable);
    }

    this._writeApiItemPages(
      apiInterface,
      Array.prototype.concat.apply(
        [],
        [apiMembersEvents, apiMembersProperties, apiMembersMethods]
      ),
      output
    );
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
      this._appendHeadingBold(output, "Parameters");
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

  private _createTitleCell(apiItem: ApiItem): DocTableCell {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    let linkText: string = Utilities.getConciseSignature(apiItem);
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

  private _writeBreadcrumb(output: DocSection): void {
    const configuration: TSDocConfiguration = this._tsdocConfiguration;

    const itemPaths = this._fileItemPaths;

    const isFileLevelModel = this._fileLevel === FileLevel.Model;
    if (isFileLevelModel) {
      return;
    }
    const isModel = itemPaths.apiItem.kind === ApiItemKind.Model;
    // TODO - make these configurable
    // TODO - breadccrumb makes no sense in FileLevel.Model
    output.appendNodeInParagraph(
      new DocLinkTag({
        configuration,
        tagName: "@link",
        linkText: "Home",
        // urlDestination: itemPaths.getRelativeLink(this._apiModel), // TODO - make sure model links work!!!
        urlDestination: isModel ? "./" : "./index.md",
      })
    );
    for (const apiItem of itemPaths.fileApiItems) {
      output.appendNodesInParagraph([
        new DocPlainText({
          configuration,
          text: " > ",
        }),
        new DocLinkTag({
          configuration,
          tagName: "@link",
          linkText: apiItem.displayName,
          urlDestination: itemPaths.getRelativeLink(apiItem),
        }),
      ]);
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
    const showInheritedMembers: boolean =
      !!this._documenterConfig?.configFile.showInheritedMembers;
    if (!showInheritedMembers) {
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
    for (const message of result.messages) {
      console.log(
        `Diagnostic message for findMembersWithInheritance: ${message.text}`
      );
    }

    return result.items;
  }

  private _getLinkFilenameForApiItem(apiItem: ApiItem): string {
    return this._fileItemPaths.getRelativeLink(apiItem);
  }

  private _deleteOldOutputFiles(): void {
    console.log("Deleting old output from " + this._outputFolder);
    FileSystem.ensureEmptyFolder(this._outputFolder);
  }
}
