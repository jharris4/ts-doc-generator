// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from "path";
import * as tsdoc from "@microsoft/tsdoc";
import colors from "colors/safe";

import {
  CommandLineAction,
  CommandLineStringParameter,
  type ICommandLineActionOptions,
} from "@rushstack/ts-command-line";
import { FileSystem } from "@rushstack/node-core-library";
import { ApiModel } from "@microsoft/api-extractor-model";

export interface IBuildApiModelResult {
  apiModel: ApiModel;
  inputFolder: string;
  outputFolder: string;
}

export abstract class BaseAction extends CommandLineAction {
  private readonly _inputFolderParameter: CommandLineStringParameter;
  private readonly _outputFolderParameter: CommandLineStringParameter;

  protected constructor(options: ICommandLineActionOptions) {
    super(options);

    // override
    this._inputFolderParameter = this.defineStringParameter({
      parameterLongName: "--input-folder",
      parameterShortName: "-i",
      argumentName: "FOLDER1",
      description:
        `Specifies the input folder containing the *.api.json files to be processed.` +
        ` If omitted, the default is "./input"`,
    });

    this._outputFolderParameter = this.defineStringParameter({
      parameterLongName: "--output-folder",
      parameterShortName: "-o",
      argumentName: "FOLDER2",
      description:
        `Specifies the output folder where the documentation will be written.` +
        ` ANY EXISTING CONTENTS WILL BE DELETED!` +
        ` If omitted, the default is "./${this.actionName}"`,
    });
  }
}
