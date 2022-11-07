// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { IDocNodeParameters, DocNode } from "@microsoft/tsdoc";
import { CustomDocNodeKind } from "./CustomDocNodeKind";
import { DocTableRow } from "./DocTableRow";
import { DocTableCell } from "./DocTableCell";

/**
 * Constructor parameters for {@link DocTable}.
 */
export interface IDocTableParameters extends IDocNodeParameters {
  headerCells?: ReadonlyArray<DocTableCell>;
  headerTitles?: string[];
  skipEmptyColumns?: boolean;
}

/**
 * Represents table, similar to an HTML `<table>` element.
 */
export class DocTable extends DocNode {
  public readonly header: DocTableRow;

  private _rows: DocTableRow[];
  private _skipEmptyColumns: boolean;

  public constructor(
    parameters: IDocTableParameters,
    rows?: ReadonlyArray<DocTableRow>
  ) {
    super(parameters);

    this.header = new DocTableRow({ configuration: this.configuration });
    this._rows = [];
    this._skipEmptyColumns = parameters.skipEmptyColumns || true;

    if (parameters) {
      if (parameters.headerTitles) {
        if (parameters.headerCells) {
          throw new Error(
            "IDocTableParameters.headerCells and IDocTableParameters.headerTitles" +
              " cannot both be specified"
          );
        }
        for (const cellText of parameters.headerTitles) {
          this.header.addPlainTextCell(cellText);
        }
      } else if (parameters.headerCells) {
        for (const cell of parameters.headerCells) {
          this.header.addCell(cell);
        }
      }
    }

    if (rows) {
      for (const row of rows) {
        this.addRow(row);
      }
    }
  }

  /** @override */
  public get kind(): string {
    return CustomDocNodeKind.Table;
  }

  public get rows(): ReadonlyArray<DocTableRow> {
    return this._rows;
  }

  public get skipEmptyColumns(): boolean {
    return this._skipEmptyColumns;
  }

  public addRow(row: DocTableRow): void {
    this._rows.push(row);
  }

  public createAndAddRow(): DocTableRow {
    const row: DocTableRow = new DocTableRow({
      configuration: this.configuration,
    });
    this.addRow(row);
    return row;
  }

  /** @override */
  protected onGetChildNodes(): ReadonlyArray<DocNode | undefined> {
    return [this.header, ...this._rows];
  }
}
