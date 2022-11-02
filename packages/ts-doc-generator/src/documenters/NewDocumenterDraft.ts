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

/*
export enum ApiItemKind {
  CallSignature = 'CallSignature', 
  Class = 'Class',
  Constructor = 'Constructor',
  ConstructSignature = 'ConstructSignature',
  EntryPoint = 'EntryPoint',
  Enum = 'Enum',
  EnumMember = 'EnumMember',
  Function = 'Function',
  IndexSignature = 'IndexSignature',
  Interface = 'Interface',
  Method = 'Method',
  MethodSignature = 'MethodSignature',
  Model = 'Model',
  Namespace = 'Namespace',
  Package = 'Package',
  Property = 'Property',
  PropertySignature = 'PropertySignature',
  TypeAlias = 'TypeAlias',
  Variable = 'Variable',
  None = 'None'
}
*/

// model - write package
// package/namespace - write class, enum, interface, namespace, function, typealias, variable
// class - write constructor, method, property (* event variant)
// interface - write constructsignature, methodsignature, propertysignature (* event variant)

// header
// class, enum, interface, contructor, constructsignature, method, methodsignature, function, model,
// namespace, package, property

interface KindInfo {
  tableText: string;
  headerText: string;
  getFilePathName: (apiItem: ApiItem) => string;
  getAnchorPathName: (apiItem: ApiItem) => string;
}

const buildKindToLabelMap: () => Map<ApiItemKind, KindInfo> = () => {
  const map: Map<ApiItemKind, KindInfo> = new Map();

  const getParentheses = (apiItem: ApiItem): string =>
    ApiParameterListMixin.isBaseClassOf(apiItem) ? "()" : "";

  const withParentheses =
    (getter: (apiItem: ApiItem) => string): ((apiItem: ApiItem) => string) =>
    (apiItem: ApiItem): string => {
      return getter(apiItem) + getParentheses(apiItem);
    };

  const getDisplayName = (apiItem: ApiItem): string => apiItem.displayName;
  const getPackageName = (apiItem: ApiItem): string =>
    PackageName.getUnscopedName(apiItem.displayName);

  const {
    Model,
    Package,
    Namespace,
    Class,
    Enum,
    EnumMember,
    Interface,
    Method,
  } = ApiItemKind;
  map.set(Model, {
    headerText: "model",
    tableText: "models",
    getFilePathName: () => "index",
    getAnchorPathName: () => "index",
  });
  map.set(Package, {
    headerText: "package",
    tableText: "packages",
    getFilePathName: getPackageName,
    getAnchorPathName: getPackageName,
  });
  map.set(Namespace, {
    headerText: "namespace",
    tableText: "namespaces",
    getFilePathName: getDisplayName,
    getAnchorPathName: getDisplayName,
  });
  map.set(Class, {
    headerText: "class",
    tableText: "classes",
    getFilePathName: (apiItem: ApiItem) => "",
    getAnchorPathName: (apiItem: ApiItem) => "",
  });
  map.set(Enum, {
    headerText: "enum",
    tableText: "enums",
    getFilePathName: (apiItem: ApiItem) => "",
    getAnchorPathName: (apiItem: ApiItem) => "",
  });
  map.set(EnumMember, {
    headerText: "enum member ",
    tableText: "enum members",
    getFilePathName: (apiItem: ApiItem) => "",
    getAnchorPathName: (apiItem: ApiItem) => "",
  });
  map.set(Interface, {
    headerText: "interface",
    tableText: "interfaces",
    getFilePathName: (apiItem: ApiItem) => "",
    getAnchorPathName: (apiItem: ApiItem) => "",
  });
  map.set(Method, {
    headerText: "method",
    tableText: "methods",
    getFilePathName: withParentheses((apiItem: ApiItem) => apiItem.displayName),
    getAnchorPathName: (apiItem: ApiItem) => apiItem.displayName,
  });
  return map;
};

const kindToLabelMap: Map<ApiItemKind, KindInfo> = buildKindToLabelMap();

export namespace IsItem {
  export const isModelItem = (item: ApiItem): boolean =>
    item.kind === ApiItemKind.Model;
  export const isPackageItem = (item: ApiItem): boolean =>
    item.kind === ApiItemKind.Package;
  export const isEntryItem = (item: ApiItem): boolean =>
    item.kind === ApiItemKind.EntryPoint;
  export const isNamespaceItem = (item: ApiItem): boolean =>
    item.kind === ApiItemKind.Namespace;
  export const isExportItem = (item: ApiItem): boolean => {
    const { parent } = item;
    if (parent) {
      return (
        parent.kind === ApiItemKind.Namespace ||
        parent.kind === ApiItemKind.Package
      );
    }
    return false;
  };
  export const isMemberItem = (item: ApiItem): boolean => {
    const { parent } = item;
    if (parent) {
      return isExportItem(parent);
    }
    return false;
  };
  export const isTabledItem = (item: ApiItem): boolean =>
    isModelItem(item) ||
    isPackageItem(item) ||
    isNamespaceItem(item) ||
    isExportItem(item);
  export const isSkippedItem = (item: ApiItem): boolean =>
    isModelItem(item) || isEntryItem(item);
}

export type FileLevel =
  | "model"
  | "package"
  | "namespace"
  | "export"
  | "member"
  | "all";

export class ItemHierarchy {
  private readonly _apiItem: ApiItem;
  private readonly _fileLevel: FileLevel;
  private readonly _filePaths: string[] = [];
  private readonly _anchorPaths: string[] = [];
  private readonly _fileItems: ApiItem[] = [];
  private readonly _anchorItems: ApiItem[] = [];

  static FILE_SEPARATOR = ".";
  static HEADER_SEPARATOR = ".";
  static LINK_SEPARATOR = "";
  static METHOD_SUFFIX = "()";
  static FILE_EXTENSION = ".md";

  constructor(apiItem: ApiItem, fileLevel: FileLevel) {
    this._apiItem = apiItem;
    this._fileLevel = fileLevel;
    const filePaths: string[] = (this._filePaths = []);
    const anchorPaths: string[] = (this._anchorPaths = []);
    const fileItems: ApiItem[] = (this._fileItems = []);
    const anchorItems: ApiItem[] = (this._anchorItems = []);
    for (const hierarchyItem of apiItem.getHierarchy()) {
      if (IsItem.isPackageItem(hierarchyItem)) {
        const packageName = PackageName.getUnscopedName(apiItem.displayName);
        if (fileLevel === "model") {
          anchorPaths.push(packageName);
          anchorItems.push(hierarchyItem);
        } else {
          filePaths.push(packageName);
          fileItems.push(hierarchyItem);
        }
      } else if (IsItem.isNamespaceItem(hierarchyItem)) {
        const namespaceName = apiItem.displayName;
        if (fileLevel === "model" || fileLevel === "package") {
          anchorPaths.push(namespaceName);
          anchorItems.push(hierarchyItem);
        } else {
          filePaths.push(namespaceName);
          fileItems.push(hierarchyItem);
        }
      } else if (IsItem.isExportItem(hierarchyItem)) {
        const exportName = apiItem.displayName;
        if (
          fileLevel === "model" ||
          fileLevel === "package" ||
          fileLevel === "namespace"
        ) {
          anchorPaths.push(exportName);
          anchorItems.push(hierarchyItem);
        } else {
          filePaths.push(exportName);
          fileItems.push(hierarchyItem);
        }
      } else if (IsItem.isMemberItem(hierarchyItem)) {
        const memberName = apiItem.displayName;
        if (
          fileLevel === "model" ||
          fileLevel === "package" ||
          fileLevel === "namespace" ||
          fileLevel === "export"
        ) {
          anchorPaths.push(memberName);
          anchorItems.push(hierarchyItem);
        } else {
          filePaths.push(memberName);
          fileItems.push(hierarchyItem);
        }
      } else if (!IsItem.isSkippedItem(hierarchyItem)) {
        anchorPaths.push(apiItem.displayName);
        anchorItems.push(hierarchyItem);
      }
    }
  }

  get apiItem(): ApiItem {
    return this._apiItem;
  }

  get fileLevel(): FileLevel {
    return this._fileLevel;
  }

  get filePaths(): string[] {
    return this._filePaths;
  }

  get anchorPaths(): string[] {
    return this._anchorPaths;
  }

  get fileItems(): ApiItem[] {
    return this._fileItems;
  }

  get anchorItems(): ApiItem[] {
    return this._anchorItems;
  }

  get lastFileItem(): ApiItem | null {
    return this._fileItems.length > 0
      ? this._fileItems[this._fileItems.length - 1]
      : null;
  }

  getItemFilename(): string {
    return (
      this.filePaths.join(ItemHierarchy.FILE_SEPARATOR) +
      ItemHierarchy.FILE_EXTENSION
    );
  }

  getItemHeaderSuffix(): string {
    return ApiParameterListMixin.isBaseClassOf(this.apiItem)
      ? ItemHierarchy.METHOD_SUFFIX
      : "";
  }

  getItemHeader(): string {
    return (
      this.anchorPaths.join(ItemHierarchy.HEADER_SEPARATOR) +
      this.getItemHeaderSuffix()
    );
  }

  getItemInternalLink(): string {
    return "#" + this.anchorPaths.join(ItemHierarchy.LINK_SEPARATOR);
  }

  getItemExternalLink(): string {
    return this.getItemFilename() + this.getItemInternalLink();
  }

  hasSameFile(hierarchy: ItemHierarchy): boolean {
    return this.lastFileItem === hierarchy.lastFileItem;
  }

  getItemLink(apiItem: ApiItem): string {
    const externalHierarchy = new ItemHierarchy(apiItem, this.fileLevel);
    return this.hasSameFile(externalHierarchy)
      ? externalHierarchy.getItemInternalLink()
      : externalHierarchy.getItemExternalLink();
  }

  getLevelInFile(): number {
    return this.anchorPaths.length;
  }

  getShouldCreateFile(): boolean {
    return this.anchorPaths.length === 0;
  }

  getMembersByType(): Map<string, ApiItem[]> {
    const membersByType: Map<string, ApiItem[]> = new Map();
    for (const member of this.apiItem.members) {
    }
    return membersByType;
  }
}

export interface INewDocumenterOptions {
  apiModel: ApiModel;
  documenterConfig: DocumenterConfig | undefined;
  outputFolder: string;
  fileLevel: FileLevel;
}

export class NewDocumenter {
  private readonly _apiModel: ApiModel;
  private readonly _documenterConfig: DocumenterConfig | undefined;
  private readonly _tsdocConfiguration: TSDocConfiguration;
  private readonly _markdownEmitter: CustomMarkdownEmitter;
  private readonly _outputFolder: string;
  private readonly _fileLevel: FileLevel;

  constructor(options: INewDocumenterOptions) {
    this._apiModel = options.apiModel;
    this._documenterConfig = options.documenterConfig;
    this._outputFolder = options.outputFolder;
    this._fileLevel = options.fileLevel;
    this._tsdocConfiguration = CustomDocNodes.configuration;
    this._markdownEmitter = new CustomMarkdownEmitter(this._apiModel);
  }

  private writeBreadcrumb(itemHierarchy: ItemHierarchy): void {
    if (itemHierarchy.getShouldCreateFile()) {
      // write breadcrumb
    }
  }

  private writeHeader(itemHierarchy: ItemHierarchy): void {
    const level = Math.min(4, itemHierarchy.getLevelInFile() + 1);
    const text = itemHierarchy.getItemHeader();
    // write header
  }

  private writeContent(itemHierarchy: ItemHierarchy): void {
    // all the other stuff here
  }

  private writeTables(itemHierarchy: ItemHierarchy): void {
    const membersByType: Map<string, ApiItem[]> =
      itemHierarchy.getMembersByType();
  }

  private writeChildren(itemHierarchy: ItemHierarchy): void {}

  private writeSummaryFile(itemHierarchy: ItemHierarchy): void {}

  private writeContentFile(itemHierarchy: ItemHierarchy): void {}

  private writeItem(item: ApiItem): void {
    const itemHierarchy = new ItemHierarchy(item, this._fileLevel);
    this.writeBreadcrumb(itemHierarchy);
    this.writeHeader(itemHierarchy);
    this.writeContent(itemHierarchy);
    this.writeTables(itemHierarchy);
    this.writeSummaryFile(itemHierarchy);
    this.writeChildren(itemHierarchy);
    this.writeContentFile(itemHierarchy);
  }

  public generateFiles(): void {
    this.writeItem(this._apiModel);
  }
}
