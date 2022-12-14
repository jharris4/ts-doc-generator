// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as os from "os";
import { bold as colorBold, cyan as colorCyan } from "colors";

import { PackageJsonLookup } from "@rushstack/node-core-library";

import { ApiMarkdownDocumenterCommandLine } from "./cli/ApiMarkdownDocumenterCommandLine";

const myPackageVersion: string =
  PackageJsonLookup.loadOwnPackageJson(__dirname).version;

console.log(
  os.EOL +
    colorBold(
      `ts-doc-generator ${myPackageVersion} ` +
        colorCyan(" - https://api-extractor.com/") +
        os.EOL
    )
);

const parser: ApiMarkdownDocumenterCommandLine =
  new ApiMarkdownDocumenterCommandLine();

parser.execute().catch(console.error); // CommandLineParser.execute() should never reject the promise
