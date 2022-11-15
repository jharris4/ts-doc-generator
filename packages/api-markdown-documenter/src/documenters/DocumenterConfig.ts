// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from "path";
import {
  JsonSchema,
  JsonFile,
  NewlineKind,
} from "@rushstack/node-core-library";
import { IConfigFile, IConfigFileFull, IConfigFileBase } from "./IConfigFile";
import { FileLevel } from "./FileLevel";

/**
 * Helper for loading the api-documenter.json file format.  Later when the schema is more mature,
 * this class will be used to represent the validated and normalized configuration, whereas `IConfigFile`
 * represents the raw JSON file structure.
 */
export class DocumenterConfig {
  public readonly configFilePath: string;
  public readonly configFile: IConfigFileFull;

  /**
   * Specifies what type of newlines API Documenter should use when writing output files.  By default, the output files
   * will be written with Windows-style newlines.
   */
  public readonly newlineKind: NewlineKind;

  public readonly fileLevel: FileLevel;

  /**
   * The JSON Schema for API Documenter config file (api-documenter.schema.json).
   */
  public static readonly jsonSchema: JsonSchema = JsonSchema.fromFile(
    path.join(__dirname, "..", "schemas", "api-documenter.schema.json")
  );

  /**
   * The config file name "api-documenter.json".
   */
  public static readonly FILENAME: string = "api-documenter.json";

  protected constructor(filePath: string, configFile: IConfigFileFull) {
    this.configFilePath = filePath;
    this.configFile = configFile;

    switch (configFile.newlineKind) {
      case "lf":
        this.newlineKind = NewlineKind.Lf;
        break;
      case "os":
        this.newlineKind = NewlineKind.OsDefault;
        break;
      default:
        this.newlineKind = NewlineKind.CrLf;
        break;
    }

    if (configFile.markdownOptions) {
      switch (configFile.markdownOptions.fileLevel) {
        case "model":
          this.fileLevel = FileLevel.Model;
          break;
        case "package":
          this.fileLevel = FileLevel.Package;
          break;
        case "namespace":
          this.fileLevel = FileLevel.Namespace;
          break;
        case "export":
          this.fileLevel = FileLevel.Export;
          break;
        case "member":
        default:
          this.fileLevel = FileLevel.Member;
          break;
      }
    } else {
      this.fileLevel = FileLevel.Member;
    }
  }

  /**
   * Load and validate an api-documenter.json file.
   */
  public static loadFile(configFilePath: string): DocumenterConfig {
    const configFile: IConfigFile = JsonFile.loadAndValidate(
      configFilePath,
      DocumenterConfig.jsonSchema
    );

    return new DocumenterConfig(
      path.resolve(configFilePath),
      DocumenterConfig.getDefaultConfig(configFile)
    );
  }

  public static prepare(options?: IConfigFileBase): DocumenterConfig {
    const preparedConfig = DocumenterConfig.getDefaultConfig(options);
    DocumenterConfig.jsonSchema.validateObject(preparedConfig, "");

    return new DocumenterConfig("", preparedConfig);
  }

  public static getDefaultConfig(config?: IConfigFileBase): IConfigFileFull {
    const markdownOptions = config ? config.markdownOptions || {} : {};
    return {
      outputTarget:
        config?.outputTarget !== undefined ? config.outputTarget : "markdown",
      newlineKind:
        config?.newlineKind !== undefined ? config.newlineKind : "crlf",
      showInheritedMembers:
        config?.showInheritedMembers !== undefined
          ? config.showInheritedMembers
          : false,
      markdownOptions: {
        fileLevel:
          markdownOptions.fileLevel !== undefined
            ? markdownOptions.fileLevel
            : "member",
        indexFilename:
          markdownOptions.indexFilename !== undefined
            ? markdownOptions.indexFilename
            : "index",
        indexTitle:
          markdownOptions.indexTitle !== undefined
            ? markdownOptions.indexTitle
            : "API Reference",
        indexBreadcrumbTitle:
          markdownOptions.indexBreadcrumbTitle !== undefined
            ? markdownOptions.indexBreadcrumbTitle
            : "Home",
        hideEmptyTableColumns:
          markdownOptions.hideEmptyTableColumns !== undefined
            ? markdownOptions.hideEmptyTableColumns
            : false,
        showPropertyDefaults:
          markdownOptions.showPropertyDefaults !== undefined
            ? markdownOptions.showPropertyDefaults
            : false,
        showBreadcrumb:
          markdownOptions.showBreadcrumb !== undefined
            ? markdownOptions.showBreadcrumb
            : true,
        useIndex:
          markdownOptions.useIndex !== undefined
            ? markdownOptions.useIndex
            : true,
        indexBreadcrumbUrl:
          markdownOptions.indexBreadcrumbUrl !== undefined
            ? markdownOptions.indexBreadcrumbUrl
            : "",
        showRules:
          markdownOptions.showRules !== undefined
            ? markdownOptions.showRules
            : false,
        showLineBreaks:
          markdownOptions.showLineBreaks !== undefined
            ? markdownOptions.showLineBreaks
            : false,
        showCallSignatures:
          markdownOptions.showCallSignatures !== undefined
            ? markdownOptions.showCallSignatures
            : false,
        collapseCallSignatures:
          markdownOptions.collapseCallSignatures !== undefined
            ? markdownOptions.collapseCallSignatures
            : false,
      },
    };
  }
}
