// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { yellow as colorYellow } from "colors";
import {
  DocNode,
  DocLinkTag,
  DocHtmlStartTag,
  DocHtmlEndTag,
  DocHtmlAttribute,
  StringBuilder,
} from "@microsoft/tsdoc";
import {
  ApiModel,
  IResolveDeclarationReferenceResult,
  ApiItem,
} from "@microsoft/api-extractor-model";

import { CustomDocNodeKind } from "../nodes/CustomDocNodeKind";
import { DocAnchor } from "../nodes/DocAnchor";
import { DocHeading } from "../nodes/DocHeading";
// import { DocHorizontalRule } from "../nodes/DocHorizontalRule";
// import { DocLineBreak } from "../nodes/DocLineBreak";
import { DocNoteBox } from "../nodes/DocNoteBox";
import { DocTable } from "../nodes/DocTable";
import { DocTableCell } from "../nodes/DocTableCell";
import { DocEmphasisSpan } from "../nodes/DocEmphasisSpan";
import {
  MarkdownEmitter,
  IMarkdownEmitterContext,
  IMarkdownEmitterOptions,
} from "./MarkdownEmitter";
import { IndentedWriter } from "../utils/IndentedWriter";

export interface ICustomMarkdownEmitterOptions extends IMarkdownEmitterOptions {
  contextApiItem: ApiItem | undefined;

  onGetFilenameForApiItem: (apiItem: ApiItem) => string | undefined;
}

export class CustomMarkdownEmitter extends MarkdownEmitter {
  private _apiModel: ApiModel;

  public constructor(apiModel: ApiModel) {
    super();

    this._apiModel = apiModel;
  }

  public emit(
    stringBuilder: StringBuilder,
    docNode: DocNode,
    options: ICustomMarkdownEmitterOptions
  ): string {
    return super.emit(stringBuilder, docNode, options);
  }

  /** @override */
  protected writeNode(
    docNode: DocNode,
    context: IMarkdownEmitterContext,
    docNodeSiblings: boolean
  ): void {
    const writer: IndentedWriter = context.writer;

    switch (docNode.kind) {
      case CustomDocNodeKind.Anchor: {
        const docAnchor: DocAnchor = docNode as DocAnchor;
        writer.ensureSkippedLine();
        const { configuration, name } = docAnchor;

        super.writeNode(
          new DocHtmlStartTag({
            configuration,
            name: "a",
            htmlAttributes: [
              new DocHtmlAttribute({
                configuration,
                name: "name",
                value: JSON.stringify(name),
              }),
            ],
          }),
          context,
          docNodeSiblings
        );
        super.writeNode(
          new DocHtmlEndTag({ configuration, name: "a" }),
          context,
          docNodeSiblings
        );
        writer.writeLine();
        break;
      }
      case CustomDocNodeKind.Heading: {
        const docHeading: DocHeading = docNode as DocHeading;
        writer.ensureSkippedLine();

        let prefix: string;
        switch (docHeading.level) {
          case 1:
            prefix = "##";
            break;
          case 2:
            prefix = "###";
            break;
          case 3:
            prefix = "###";
            break;
          default:
            prefix = "####";
        }

        writer.writeLine(prefix + " " + this.getEscapedText(docHeading.title));
        writer.writeLine();
        break;
      }
      case CustomDocNodeKind.HorizontalRule: {
        // const docHorizontalRule: DocHorizontalRule = docNode as DocHorizontalRule;
        writer.ensureSkippedLine();
        writer.write("---");
        writer.writeLine();
        writer.writeLine();
        break;
      }
      case CustomDocNodeKind.LineBreak: {
        // const docLineBreak: DocLineBreak = docNode as DocLineBreak;
        writer.ensureSkippedLine();
        const { configuration } = docNode;
        // writer.write("\\"); // This didn't preview properly in vs code preview
        super.writeNode(
          new DocHtmlStartTag({
            configuration,
            name: "br",
          }),
          context,
          docNodeSiblings
        );
        writer.writeLine();
        break;
      }
      case CustomDocNodeKind.NoteBox: {
        const docNoteBox: DocNoteBox = docNode as DocNoteBox;
        writer.ensureNewLine();

        writer.increaseIndent("> ");

        this.writeNode(docNoteBox.content, context, false);
        writer.ensureNewLine();

        writer.decreaseIndent();

        writer.writeLine();
        break;
      }
      case CustomDocNodeKind.Table: {
        const docTable: DocTable = docNode as DocTable;
        // GitHub's markdown renderer chokes on tables that don't have a blank line above them,
        // whereas VS Code's renderer is totally fine with it.
        writer.ensureSkippedLine();

        context.insideTable = true;

        // Markdown table rows can have inconsistent cell counts.  Size the table based on the longest row.
        let columnCount: number = 0;
        if (docTable.header) {
          columnCount = docTable.header.cells.length;
        }
        for (const row of docTable.rows) {
          if (row.cells.length > columnCount) {
            columnCount = row.cells.length;
          }
        }

        const skipIndexMap: Map<number, boolean> = new Map();

        if (docTable.skipEmptyColumns) {
          for (let i: number = 0; i < columnCount; ++i) {
            let foundValue = false;
            for (const row of docTable.rows) {
              if (row.cells[i].content.nodes.length > 0) {
                foundValue = true;
                break;
              }
            }
            if (!foundValue) {
              skipIndexMap.set(i, true);
            }
          }
        }

        // write the table header (which is required by Markdown)
        writer.write("| ");
        for (let i: number = 0; i < columnCount; ++i) {
          if (skipIndexMap.get(i)) {
            continue;
          }
          writer.write(" ");
          if (docTable.header) {
            const cell: DocTableCell | undefined = docTable.header.cells[i];
            if (cell) {
              this.writeNode(cell.content, context, false);
            }
          }
          writer.write(" |");
        }
        writer.writeLine();

        // write the divider
        writer.write("| ");
        for (let i: number = 0; i < columnCount; ++i) {
          if (skipIndexMap.get(i)) {
            continue;
          }
          writer.write(" --- |");
        }
        writer.writeLine();

        for (const row of docTable.rows) {
          writer.write("| ");
          for (let i: number = 0; i < columnCount; ++i) {
            if (skipIndexMap.get(i)) {
              continue;
            }
            writer.write(" ");
            this.writeNode(row.cells[i].content, context, false);
            writer.write(" |");
          }
          writer.writeLine();
        }
        writer.writeLine();

        context.insideTable = false;

        break;
      }
      case CustomDocNodeKind.EmphasisSpan: {
        const docEmphasisSpan: DocEmphasisSpan = docNode as DocEmphasisSpan;
        const oldBold: boolean = context.boldRequested;
        const oldItalic: boolean = context.italicRequested;
        context.boldRequested = docEmphasisSpan.bold;
        context.italicRequested = docEmphasisSpan.italic;
        this.writeNodes(docEmphasisSpan.nodes, context);
        context.boldRequested = oldBold;
        context.italicRequested = oldItalic;
        break;
      }
      default:
        super.writeNode(docNode, context, docNodeSiblings);
    }
  }

  /** @override */
  protected writeLinkTagWithCodeDestination(
    docLinkTag: DocLinkTag,
    context: IMarkdownEmitterContext<ICustomMarkdownEmitterOptions>
  ): void {
    const options: ICustomMarkdownEmitterOptions = context.options;

    const result: IResolveDeclarationReferenceResult =
      this._apiModel.resolveDeclarationReference(
        docLinkTag.codeDestination!,
        options.contextApiItem
      );

    if (result.resolvedApiItem) {
      const filename: string | undefined = options.onGetFilenameForApiItem(
        result.resolvedApiItem
      );

      if (filename) {
        let linkText: string = docLinkTag.linkText || "";
        if (linkText.length === 0) {
          // Generate a name such as Namespace1.Namespace2.MyClass.myMethod()
          linkText = result.resolvedApiItem.getScopedNameWithinPackage();
        }
        if (linkText.length > 0) {
          const encodedLinkText: string = this.getEscapedText(
            linkText.replace(/\s+/g, " ")
          );

          context.writer.write("[");
          context.writer.write(encodedLinkText);
          context.writer.write(`](${filename!})`);
        } else {
          console.log(colorYellow("WARNING: Unable to determine link text"));
        }
      }
    } else if (result.errorMessage) {
      console.log(
        colorYellow(
          `WARNING: Unable to resolve reference "${docLinkTag.codeDestination!.emitAsTsdoc()}": ` +
            result.errorMessage
        )
      );
    }
  }
}
