"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionLineType,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useBoardSocket } from "@/hooks/useBoardSocket";
import TableNode from "./TableNode";
import AddTableDialog, { type TableStyle } from "./AddTableDialog";
import { BoardActionsContext } from "@/contexts/BoardActionsContext";

const nodeTypes = { table: TableNode };

let nodeIdCounter = 0;

type LineStyle = "straight" | "smoothstep";

const LINE_STYLE_OPTIONS: { value: LineStyle; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "smoothstep", label: "Elbowed" },
];

export default function BoardCanvas({ boardId }: { boardId: string }) {
  const { nodes: remoteNodes, edges: remoteEdges, connected, sendUpdate } = useBoardSocket(boardId);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  // Applies to new connections going forward, not retroactively to
  // existing edges — each edge keeps whatever style it had when it was
  // drawn (stored per-edge as its `type`, persisted with the board).
  const [lineStyle, setLineStyle] = useState<LineStyle>("straight");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Whenever the server sends a fresh snapshot (the initial sync, or
  // another collaborator's change arriving over the socket), replace local
  // state with it. This is a "last write wins" model — simple, and fine
  // for a first collaborative pass, though it means an update from someone
  // else can interrupt an in-progress local drag before it's released.
  useEffect(() => {
    setNodes(remoteNodes as Node[]);
    setEdges(remoteEdges as Edge[]);
  }, [remoteNodes, remoteEdges]);

  // Local drag feedback updates on every intermediate frame, for smooth
  // dragging — but nothing is broadcast here. Only onNodeDragStop/onConnect
  // (below) send an update, so the socket isn't flooded with a message per
  // pixel of movement.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge({ ...connection, type: lineStyle }, current);
        sendUpdate(nodes, next);
        return next;
      });
    },
    [nodes, sendUpdate, lineStyle]
  );

  const onNodeDragStop = useCallback(() => {
    sendUpdate(nodes, edges);
  }, [nodes, edges, sendUpdate]);

  const handleCreateTable = (style: TableStyle) => {
    nodeIdCounter += 1;
    const newNode: Node = {
      id: `node-${Date.now()}-${nodeIdCounter}`,
      type: "table",
      // No explicit width/height set here — the node renders at its
      // natural content size (the "default shape") until a user actually
      // drags a resize handle, per the resizeNode action below.
      position: { x: 100, y: 100 },
      data: { ...style },
    };

    const next = [...nodes, newNode];
    setNodes(next);
    sendUpdate(next, edges);
    setShowAddDialog(false);
  };

  // Passed to TableNode instances via BoardActionsContext, since a node
  // can't hold a reference to these functions in its own `data` (data gets
  // JSON-serialized for the socket/DB).
  const renameNode = useCallback(
    (id: string, label: string) => {
      setNodes((current) => {
        const next = current.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n));
        sendUpdate(next, edges);
        return next;
      });
    },
    [edges, sendUpdate]
  );

  const restyleNode = useCallback(
    (id: string, style: TableStyle) => {
      setNodes((current) => {
        const next = current.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...style } } : n));
        sendUpdate(next, edges);
        return next;
      });
    },
    [edges, sendUpdate]
  );

  const resizeNode = useCallback(
    (id: string, width: number, height: number) => {
      setNodes((current) => {
        // width/height go on the node itself (what React Flow actually
        // uses to size the rendered wrapper), not inside `data` — data is
        // just the table's content/styling, not layout React Flow reads.
        const next = current.map((n) => (n.id === id ? { ...n, width, height } : n));
        sendUpdate(next, edges);
        return next;
      });
    },
    [edges, sendUpdate]
  );

  const boardActions = { renameNode, restyleNode, resizeNode };

  return (
    <BoardActionsContext.Provider value={boardActions}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddDialog(true)}
              className="text-sm rounded-md px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
            >
              Add table
            </button>

            <div className="flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden">
              {LINE_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLineStyle(option.value)}
                  className={
                    lineStyle === option.value
                      ? "text-sm px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-sm px-3 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-neutral-400 dark:text-neutral-600">
            {connected ? "Connected — live" : "Connecting..."}
          </span>
        </div>

        <div className="h-[70vh] rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            connectionLineType={
              lineStyle === "straight" ? ConnectionLineType.Straight : ConnectionLineType.SmoothStep
            }
            connectionMode={ConnectionMode.Loose}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {showAddDialog && (
          <AddTableDialog onSubmit={handleCreateTable} onClose={() => setShowAddDialog(false)} />
        )}
      </div>
    </BoardActionsContext.Provider>
  );
}
