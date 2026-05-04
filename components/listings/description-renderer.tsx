"use client"

import { useMemo } from "react"
import type { SerializedEditorState } from "lexical"
import { LexicalComposer, InitialConfigType } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { editorTheme } from "@/components/editor/themes/editor-theme"
import { nodes } from "@/components/blocks/editor-00/nodes"

type Props = {
  content: string
}

function isLexicalJson(text: string): boolean {
  if (!text.startsWith("{")) return false
  try {
    const parsed = JSON.parse(text)
    return !!parsed?.root
  } catch {
    return false
  }
}

function RichTextRenderer({ json }: { json: string }) {
  const config: InitialConfigType = useMemo(
    () => ({
      namespace: "DescriptionRenderer",
      theme: editorTheme,
      nodes,
      editable: false,
      editorState: json,
      onError: (error: Error) => {
        console.error("Description renderer error:", error)
      },
    }),
    [json]
  )

  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <LexicalComposer initialConfig={config}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="outline-none prose prose-sm max-w-none break-words dark:prose-invert [&_img]:max-w-full [&_pre]:max-w-full"
              aria-readonly
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  )
}

export function DescriptionRenderer({ content }: Props) {
  if (isLexicalJson(content)) {
    return <RichTextRenderer json={content} />
  }

  // Fallback: plain text (old listings)
  return (
    <div className="min-w-0 max-w-full break-words text-muted-foreground whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert leading-relaxed">
      {content}
    </div>
  )
}
