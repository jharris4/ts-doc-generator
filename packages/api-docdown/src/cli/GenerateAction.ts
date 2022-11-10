// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from "path";
import { FileSystem } from "@rushstack/node-core-library";

import { ApiDocdownCommandLine } from "./ApiDocdownCommandLine";
import { BaseAction } from "./BaseAction";
import { ApiDocdownConfig } from "../config/ApiDocdownConfig";
import { generateApiDocs } from "../api-docdown";

export class GenerateAction extends BaseAction {
  public constructor(parser: ApiDocdownCommandLine) {
    super({
      actionName: "generate",
      summary:
        "generate markdown documentation files using a set of packages with typescript types as input",
      documentation:
        "This action is the same as running extract & then generate except the only the markdown files are output",
    });
  }

  protected async onExecute(): Promise<void> {
    // override
    // Look for the config file under the current folder

    let configFilePath: string = path.join(
      process.cwd(),
      ApiDocdownConfig.FILENAME
    );

    // First try the current folder
    if (!FileSystem.exists(configFilePath)) {
      // Otherwise try the standard "config" subfolder
      configFilePath = path.join(
        process.cwd(),
        "config",
        ApiDocdownConfig.FILENAME
      );
      if (!FileSystem.exists(configFilePath)) {
        throw new Error(
          `Unable to find ${ApiDocdownConfig.FILENAME} in the current folder or in a "config" subfolder`
        );
      }
    }

    const docdownConfig: ApiDocdownConfig =
      ApiDocdownConfig.loadFile(configFilePath);

    generateApiDocs(
      {
        ...docdownConfig.configFile,
        operation: "generate",
      },
      process.cwd()
    );
  }
}
