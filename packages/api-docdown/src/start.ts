// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as os from "os";
import { bold as colorBold, cyan as colorCyan } from "colors";

import { PackageJsonLookup } from "@rushstack/node-core-library";

import { ApiDocdownCommandLine } from "./cli/ApiDocdownCommandLine";

const myPackageVersion: string =
  PackageJsonLookup.loadOwnPackageJson(__dirname).version;

console.log(
  os.EOL +
    colorBold(
      `api-docdown ${myPackageVersion} ` +
        // colorCyan(" - https://api-extractor.com/") +
        os.EOL
    )
);

const parser: ApiDocdownCommandLine = new ApiDocdownCommandLine();

parser.execute().catch(console.error); // CommandLineParser.execute() should never reject the promise
