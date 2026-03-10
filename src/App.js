import React, { useState, useCallback, useRef } from 'react';
import dicomParser from 'dicom-parser';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import Viewport from './components/Viewport';

/** Filter only DICOM files from a FileList (folder may contain thumbnails etc.) */
function filterDicomFiles(files) {
  return files.filter(f =>
    f.name.toLowerCase().endsWith('.dcm') ||
    f.name.toLowerCase().endsWith('.ima') ||
    f.type === 'application/dicom' ||
    // Accept files with no extension (raw DICOM from PACS)
    (!f.name.includes('.') && f.size > 128)
  );
}

/** Extract a string tag safely */
function getTag(ds, tag) {
  try { return (ds.string(tag) || '').trim(); } catch (_) { return ''; }
}

/** Parse all dropped / selected DICOM files → group by series */
async function parseDicomFiles(files) {
  const seriesMap = {};

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      const byteArray = new Uint8Array(buffer);
      const ds = dicomParser.parseDicom(byteArray);

      const seriesUID  = getTag(ds, 'x0020000e') || file.name;
      const seriesNum  = getTag(ds, 'x00200011') || '?';
      const sopUID     = getTag(ds, 'x00080018') || file.name;
      const instanceNum = parseInt(getTag(ds, 'x00200013'), 10) || 0;
      const modality   = getTag(ds, 'x00080060') || 'OT';
      const seriesDesc = getTag(ds, 'x0008103e') || `Series ${seriesNum}`;
      const patientName = getTag(ds, 'x00100010') || 'Unknown';
      const patientId  = getTag(ds, 'x00100020') || '';
      const studyDate  = getTag(ds, 'x00080020') || '';
      const studyDesc  = getTag(ds, 'x00081030') || '';
      const studyUID   = getTag(ds, 'x0020000d') || '';
      const ww         = parseFloat(getTag(ds, 'x00281051')) || null;
      const wl         = parseFloat(getTag(ds, 'x00281050')) || null;
      const rows       = parseInt(getTag(ds, 'x00280010'), 10) || 0;
      const cols       = parseInt(getTag(ds, 'x00280011'), 10) || 0;
      const pixelSpacing = getTag(ds, 'x00280030') || '';

      const wadoUri = `wadouri:objecturl:${sopUID}`;
      const objectUrl = URL.createObjectURL(file);

      if (!seriesMap[seriesUID]) {
        seriesMap[seriesUID] = {
          seriesUID,
          seriesNum,
          seriesDesc,
          modality,
          patientName,
          patientId,
          studyDate,
          studyDesc,
          studyUID,
          instances: [],
        };
      }
      seriesMap[seriesUID].instances.push({
        sopUID,
        instanceNum,
        wadoUri,
        objectUrl,
        rows,
        cols,
        ww,
        wl,
        pixelSpacing,
      });
    } catch (e) {
      console.warn('[parseDicomFiles] skip file', file.name, e.message);
    }
  }

  // Sort instances by instance number within each series
  for (const s of Object.values(seriesMap)) {
    s.instances.sort((a, b) => a.instanceNum - b.instanceNum);
  }

  return Object.values(seriesMap);
}

// Override the cornerstone image loader resolver so wadouri:objecturl:uid → objectUrl
const objectUrlMap = {};

function App() {
  const [activeTool, setActiveTool] = useState('Wwwc');
  const [seriesList, setSeriesList] = useState([]);       // [{seriesUID, instances, ...}]
  const [activeSeries, setActiveSeries] = useState(null); // {seriesUID, instances, ...}
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef   = useRef(null);
  const folderInputRef = useRef(null);

  const handleFiles = useCallback(async (rawFiles) => {
    if (!rawFiles || rawFiles.length === 0) return;
    // Filter to DICOM only (important for folder picks that contain non-DICOM files)
    const files = rawFiles.length > 10 ? filterDicomFiles(rawFiles) : rawFiles;
    if (files.length === 0) {
      alert('No DICOM files found. Please select .dcm files or a DICOM folder.');
      return;
    }
    setLoading(true);
    try {
      const parsed = await parseDicomFiles(files);
      if (parsed.length === 0) {
        alert('Could not parse any DICOM files.');
        return;
      }
      parsed.forEach(s =>
        s.instances.forEach(inst => { objectUrlMap[inst.sopUID] = inst.objectUrl; })
      );
      setSeriesList(parsed);
      setActiveSeries(parsed[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onFileInputChange = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const onFolderInputChange = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    const files = [];
    for (const item of items) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
    handleFiles(files);
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const openFilePicker = () => fileInputRef.current?.click();
  const openFolderPicker = () => folderInputRef.current?.click();

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw', background: '#111', overflow: 'hidden' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Drag-drop overlay */}
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,120,212,0.25)',
          border: '3px dashed #0078d4', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#0078d4', fontSize: 24, fontWeight: 700 }}>
            Drop DICOM files here
          </span>
        </div>
      )}

      {/* File picker (individual files) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dcm,application/dicom,.ima"
        multiple
        style={{ display: 'none' }}
        onChange={onFileInputChange}
      />
      {/* Folder picker */}
      <input
        ref={folderInputRef}
        type="file"
        style={{ display: 'none' }}
        // eslint-disable-next-line react/no-unknown-property
        webkitdirectory=""
        onChange={onFolderInputChange}
      />

      <Sidebar
        seriesList={seriesList}
        activeSeries={activeSeries}
        onSelectSeries={setActiveSeries}
        onOpenFiles={openFilePicker}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Toolbar
          activeTool={activeTool}
          onToolSelect={setActiveTool}
          onOpenFiles={openFilePicker}
          onOpenFolder={openFolderPicker}
          hasSeries={seriesList.length > 0}
          loading={loading}
        />
        <main style={{ flex: 1, background: '#000', position: 'relative', overflow: 'hidden' }}>
          {activeSeries ? (
            <Viewport activeTool={activeTool} series={activeSeries} objectUrlMap={objectUrlMap} />
          ) : (
            <WelcomeScreen onOpenFiles={openFilePicker} />
          )}
        </main>
      </div>
    </div>
  );
}

function WelcomeScreen({ onOpenFiles }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: '#555', userSelect: 'none',
    }}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 20 }}>
        <circle cx="40" cy="40" r="38" stroke="#333" strokeWidth="2"/>
        <rect x="22" y="24" width="36" height="32" rx="3" stroke="#444" strokeWidth="2"/>
        <path d="M22 32h36M30 24v8" stroke="#444" strokeWidth="2"/>
        <circle cx="40" cy="46" r="7" stroke="#0078d4" strokeWidth="2"/>
        <path d="M37 46h6M40 43v6" stroke="#0078d4" strokeWidth="2"/>
      </svg>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#888', marginBottom: 8 }}>
        No study loaded
      </div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 20, textAlign: 'center', maxWidth: 300 }}>
        Open DICOM files from the toolbar or drag and drop files anywhere on this window.
      </div>
      <button
        onClick={onOpenFiles}
        style={{
          padding: '9px 24px', background: '#0078d4', color: '#fff',
          border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer',
          fontWeight: 600, letterSpacing: 0.3,
        }}
      >
        Open DICOM Files
      </button>
    </div>
  );
}

export default App;
