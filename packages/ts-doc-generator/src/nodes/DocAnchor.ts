// Copyright (c) Not Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
// written by jharris4

import { IDocNodeParameters, DocNode } from "@microsoft/tsdoc";
import { CustomDocNodeKind } from "./CustomDocNodeKind";

export interface IDocAnchorParameters extends IDocNodeParameters {
  name: string;
}

/**
 * Represents a horizontal rule/line similar to an <hr /> html tag.
 */
export class DocAnchor extends DocNode {
  public readonly name: string;
  /**
   * Don't call this directly.  Instead use {@link TSDocParser}
   * @internal
   */
  public constructor(parameters: IDocAnchorParameters) {
    super(parameters);
    this.name = parameters.name;
  }

  /** @override */
  public get kind(): string {
    return CustomDocNodeKind.Anchor;
  }
}
