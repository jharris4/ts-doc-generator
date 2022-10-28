// Copyright (c) Not Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
// written by jharris4

import { IDocNodeParameters, DocNode } from '@microsoft/tsdoc';
import { CustomDocNodeKind } from './CustomDocNodeKind';

/**
 * Represents a horizontal rule/line similar to an <hr /> html tag.
 */
export class DocHorizontalRule extends DocNode {
  /**
   * Don't call this directly.  Instead use {@link TSDocParser}
   * @internal
   */
  public constructor(parameters: IDocNodeParameters) {
    super(parameters);
  }

  /** @override */
  public get kind(): string {
    return CustomDocNodeKind.HorizontalRule;
  }
}
