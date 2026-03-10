import React from 'react';
import { 
  FolderOpen, FolderSearch, Save, Hand, ZoomIn, Sun, Ruler, Activity,
  Grid, Box, Settings, Info, Play, RotateCcw, FlipHorizontal,
  Minus, Plus, Maximize, Layers
} from 'lucide-react';

const toolGroups = [
  [
    { id: 'open',   icon: FolderOpen,   label: 'Open',   isAction: true },
    { id: 'folder', icon: FolderSearch, label: 'Folder', isAction: true },
    { id: 'export', icon: Save,         label: 'Export', isAction: true },
  ],
  [
    { id: 'Pan',    icon: Hand,          label: 'Pan' },
    { id: 'Zoom',   icon: ZoomIn,        label: 'Zoom' },
    { id: 'Wwwc',   icon: Sun,           label: 'W/L' },
  ],
  [
    { id: 'Length', icon: Ruler,         label: 'Length' },
    { id: 'Angle',  icon: Activity,      label: 'Angle' },
  ],
  [
    { id: 'Rotate', icon: RotateCcw,     label: 'Rotate',  isAction: true },
    { id: 'Flip',   icon: FlipHorizontal,label: 'Flip',    isAction: true },
  ],
  [
    { id: 'mpr',    icon: Grid,          label: 'MPR',     isAction: true },
    { id: '3d',     icon: Box,           label: '3D Vol',  isAction: true },
    { id: 'fusion', icon: Layers,        label: 'Fusion',  isAction: true },
  ],
  [
    { id: 'play',   icon: Play,          label: 'Cine',    isAction: true },
  ],
];

const Toolbar = ({ activeTool, onToolSelect, onOpenFiles, onOpenFolder, hasSeries, loading }) => {
  const handleClick = (tool) => {
    if (tool.id === 'open')   { onOpenFiles?.();  return; }
    if (tool.id === 'folder') { onOpenFolder?.(); return; }
    onToolSelect(tool.id);
  };

  return (
    <div style={{
      background: '#1e1e1e',
      borderBottom: '1px solid #2a2a2a',
      height: '54px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 6px',
      userSelect: 'none',
      flexShrink: 0,
      gap: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 10px', borderRight: '1px solid #333',
        height: '100%', marginRight: 6
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="#0078d4" strokeWidth="1.5"/>
          <path d="M4 10a6 6 0 0 1 12 0" stroke="#0078d4" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="10" cy="10" r="2.5" fill="#0078d4"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#4aa8ff', letterSpacing: 0.5 }}>RadiAnt</span>
        {loading && (
          <span style={{ fontSize: 10, color: '#aaa', marginLeft: 4, animation: 'spin 1s linear infinite' }}>
            Loading…
          </span>
        )}
      </div>

      {toolGroups.map((group, gIdx) => (
        <React.Fragment key={gIdx}>
          {group.map((tool) => {
            const Icon = tool.icon;
            const isActive = !tool.isAction && activeTool === tool.id;
            const disabled = !hasSeries && !tool.isAction;

            return (
              <button
                key={tool.id}
                title={tool.label}
                onClick={() => handleClick(tool)}
                disabled={disabled}
                className="tool-btn"
                style={{
                  ...(isActive ? { background: '#0078d4', color: '#fff' } : {}),
                  ...(disabled ? { opacity: 0.3, cursor: 'not-allowed' } : {}),
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ fontSize: 9 }}>{tool.label}</span>
              </button>
            );
          })}
          {gIdx < toolGroups.length - 1 && <div className="divider-v" />}
        </React.Fragment>
      ))}

      {/* Right-side actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>
        {[
          { icon: Minus,    label: 'Zoom Out' },
          { icon: Plus,     label: 'Zoom In' },
          { icon: Maximize, label: 'Fit to Window' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="tool-btn" title={label} disabled={!hasSeries} style={!hasSeries ? { opacity: 0.3 } : {}}>
            <Icon size={16} strokeWidth={1.8} />
          </button>
        ))}
        <div className="divider-v" />
        <button className="tool-btn" title="Settings"><Settings size={16} /></button>
        <button className="tool-btn" title="About"><Info size={16} /></button>
      </div>
    </div>
  );
};

export default Toolbar;
