"use client";

import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';
import { 
  MousePointer2, 
  Hand, 
  Maximize2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const nodeTypes = {
  customNode: CustomNode,
};

interface FlowCanvasProps {
  initialNodes: any[];
  initialEdges: any[];
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: any) => void;
  onNodeDragStop?: (event: any, node: any) => void;
  saving?: boolean;
}

export function FlowCanvas({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStop,
  saving
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  const handleConnect = useCallback(
    (params: Connection) => {
      onConnect(params);
      setEdges((eds) => addEdge(params, eds));
    },
    [onConnect, setEdges]
  );

    return (
      <div className="h-full w-full relative bg-[#f6f6f7]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChangeInternal(changes);
            onNodesChange(changes);
          }}
          onEdgesChange={(changes) => {
            onEdgesChangeInternal(changes);
            onEdgesChange(changes);
          }}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          onConnect={handleConnect}
          onNodeClick={onNodeClick}
          fitView
          className="bg-[#f6f6f7]"
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2, stroke: '#d2d2d2' },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#d2d2d2" />
          <Controls 
            showInteractive={false} 
            className="bg-white border-[#d2d2d2] shadow-sm rounded-lg overflow-hidden !m-4" 
          />
          <MiniMap 
            nodeStrokeWidth={3} 
            zoomable 
            pannable 
            className="!bg-white !border-[#d2d2d2] !shadow-sm !rounded-lg overflow-hidden !m-4"
            nodeColor={(node: any) => {
              switch (node.data?.type) {
                case 'question': return '#008060';
                case 'product': return '#008060';
                case 'ai': return '#202223';
                default: return '#5c5f62';
              }
            }}
          />
        
        <Panel position="top-right" className="flex gap-2">
          <div className="bg-white p-1 rounded border border-[#d2d2d2] shadow-sm flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#202223]">
              <MousePointer2 className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#5c5f62]">
              <Hand className="w-3.5 h-3.5" />
            </Button>
            <div className="w-px h-3 bg-[#d2d2d2] mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#5c5f62]">
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Panel>

        <Panel position="bottom-center" className="mb-4">
          <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded border border-[#d2d2d2] shadow-sm">
            <div className="flex items-center gap-2 pr-4 border-r border-[#d2d2d2]">
              <div className="w-2 h-2 rounded-full bg-[#008060]" />
              <span className="text-[10px] font-bold text-[#5c5f62] uppercase tracking-wider">Ready</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#6d7175] uppercase">Nodes</span>
                <span className="text-xs font-semibold text-[#202223]">{nodes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#6d7175] uppercase">Connections</span>
                <span className="text-xs font-semibold text-[#202223]">{edges.length}</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
