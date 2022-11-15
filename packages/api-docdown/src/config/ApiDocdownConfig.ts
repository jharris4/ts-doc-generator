// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from "path";
import { JsonSchema, JsonFile } from "@rushstack/node-core-library";
import { IConfigFile, IConfigFileFull, IConfigFileBase } from "./IConfigFile";

export class ApiDocdownConfig {
  public readonly configFilePath: string;
  public readonly configFile: IConfigFileFull;

  public static readonly jsonSchema: JsonSchema = JsonSchema.fromFile(
    path.join(__dirname, "..", "schemas", "api-docdown.schema.json")
  );

  public static readonly FILENAME: string = "api-docdown.json";

  protected constructor(filePath: string, configFile: IConfigFileFull) {
    this.configFilePath = filePath;
    this.configFile = configFile;
  }

  public static loadFile(configFilePath: string): ApiDocdownConfig {
    const configFile: IConfigFile = JsonFile.loadAndValidate(
      configFilePath,
      ApiDocdownConfig.jsonSchema
    );

    return new ApiDocdownConfig(
      path.resolve(configFilePath),
      ApiDocdownConfig.getDefaultConfig(configFile)
    );
  }

  public static prepare(options?: IConfigFileBase): ApiDocdownConfig {
    const preparedConfig = ApiDocdownConfig.getDefaultConfig(options);
    ApiDocdownConfig.jsonSchema.validateObject(preparedConfig, "");

    return new ApiDocdownConfig("", preparedConfig);
  }

  public static getDefaultConfig(
    maybeConfig?: IConfigFileBase
  ): IConfigFileFull {
    // const docRootDir = config?.docRootDir !== undefined ? config.docRootDir : "."
    const config = maybeConfig || {};
    const { docRootDir = "." } = config;
    const { docApiDir = "docs/api" } = config;
    const { docMarkdownDir = "docs/api" } = config;
    const { generateApi = false } = config;
    const { operation = "generate" } = config;
    const { showInheritedMembers = false } = config;
    const { newlineKind = "crlf" } = config;
    const { markdownOptions = {} } = config;
    const { fileLevel = "package" } = markdownOptions;
    const { indexFilename = "index" } = markdownOptions;
    const { indexTitle = "API Reference" } = markdownOptions;
    const { indexBreadcrumbTitle = "Home" } = markdownOptions;
    const { hideEmptyTableColumns = true } = markdownOptions;
    const { showPropertyDefaults = true } = markdownOptions;
    const { showBreadcrumb = true } = markdownOptions;
    const { useIndex = true } = markdownOptions;
    const { indexBreadcrumbUrl = "" } = markdownOptions;
    const { showRules = true } = markdownOptions;
    const { showLineBreaks = true } = markdownOptions;
    const { showCallSignatures = true } = markdownOptions;
    const { collapseCallSignatures = true } = markdownOptions;
    const { includePackageNames = [] } = config;
    const { excludePackageNames = [] } = config;

    return {
      docRootDir,
      docApiDir,
      docMarkdownDir,
      generateApi,
      operation,
      showInheritedMembers,
      newlineKind,
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
        showLineBreaks,
        showCallSignatures,
        collapseCallSignatures,
      },
      includePackageNames,
      excludePackageNames,
    };
  }
}
