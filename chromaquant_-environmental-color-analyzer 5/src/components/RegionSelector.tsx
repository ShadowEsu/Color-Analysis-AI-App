import React, { useState, useRef, useEffect } from 'react';
import { Region } from '../types';

interface RegionSelectorProps {
  imageSrc: string;
  regions: Region[];
  onRegionsChange: (regions: Region[]) => void;
  activeRegionId: string | null;
  onActiveRegionChange: (id: string | null) => void;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  imageSrc,
  regions,
  onRegionsChange,
  activeRegionId,
  onActiveRegionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activeRegionId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setStartPos({ x, y });
    setIsDrawing(true);

    const updatedRegions = regions.map((r) =>
      r.id === activeRegionId
        ? { ...r, x, y, width: 0, height: 0 }
        : r
    );
    onRegionsChange(updatedRegions);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !activeRegionId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    const updatedRegions = regions.map((r) =>
      r.id === activeRegionId
        ? { ...r, x, y, width, height }
        : r
    );
    onRegionsChange(updatedRegions);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      onActiveRegionChange(null);
    }
  };

  const getRegionColor = (id: string) => {
    switch (id) {
      case 'refA': return 'border-blue-500 bg-blue-500/20';
      case 'refB': return 'border-purple-500 bg-purple-500/20';
      case 'test': return 'border-amber-500 bg-amber-500/20';
      case 'control': return 'border-white bg-white/20';
      default: return 'border-gray-500 bg-gray-500/20';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden cursor-crosshair select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img 
        src={imageSrc} 
        alt="Analysis target" 
        className="w-full h-full object-contain pointer-events-none"
        referrerPolicy="no-referrer"
      />
      
      {regions.map((region) => (
        region.width > 0 && region.height > 0 && (
          <div
            key={region.id}
            className={`absolute border-2 ${getRegionColor(region.id)} flex items-start justify-start p-1`}
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
          >
            <span className="text-[10px] font-bold bg-black/50 text-white px-1 rounded uppercase tracking-tighter">
              {region.label}
            </span>
          </div>
        )
      ))}

      {activeRegionId && !isDrawing && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
          <p className="text-white font-medium text-sm">Click and drag to define {regions.find(r => r.id === activeRegionId)?.label}</p>
        </div>
      )}
    </div>
  );
};
