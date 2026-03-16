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

export function AdContentRenderer({ content }: Props) {
  const editorState = useMemo(() => {
    try {
      JSON.parse(content) // validate JSON
      return content
    } catch {
      return null
    }
  }, [content])

  if (!editorState) return null

  const config: InitialConfigType = {
    namespace: "AdRenderer",
    theme: editorTheme,
    nodes,
    editable: false,
    editorState,
    onError: (error: Error) => {
      console.error("Ad renderer error:", error)
    },
  }

  return (
    <LexicalComposer initialConfig={config}>
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="outline-none px-4 py-3 sm:px-6 sm:py-4 text-sm"
            aria-readonly
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}
