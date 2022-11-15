import { PackageName } from "@rushstack/node-core-library";
import {
  ApiModel,
  ApiItem,
  ApiItemKind,
  ApiParameterListMixin,
  ApiCallSignature,
} from "@microsoft/api-extractor-model";

import { Utilities } from "../utils/Utilities";
import { FileLevel } from "./FileLevel";

const { Model, Package, CallSignature } = ApiItemKind;

const addMemberCollisions = (
  item: ApiItem,
  nameCollisionIndexMap: Map<ApiItem, number>,
  caseCollisionIndexMap: Map<ApiItem, number>
): void => {
  const { kind, members } = item;
  if (members && members.length > 0) {
    const childMembers =
      kind === ApiItemKind.Package
        ? members.flatMap((m) => m.members)
        : members;
    if (item.kind !== ApiItemKind.Model) {
      const nameMap: Map<string, ApiItem[]> = new Map();
      const lowerNameMap: Map<string, ApiItem[]> = new Map();
      for (const member of childMembers) {
        const name = member.displayName;
        const lowerName = name.toLowerCase();
        const existingNameItems = nameMap.get(name);
        const existingLowerNameItems = lowerNameMap.get(lowerName);
        const newNameItems =
          existingNameItems !== undefined
            ? existingNameItems.concat(member)
            : [member];
        const newLowerNameItems =
          existingLowerNameItems !== undefined
            ? existingLowerNameItems.concat(member)
            : [member];
        nameMap.set(name, newNameItems);
        lowerNameMap.set(lowerName, newLowerNameItems);
      }

      if (childMembers.length !== nameMap.size) {
        const collisionIndexMap: Map<string, number> = new Map();
        for (const member of childMembers) {
          const name = member.displayName;
          const existingItems = nameMap.get(name);
          if (existingItems !== undefined && existingItems.length > 1) {
            collisionIndexMap.set(name, 0);
          }
        }

        for (const member of childMembers) {
          const name = member.displayName.toLowerCase();
          const collisionIndex = collisionIndexMap.get(name);
          if (collisionIndex !== undefined) {
            nameCollisionIndexMap.set(member, collisionIndex);
            collisionIndexMap.set(name, collisionIndex + 1);
          }
        }
      }

      if (childMembers.length !== lowerNameMap.size) {
        const collisionIndexMap: Map<string, number> = new Map();
        for (const member of childMembers) {
          const lowerName = member.displayName.toLowerCase();
          const existingItems = lowerNameMap.get(lowerName);
          if (existingItems !== undefined && existingItems.length > 1) {
            collisionIndexMap.set(lowerName, 0);
          }
        }

        for (const member of childMembers) {
          const lowerName = member.displayName.toLowerCase();
          const collisionIndex = collisionIndexMap.get(lowerName);
          if (collisionIndex !== undefined) {
            caseCollisionIndexMap.set(member, collisionIndex);
            collisionIndexMap.set(lowerName, collisionIndex + 1);
          }
        }
      }
    }
    for (const member of childMembers) {
      addMemberCollisions(member, nameCollisionIndexMap, caseCollisionIndexMap);
    }
  }
};

interface CollisionLookup {
  getItemNameCollisionIndex: (item: ApiItem) => number | undefined;
  getItemCaseCollisionIndex: (item: ApiItem) => number | undefined;
}

const createCollisionLookup = (model: ApiItem): CollisionLookup => {
  const nameCollisionIndexMap: Map<ApiItem, number> = new Map();
  const caseCollisionIndexMap: Map<ApiItem, number> = new Map();
  addMemberCollisions(model, nameCollisionIndexMap, caseCollisionIndexMap);
  const getItemNameCollisionIndex = (item: ApiItem): number | undefined => {
    return nameCollisionIndexMap.get(item);
  };
  const getItemCaseCollisionIndex = (item: ApiItem): number | undefined => {
    return caseCollisionIndexMap.get(item);
  };
  return {
    getItemNameCollisionIndex,
    getItemCaseCollisionIndex,
  };
};

// package name: @scope/package -> scope%XYZpackage

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
      CallSignature,
      ConstructSignature,
      Constructor,
      EnumMember,
      Method,
      MethodSignature,
      Property,
      PropertySignature,
    ];
    export const ignoredKinds = [IndexSignature, None];
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

export interface IApiItemPathOptions {
  fileLevel: FileLevel;
  apiModel: ApiModel;
  indexFilename: string;
  apiItem: ApiItem;
  collisionLookup?: CollisionLookup;
}

// TODO - investigate Map<Key,Value> Key ordering when using Map.set(k, v)

export class ApiItemPath implements IApiItemPathOptions {
  private readonly _fileLevel: FileLevel;
  private readonly _apiModel: ApiModel;
  private readonly _indexFilename: string;
  private readonly _collisionLookup: CollisionLookup;
  private readonly _apiItem: ApiItem;

  private readonly _filePaths: string[];
  private readonly _anchorPaths: string[];
  private readonly _fileApiItems: ApiItem[];
  private readonly _anchorApiItems: ApiItem[];

  public getPathForItem(apiItem: ApiItem): string {
    const { kind, displayName } = apiItem;
    let name: string = kind === CallSignature ? "call" : displayName;
    let path = name;
    if (kind === Package) {
      const unscopedName = PackageName.getUnscopedName(name);
      if (unscopedName !== name) {
        path = name.replace("@", "").replace("/", "$");
      }
    }
    if (
      ApiParameterListMixin.isBaseClassOf(apiItem) &&
      apiItem.overloadIndex > 1
    ) {
      path = name + "_" + (apiItem.overloadIndex - 1);
    } else {
      const nameCollisionIndex =
        this.collisionLookup.getItemNameCollisionIndex(apiItem);
      if (nameCollisionIndex !== undefined) {
        path = name + "-" + nameCollisionIndex;
      } else {
        const caseCollisionIndex =
          this.collisionLookup.getItemCaseCollisionIndex(apiItem);
        if (caseCollisionIndex !== undefined) {
          path = name + "~" + caseCollisionIndex;
        }
      }
    }
    if (apiItem.kind === CallSignature) {
      // && path === "call") {
      const callSignature = apiItem as ApiCallSignature;
      path =
        name +
        "-" +
        (callSignature.overloadIndex !== undefined
          ? "" + callSignature.overloadIndex
          : "0");

      const check = ApiParameterListMixin.isBaseClassOf(apiItem);
    }
    return path;
  }

  public constructor(options: IApiItemPathOptions) {
    const fileLevel = (this._fileLevel = options.fileLevel);
    this._apiModel = options.apiModel;
    this._indexFilename = options.indexFilename;
    this._collisionLookup = options.collisionLookup
      ? options.collisionLookup
      : createCollisionLookup(options.apiModel);
    const apiItem = (this._apiItem = options.apiItem);
    const filePaths: string[] = (this._filePaths = []);
    const anchorPaths: string[] = (this._anchorPaths = []);
    const fileApiItems: ApiItem[] = (this._fileApiItems = []);
    const anchorApiItems: ApiItem[] = (this._anchorApiItems = []);
    for (const hierarchyItem of apiItem.getHierarchy()) {
      if (
        hierarchyItem.kind !== Model &&
        IsKind.isIncludedKind(hierarchyItem) &&
        !IsKind.isSkippedKind(hierarchyItem) &&
        !IsKind.isIgnoredKind(hierarchyItem)
      ) {
        const isFileLevel = IsKind.isFileLevelKind(fileLevel, hierarchyItem);
        const path = this.getPathForItem(hierarchyItem);
        const targetPaths = isFileLevel ? filePaths : anchorPaths;
        const targetItems = isFileLevel ? fileApiItems : anchorApiItems;
        // TODO - this getSafeFilenameForName makes lowercase and replaces non alpha/numeric characters with _
        targetPaths.push(
          isFileLevel
            ? Utilities.getSafeFilenameForName(path)
            : path.toLowerCase()
        );
        targetItems.push(hierarchyItem);
      }
    }
  }

  public get fileLevel() {
    return this._fileLevel;
  }

  public get apiModel() {
    return this._apiModel;
  }

  public get indexFilename() {
    return this._indexFilename;
  }

  public get collisionLookup() {
    return this._collisionLookup;
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
    return IsKind.isFileLevelKindExact(this.fileLevel, this.apiItem);
  }

  /*
   * weirdly the level mappings are: 1 => ##, 2 => ###, 3 => ###, 4 => ####, 5 => ####
   *
   * // TODO - add support for headerIndent, defaults to "", could be "-" or "&nbsp;" etc
   */
  getHeaderLevel(): number {
    const { length } = this.anchorPaths;
    return length === 0 ? 1 : length === 1 ? 3 : 5;
  }

  getHeaderLevelChild(): number | undefined {
    const { length } = this.anchorPaths;
    return length === 0 ? 3 : length === 1 ? 5 : undefined;
  }

  getHeaderLink(): string {
    return this.anchorPaths.length > 0
      ? this.getAnchorPath()
      : "#" + this.getPathForItem(this.apiItem);
  }

  getFilePath(): string {
    return this.filePaths.join(".") + ".md";
  }

  getAnchorPath(): string {
    return this.anchorPaths.join(".");
  }

  getExternalLink(): string {
    return (
      "./" +
      this.getFilePath() +
      (this.getHasAnchor() ? "#" + this.getAnchorPath() : "")
    );
  }

  getRelativeLink(apiItem: ApiItem): string {
    const { fileLevel, apiModel, indexFilename, collisionLookup } = this;
    if (apiItem === apiModel) {
      return "./" + indexFilename + ".md";
    } else if (apiItem === this.apiItem) {
      return this.getExternalLink();
    } else {
      const itemPath = new ApiItemPath({
        fileLevel,
        apiModel,
        indexFilename,
        collisionLookup,
        apiItem,
      });
      const sameFile = this.lastFileItem === itemPath.lastFileItem;
      return sameFile
        ? itemPath.getHasAnchor()
          ? "#" + itemPath.getAnchorPath()
          : "./"
        : itemPath.getExternalLink();
    }
  }

  createPathForItem(apiItem: ApiItem): ApiItemPath {
    const { fileLevel, apiModel, indexFilename, collisionLookup } = this;
    return new ApiItemPath({
      fileLevel,
      apiModel,
      indexFilename,
      collisionLookup,
      apiItem,
    });
  }
}

export function createItemPath(
  apiModel: ApiModel,
  fileLevel: FileLevel,
  indexFilename: string = "index"
): ApiItemPath {
  return new ApiItemPath({
    fileLevel,
    apiModel,
    indexFilename,
    apiItem: apiModel,
  });
}
