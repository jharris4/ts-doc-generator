// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { CommandLineParser } from "@rushstack/ts-command-line";
import { ExtractAction } from "./ExtractAction";
import { DocumentAction } from "./DocumentAction";
import { GenerateAction } from "./GenerateAction";

export class ApiDocdownCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "api-docdown",
      toolDescription:
        "Reads typescript type definitions from packages and uses tsdoc doc comments in those" +
        " to generate API documentation in markdown format",
    });
    this._populateActions();
  }

  private _populateActions(): void {
    this.addAction(new ExtractAction(this));
    this.addAction(new DocumentAction(this));
    this.addAction(new GenerateAction(this));
  }
}
