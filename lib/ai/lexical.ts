import type { SerializedEditorState } from "lexical";

/**
 * Convert plain text (paragraphs separated by blank lines) into a
 * SerializedEditorState the Lexical Editor component can render.
 *
 * Single newlines inside a paragraph are preserved as soft line breaks.
 */
export function plainTextToSerializedEditorState(
  text: string
): SerializedEditorState {
  const trimmed = text.trim();
  const paragraphs = trimmed ? trimmed.split(/\n{2,}/) : [""];

  return {
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: "ltr",
      children: paragraphs.map((para) => paragraphNode(para)),
    },
  } as unknown as SerializedEditorState;
}

function paragraphNode(text: string) {
  const lines = text.split("\n");
  const children: Array<Record<string, unknown>> = [];

  lines.forEach((line, i) => {
    if (line.length > 0) children.push(textNode(line));
    if (i < lines.length - 1) children.push(lineBreakNode());
  });

  return {
    type: "paragraph",
    version: 1,
    format: "",
    indent: 0,
    direction: "ltr",
    textFormat: 0,
    textStyle: "",
    children,
  };
}

function textNode(text: string) {
  return {
    type: "text",
    version: 1,
    text,
    format: 0,
    style: "",
    mode: "normal",
    detail: 0,
  };
}

function lineBreakNode() {
  return {
    type: "linebreak",
    version: 1,
  };
}

/**
 * Walk a SerializedEditorState (or a parsed JSON description) and extract its
 * plain text. Paragraphs are separated with blank lines, line breaks with a
 * single newline. Used to feed the editor's current content back into the AI
 * for the Rewrite flow.
 */
export function serializedEditorStateToPlainText(
  state: SerializedEditorState | unknown
): string {
  if (!state || typeof state !== "object") return "";
  const root = (state as { root?: unknown }).root;
  if (!root || typeof root !== "object") return "";

  const blocks = nodeToText(root as Record<string, unknown>, true);
  return blocks.join("\n\n").trim();
}

function nodeToText(
  node: Record<string, unknown>,
  isRoot = false
): string[] {
  const type = node.type as string | undefined;
  const children = (node.children ?? []) as Record<string, unknown>[];

  if (isRoot) {
    return children.flatMap((c) => nodeToText(c));
  }

  // Block-level nodes: produce one text block each
  if (
    type === "paragraph" ||
    type === "heading" ||
    type === "quote" ||
    type === "listitem"
  ) {
    return [inlineText(children)];
  }
  if (type === "list") {
    // Each list item already returns its own block; preserve as separate blocks.
    return children.flatMap((c) => nodeToText(c));
  }

  // Inline fallback (rare at top level)
  return [inlineText([node])];
}

function inlineText(children: Record<string, unknown>[]): string {
  let out = "";
  for (const child of children) {
    const type = child.type as string | undefined;
    if (type === "text") {
      out += (child.text as string | undefined) ?? "";
    } else if (type === "linebreak") {
      out += "\n";
    } else if (type === "link") {
      out += inlineText((child.children ?? []) as Record<string, unknown>[]);
    } else if (Array.isArray(child.children)) {
      out += inlineText(child.children as Record<string, unknown>[]);
    }
  }
  return out;
}
