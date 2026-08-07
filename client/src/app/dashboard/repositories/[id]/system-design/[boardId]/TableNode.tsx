import { useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import AddTableDialog from "./AddTableDialog";
import { useBoardActions } from "./board-context";

// Every handle is type="source" — combined with connectionMode="loose" on
// <ReactFlow> (set in BoardCanvas.tsx), this lets a connection be dragged
// from or to any side, rather than being restricted to "drag from a source
// handle, drop on a target handle."
const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

export default function TableNode({ id, data, selected }: NodeProps) {
  const { renameNode, restyleNode, resizeNode } = useBoardActions();
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(data.label as string);
  const [showStyleDialog, setShowStyleDialog] = useState(false);

  const commitLabel = () => {
    setEditingLabel(false);
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== data.label) {
      renameNode(id, trimmed);
    } else {
      setLabelDraft(data.label as string);
    }
  };

  return (
    <div
      className="relative rounded-md border border-neutral-300 dark:border-neutral-700 px-4 py-2 font-medium text-center h-full w-full min-w-[120px] min-h-[44px] flex items-center justify-center"
      style={{
        backgroundColor: (data.bgColor as string) ?? "#ffffff",
        color: (data.textColor as string) ?? "#171717",
        fontFamily: (data.fontFamily as string) ?? undefined,
        fontSize: (data.fontSize as string) ?? "14px",
      }}
    >
      {/* Only interactive while selected, so it doesn't get in the way of
          normal dragging/connecting the rest of the time. */}
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={44}
        onResizeEnd={(_event, params) => resizeNode(id, params.width, params.height)}
      />

      {SIDES.map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={side}
          className="!h-2 !w-2 !bg-neutral-400 dark:!bg-neutral-500"
        />
      ))}

      {/* nodrag/nopan: without these, interacting with the input/button
          would be swallowed by React Flow's node-drag and canvas-pan
          gesture handlers instead of reaching these elements. */}
      {editingLabel ? (
        <input
          autoFocus
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitLabel();
            if (e.key === "Escape") {
              setLabelDraft(data.label as string);
              setEditingLabel(false);
            }
          }}
          className="nodrag nopan w-full bg-transparent text-center outline-none border-b border-current"
        />
      ) : (
        <span onDoubleClick={() => setEditingLabel(true)}>{data.label as string}</span>
      )}

      {selected && !editingLabel && (
        <button
          type="button"
          onClick={() => setShowStyleDialog(true)}
          title="Edit style"
          className="nodrag nopan absolute -top-3 -right-3 h-6 w-6 rounded-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs flex items-center justify-center shadow"
        >
          ✎
        </button>
      )}

      {showStyleDialog && (
        <AddTableDialog
          initial={{
            label: data.label as string,
            bgColor: data.bgColor as string,
            textColor: data.textColor as string,
            fontFamily: data.fontFamily as string,
            fontSize: data.fontSize as string,
          }}
          submitLabel="Save"
          onSubmit={(style) => {
            restyleNode(id, style);
            setShowStyleDialog(false);
          }}
          onClose={() => setShowStyleDialog(false)}
        />
      )}
    </div>
  );
}
