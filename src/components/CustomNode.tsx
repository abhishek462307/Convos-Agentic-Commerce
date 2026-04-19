"use client";

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  MessageSquare, 
  Package, 
  Tag, 
  ShoppingCart, 
  Zap,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';

const icons: Record<string, any> = {
  question: MessageSquare,
  product: Package,
  promotion: Tag,
  cart: ShoppingCart,
  ai: BrainCircuit,
};

export const CustomNode = memo(({ data, selected }: any) => {
  const Icon = icons[data.type] || MessageSquare;
  const isQuestion = data.type === 'question';

    return (
      <div className={`
        relative min-w-[260px] bg-white rounded-xl border transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.1)]
        ${selected ? 'border-[#008060] ring-2 ring-[#008060]/10 shadow-[0_4px_12px_rgba(0,128,96,0.15)]' : 'border-[#d2d2d2] hover:border-[#b2b2b2] hover:shadow-md'}
      `}>
        {/* Target Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 border-2 border-white bg-[#d2d2d2] !-top-1.5 transition-colors shadow-sm"
        />

        {/* Header */}
        <div className="p-3.5 border-b border-[#f1f1f1] flex items-center gap-3 bg-[#f9f9f9] rounded-t-xl">
          <div className={`p-2 rounded-lg bg-white border border-[#ebebeb] text-[#202223] shadow-sm`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[12px] font-bold text-[#202223] truncate leading-tight capitalize tracking-tight">
              {data.type} Node
            </p>
            <p className="text-[10px] text-[#6d7175] font-semibold uppercase tracking-wider opacity-70">
              ID: {data.id.slice(0, 6)}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4">
          <p className="text-[13px] text-[#202223] font-medium line-clamp-3 leading-relaxed">
            {data.content || 'Start typing a message...'}
          </p>
        </div>

        {/* Options Area */}
        {isQuestion && (
          <div className="px-4 pb-4 space-y-2">
            {data.options && data.options.length > 0 ? (
              data.options.map((option: any) => (
                <div key={option.id} className="relative group/option">
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-[#ebebeb] bg-white text-[12px] font-semibold text-[#202223] hover:border-[#008060] hover:bg-[#f1f8f5] transition-all cursor-pointer shadow-sm group-hover/option:shadow">
                    <span className="truncate pr-5">{option.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#bababa] group-hover/option:text-[#008060]" />
                  </div>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={option.id}
                    className="w-3 h-3 border-2 border-white bg-[#008060] !right-[-6px] shadow-sm transition-transform hover:scale-125"
                  />
                </div>
              ))
            ) : (
              <div className="py-4 px-3 border-2 border-dashed border-[#ebebeb] rounded-xl bg-[#fafafa]">
                <p className="text-[10px] text-[#bababa] font-bold uppercase tracking-widest text-center">
                  Add options to branch
                </p>
              </div>
            )}
          </div>
        )}

        {/* Default Source Handle for non-branching nodes */}
        {!isQuestion && (
          <Handle
            type="source"
            position={Position.Bottom}
            id="next"
            className="w-3.5 h-3.5 border-2 border-white bg-[#008060] !-bottom-[7px] shadow-sm transition-transform hover:scale-125"
          />
        )}
      </div>
    );
});

CustomNode.displayName = 'CustomNode';
