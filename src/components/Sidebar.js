import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';

const MODALITY_COLORS = {
  CT: '#1a2a3a', MR: '#1a2d1a', PT: '#2d1a1a', US: '#1a1a2d',
  XA: '#2d2a1a', CR: '#2a1a2a', DX: '#2a1a2a', NM: '#2d1a2a', OT: '#222',
};
const MODALITY_DOT = {
  CT: '#4aa8ff', MR: '#4aff88', PT: '#ff6b4a', US: '#ffe44a',
  XA: '#ffb84a', CR: '#b84aff', DX: '#b84aff', NM: '#ff4ab8', OT: '#888',
};

/** Tiny SVG thumbnail placeholder per modality */
const ModalityThumbnail = ({ modality, index }) => {
  const bg = MODALITY_COLORS[modality] || '#1a1a1a';
  const dot = MODALITY_DOT[modality] || '#888';
  return (
    <svg width="100%" height="100%" viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="60" fill={bg} />
      {modality === 'CT' && <>
        <ellipse cx="40" cy="30" rx="24" ry="20" fill="none" stroke="#2a4a6a" strokeWidth="2"/>
        <ellipse cx="29" cy="28" rx="7" ry="9" fill="#0a1520"/>
        <ellipse cx="51" cy="28" rx="7" ry="9" fill="#0a1520"/>
        <rect x="35" y="22" width="10" height="16" fill="#0d1a28" rx="1"/>
        <rect x="37" y="26" width="6" height="8" fill="#1e3550" rx="1"/>
      </>}
      {modality === 'MR' && <>
        <ellipse cx="40" cy="30" rx="22" ry="18" fill="#0d2210" stroke="#2a6a3a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="30" rx="10" ry="12" fill="#122a14"/>
        <ellipse cx="40" cy="27" rx="5" ry="4" fill="#1a4020"/>
      </>}
      {(modality !== 'CT' && modality !== 'MR') && <>
        <rect x="10" y="10" width="60" height="40" rx="3" fill="none" stroke={dot} strokeWidth="1" opacity="0.4"/>
        <circle cx="40" cy="30" r="12" fill="none" stroke={dot} strokeWidth="1.5" opacity="0.5"/>
        <text x="40" y="34" textAnchor="middle" fill={dot} fontSize="10" fontWeight="bold" opacity="0.8">{modality}</text>
      </>}
      <text x="4" y="57" fill="#90ee90" fontSize="8" fontFamily="monospace" opacity="0.9">{index + 1}</text>
    </svg>
  );
};

const Sidebar = ({ seriesList, activeSeries, onSelectSeries, onOpenFiles }) => {
  const [collapsed, setCollapsed] = useState(false);

  const hasSeries = seriesList.length > 0;
  const study = hasSeries ? seriesList[0] : null;

  return (
    <div style={{
      width: collapsed ? '40px' : '230px',
      minWidth: collapsed ? '40px' : '230px',
      background: '#1a1a1a',
      borderRight: '1px solid #2a2a2a',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      userSelect: 'none',
      transition: 'width 0.2s, min-width 0.2s',
      overflow: 'hidden',
    }}>
      {collapsed ? (
        <button onClick={() => setCollapsed(false)} style={{ ...iconBtn, marginTop: 8, alignSelf: 'center' }} title="Show sidebar">
          <span style={{ fontSize: 16 }}>▶</span>
        </button>
      ) : (
        <>
          {/* Header */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a', background: '#222', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {study ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {study.patientName || 'Unknown Patient'}
                  </div>
                  <div style={{ fontSize: 10, color: '#777', lineHeight: 1.6 }}>
                    <div>ID: {study.patientId || '—'}</div>
                    <div>{study.studyDate || ''}</div>
                    <div style={{ color: '#999', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {study.studyDesc || study.seriesDesc || ''}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#555' }}>No study loaded</div>
              )}
            </div>
            <button onClick={() => setCollapsed(true)} style={iconBtn} title="Collapse">◀</button>
          </div>

          {/* Open files CTA when empty */}
          {!hasSeries && (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.5 }}>
                Open DICOM files or drag and drop them here
              </div>
              <button onClick={onOpenFiles} style={openBtn}>
                <FolderOpen size={14} style={{ marginRight: 5 }} />
                Open Files
              </button>
            </div>
          )}

          {/* Series list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {seriesList.map((series, idx) => {
              const isActive = activeSeries?.seriesUID === series.seriesUID;
              return (
                <div
                  key={series.seriesUID}
                  onClick={() => onSelectSeries(series)}
                  className={`sidebar-series${isActive ? ' selected' : ''}`}
                >
                  <div style={{ height: 68, background: '#000', borderRadius: 2, marginBottom: 5, overflow: 'hidden', position: 'relative' }}>
                    <ModalityThumbnail modality={series.modality} index={idx} />
                    <div style={{
                      position: 'absolute', top: 2, right: 3,
                      fontSize: 9, color: '#aaa', background: 'rgba(0,0,0,0.7)',
                      padding: '1px 3px', borderRadius: 2, fontFamily: 'monospace',
                    }}>{series.modality}</div>
                    <div style={{
                      position: 'absolute', bottom: 2, right: 3,
                      fontSize: 9, color: '#90ee90', fontFamily: 'monospace',
                    }}>{series.instances.length}</div>
                  </div>
                  <div style={{ fontSize: 11, color: isActive ? '#fff' : '#ccc', paddingLeft: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {series.seriesDesc || `Series ${series.seriesNum}`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const iconBtn = {
  background: 'none', border: 'none', color: '#555',
  cursor: 'pointer', padding: '4px 6px', borderRadius: 3,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, transition: 'color 0.15s',
};

const openBtn = {
  display: 'flex', alignItems: 'center', padding: '6px 14px',
  background: '#0078d4', color: '#fff', border: 'none',
  borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600,
};

export default Sidebar;
