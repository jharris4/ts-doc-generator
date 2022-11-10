// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

export type FileLevelString =
  | "model"
  | "package"
  | "namespace"
  | "export"
  | "member"
  | "all";

export type NewlineKindString = "crlf" | "lf" | "os";

export type OutputTarget = "markdown";

export interface IConfigFileMarkdown {
  fileLevel?: FileLevelString;
  indexBreadcrumbTitle?: string;
  indexFilename?: string;
  indexTitle?: string;
  showPropertyDefaults?: boolean;
  hideEmptyTableColumns?: boolean;
  showBreadcrumb?: boolean;
  useIndex?: boolean;
  indexBreadcrumbUrl?: string;
  showRules?: boolean;
}

export interface IConfigFileMarkdownFull extends IConfigFileMarkdown {
  fileLevel: FileLevelString;
  indexBreadcrumbTitle: string;
  indexFilename: string;
  indexTitle: string;
  showPropertyDefaults: boolean;
  hideEmptyTableColumns: boolean;
  showBreadcrumb: boolean;
  useIndex: boolean;
  indexBreadcrumbUrl: string;
  showRules: boolean;
}

export interface IConfigFileBase {
  /**
   * Specifies the documentation root directory
   */
  docRootDir?: string;
  docApiDir?: string;
  docMarkdownDir?: string;
  generateApi?: boolean;
  operation?: "extract" | "document" | "generate";
  /**
   * Specifies whether inherited members should also be shown on an API item's page.
   */
  showInheritedMembers?: boolean;
  /**
   * Specifies what type of newlines API Documenter should use when writing output files.
   *
   * @remarks
   * By default, the output files will be written with Windows-style newlines.
   * To use POSIX-style newlines, specify "lf" instead.
   * To use the OS's default newline kind, specify "os".
   */
  newlineKind?: NewlineKindString;

  markdownOptions?: IConfigFileMarkdown;

  includePackageNames?: string[];
  excludePackageNames?: string[];
}

/**
 * This interface represents the api-documenter.json file format.
 */
export interface IConfigFile extends IConfigFileBase {}

export interface IConfigFileFull extends IConfigFile {
  docRootDir: string;
  docApiDir: string;
  docMarkdownDir: string;
  generateApi: boolean;
  operation: "extract" | "document" | "generate";
  /**
   * Specifies whether inherited members should also be shown on an API item's page.
   */
  showInheritedMembers: boolean;
  /**
   * Specifies what type of newlines API Documenter should use when writing output files.
   *
   * @remarks
   * By default, the output files will be written with Windows-style newlines.
   * To use POSIX-style newlines, specify "lf" instead.
   * To use the OS's default newline kind, specify "os".
   */
  newlineKind: NewlineKindString;

  markdownOptions: IConfigFileMarkdown;

  includePackageNames: string[];
  excludePackageNames: string[];
}
