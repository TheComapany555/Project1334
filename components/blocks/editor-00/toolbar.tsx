"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $isRootOrShadowRoot,
  $createParagraphNode,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical"
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode,
} from "@lexical/list"
import { $isHeadingNode, $createHeadingNode, HeadingTagType } from "@lexical/rich-text"
import { $setBlocksType } from "@lexical/selection"
import { $findMatchingParent } from "@lexical/utils"
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link,
  Unlink,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Undo,
  Redo,
} from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function EditorToolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [blockType, setBlockType] = useState("paragraph")

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const linkInputRef = useRef<HTMLInputElement>(null)

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"))
      setIsItalic(selection.hasFormat("italic"))
      setIsUnderline(selection.hasFormat("underline"))
      setIsStrikethrough(selection.hasFormat("strikethrough"))

      const node = selection.anchor.getNode()
      const parent = node.getParent()
      setIsLink($isLinkNode(parent) || $isLinkNode(node))

      const anchorNode = selection.anchor.getNode()
      let element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent()
              return parent !== null && $isRootOrShadowRoot(parent)
            })
      if (element === null) element = anchorNode.getTopLevelElementOrThrow()

      if ($isListNode(element)) {
        const parentList = $findMatchingParent(anchorNode, $isListNode)
        const type = parentList
          ? (parentList as ListNode).getListType()
          : (element as ListNode).getListType()
        setBlockType(type === "number" ? "ol" : "ul")
      } else {
        const type = $isHeadingNode(element)
          ? element.getTag()
          : element.getType()
        setBlockType(type)
      }
    }
  }, [])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        $updateToolbar()
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor, $updateToolbar])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => $updateToolbar())
    })
  }, [editor, $updateToolbar])

  const formatHeading = (heading: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (blockType === heading) {
          $setBlocksType(selection, () => $createParagraphNode())
        } else {
          $setBlocksType(selection, () => $createHeadingNode(heading))
        }
      }
    })
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const formatBulletList = () => {
    if (blockType === "ul") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
    }
  }

  const formatNumberedList = () => {
    if (blockType === "ol") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
    }
  }

  const handleLinkClick = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    } else {
      setLinkUrl("https://")
      setLinkDialogOpen(true)
    }
  }

  const handleLinkSubmit = () => {
    const trimmed = linkUrl.trim()
    if (trimmed && trimmed !== "https://") {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmed)
    }
    setLinkDialogOpen(false)
    setLinkUrl("")
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        {/* Undo / Redo */}
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() =>
            editor.dispatchCommand(UNDO_COMMAND, undefined)
          }
          aria-label="Undo"
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={false}
          onPressedChange={() =>
            editor.dispatchCommand(REDO_COMMAND, undefined)
          }
          aria-label="Redo"
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Block type */}
        <Toggle
          size="sm"
          pressed={blockType === "paragraph"}
          onPressedChange={formatParagraph}
          aria-label="Paragraph"
          className="h-8 w-8 p-0"
        >
          <Pilcrow className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={blockType === "h1"}
          onPressedChange={() => formatHeading("h1")}
          aria-label="Heading 1"
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={blockType === "h2"}
          onPressedChange={() => formatHeading("h2")}
          aria-label="Heading 2"
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={blockType === "h3"}
          onPressedChange={() => formatHeading("h3")}
          aria-label="Heading 3"
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Text formatting */}
        <Toggle
          size="sm"
          pressed={isBold}
          onPressedChange={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
          }
          aria-label="Bold"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={isItalic}
          onPressedChange={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
          }
          aria-label="Italic"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={isUnderline}
          onPressedChange={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
          }
          aria-label="Underline"
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={isStrikethrough}
          onPressedChange={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
          }
          aria-label="Strikethrough"
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Lists */}
        <Toggle
          size="sm"
          pressed={blockType === "ul"}
          onPressedChange={formatBulletList}
          aria-label="Bullet list"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={blockType === "ol"}
          onPressedChange={formatNumberedList}
          aria-label="Numbered list"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Link */}
        <Toggle
          size="sm"
          pressed={isLink}
          onPressedChange={handleLinkClick}
          aria-label={isLink ? "Remove link" : "Insert link"}
          className="h-8 w-8 p-0"
        >
          {isLink ? <Unlink className="h-4 w-4" /> : <Link className="h-4 w-4" />}
        </Toggle>
      </div>

      {/* Link insert dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert link</DialogTitle>
            <DialogDescription>
              Enter the URL for the link. The selected text will become
              clickable.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLinkSubmit()
            }}
          >
            <div className="space-y-3 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  ref={linkInputRef}
                  id="link-url"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLinkDialogOpen(false)
                  setLinkUrl("")
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Insert link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
