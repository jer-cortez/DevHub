"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import { useBoardSocket } from "@/lib/useBoardSocket";

let nodeIdCounter = 0;

export default function BoardCanvas({ boardId }: { boardId: string }) {
  const { nodes: remoteNodes, edges: remoteEdges, connected, sendUpdate } = useBoardSocket(boardId);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

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
        const next = addEdge(connection, current);
        sendUpdate(nodes, next);
        return next;
      });
    },
    [nodes, sendUpdate]
  );

  const onNodeDragStop = useCallback(() => {
    sendUpdate(nodes, edges);
  }, [nodes, edges, sendUpdate]);

  const handleAddNode = () => {
    const label = window.prompt("Table name", "NewTable");
    if (!label) return;

    nodeIdCounter += 1;
    const newNode: Node = {
      id: `node-${Date.now()}-${nodeIdCounter}`,
      position: { x: 100, y: 100 },
      data: { label },
    };

    const next = [...nodes, newNode];
    setNodes(next);
    sendUpdate(next, edges);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={handleAddNode}
          className="text-sm rounded-md px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Add table
        </button>
        <span className="text-xs text-neutral-400 dark:text-neutral-600">
          {connected ? "Connected — live" : "Connecting..."}
        </span>
      </div>

      <div className="h-[70vh] rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
