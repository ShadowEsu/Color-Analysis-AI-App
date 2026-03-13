import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertCircle, Info, ChevronRight, Beaker, History, Trash2, X, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Region, AnalysisResult, HistoryItem } from './types';
import { RegionSelector } from './components/RegionSelector';
import { analyzeColor } from './services/geminiService';

const INITIAL_REGIONS: Region[] = [
  { id: 'refA', label: 'Reference A', x: 0, y: 0, width: 0, height: 0 },
  { id: 'refB', label: 'Reference B', x: 0, y: 0, width: 0, height: 0 },
  { id: 'test', label: 'Test Color', x: 0, y: 0, width: 0, height: 0 },
  { id: 'control', label: 'Control (White)', x: 0, y: 0, width: 0, height: 0 },
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>(INITIAL_REGIONS);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [valueA, setValueA] = useState<number>(0);
  const [valueB, setValueB] = useState<number>(100);
  const [title, setTitle] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setResult(null);
        setRegions(INITIAL_REGIONS);
      };
      reader.readAsDataURL(file);
    }
  };

  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      try {
        // Fallback to any camera if environment fails
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(fallbackStream);
        setShowCamera(true);
      } catch (fallbackErr) {
        setError("Could not access camera. Please check permissions.");
      }
    }
  };

  // Attach stream to video element when both are available
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  const capturePhoto = () => {
    if (videoRef.current && stream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImage(dataUrl);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setShowCamera(false);
      setResult(null);
      setRegions(INITIAL_REGIONS);
    }
  };

  const handleAnalyze = async () => {
    const missingRegions = regions.filter(r => r.width === 0);
    if (missingRegions.length > 0) {
      setError(`Please define all regions: ${missingRegions.map(r => r.label).join(', ')}`);
      return;
    }

    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const analysisResult = await analyzeColor(image, regions, valueA, valueB);
      setResult(analysisResult);
      
      // Save to history
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `Analysis ${new Date().toLocaleTimeString()}`,
          image,
          regions,
          valueA,
          valueB,
          result: analysisResult
        })
      });
      loadHistory();
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const deleteHistoryItem = async (id: number) => {
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' });
      loadHistory();
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    setTitle(item.title);
    setImage(item.image);
    setRegions(item.regions);
    setValueA(item.valueA);
    setValueB(item.valueB);
    setResult(item.result);
    setShowHistory(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const reset = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setImage(null);
    setRegions(INITIAL_REGIONS);
    setResult(null);
    setError(null);
    setTitle("");
    setShowCamera(false);
  };

  const allRegionsDefined = regions.every(r => r.width > 0);

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center">
        <div>
          <h1 className="font-serif italic text-2xl tracking-tight">ChromaQuant <span className="text-xs font-mono not-italic opacity-50 ml-2">v1.0.4</span></h1>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-60 mt-1">Quantitative Environmental Color Analysis System</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 text-[11px] font-mono uppercase border border-[#141414] px-3 py-1.5 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
          >
            <History size={14} /> History ({history.length})
          </button>
          {image && (
            <button 
              onClick={reset}
              className="flex items-center gap-2 text-[11px] font-mono uppercase border border-[#141414] px-3 py-1.5 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
            >
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {!image ? (
            <div className="aspect-video border-2 border-dashed border-[#141414]/20 rounded-xl flex flex-col items-center justify-center gap-6 bg-white/50">
              {showCamera ? (
                <div className="relative w-full h-full">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-xl" />
                  <button 
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#141414] text-[#E4E3E0] px-8 py-3 rounded-full font-mono uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                  >
                    Capture
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-4">
                    <button 
                      onClick={startCamera}
                      className="flex flex-col items-center gap-3 p-8 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group"
                    >
                      <Camera size={32} className="group-hover:scale-110 transition-transform" />
                      <span className="font-mono text-[10px] uppercase tracking-widest">Use Camera</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-8 border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-[#E4E3E0] transition-all group"
                    >
                      <Upload size={32} className="group-hover:scale-110 transition-transform" />
                      <span className="font-mono text-[10px] uppercase tracking-widest">Upload Photo</span>
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <RegionSelector 
                imageSrc={image}
                regions={regions}
                onRegionsChange={setRegions}
                activeRegionId={activeRegionId}
                onActiveRegionChange={setActiveRegionId}
              />
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setActiveRegionId(region.id)}
                    className={`p-3 border text-left transition-all ${
                      activeRegionId === region.id 
                        ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                        : region.width > 0 
                          ? 'bg-white border-[#141414] opacity-100' 
                          : 'bg-white/50 border-[#141414]/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-tighter opacity-70">Region</span>
                      {region.width > 0 && <CheckCircle2 size={10} className="text-emerald-500" />}
                    </div>
                    <span className="text-xs font-bold block truncate">{region.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Configuration */}
          <div className="space-y-4">
            <div className="bg-white border border-[#141414] p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-[#141414]/10 pb-3">
                <Info size={14} className="opacity-40" />
                <h3 className="font-serif italic text-sm">Dataset Information</h3>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Dataset Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., River Sample 04-B"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#E4E3E0]/30 border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reference A Card */}
              <div className="bg-white border border-[#141414] p-5 rounded-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div className="flex items-center justify-between border-b border-[#141414]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h3 className="font-serif italic text-sm">Reference A</h3>
                  </div>
                  <span className="text-[9px] font-mono uppercase opacity-40">Endpoint 01</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest opacity-60">Calibration Value</label>
                  <input 
                    type="number" 
                    value={valueA}
                    onChange={(e) => setValueA(Number(e.target.value))}
                    className="w-full bg-[#E4E3E0]/30 border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                </div>
                <p className="text-[9px] font-mono opacity-40 leading-tight">
                  Define the numeric value for the first reference endpoint.
                </p>
              </div>

              {/* Reference B Card */}
              <div className="bg-white border border-[#141414] p-5 rounded-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                <div className="flex items-center justify-between border-b border-[#141414]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <h3 className="font-serif italic text-sm">Reference B</h3>
                  </div>
                  <span className="text-[9px] font-mono uppercase opacity-40">Endpoint 02</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest opacity-60">Calibration Value</label>
                  <input 
                    type="number" 
                    value={valueB}
                    onChange={(e) => setValueB(Number(e.target.value))}
                    className="w-full bg-[#E4E3E0]/30 border border-[#141414] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                </div>
                <p className="text-[9px] font-mono opacity-40 leading-tight">
                  Define the numeric value for the second reference endpoint.
                </p>
              </div>
            </div>

            <button
              disabled={!image || !allRegionsDefined || isAnalyzing}
              onClick={handleAnalyze}
              className={`w-full py-4 font-mono uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 rounded-xl border border-[#141414] ${
                !image || !allRegionsDefined || isAnalyzing
                  ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'bg-[#141414] text-[#E4E3E0] hover:bg-black active:scale-[0.98] shadow-lg'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Analyzing Spectral Data...
                </>
              ) : (
                <>
                  <Beaker size={16} />
                  Execute Quantitative Analysis
                </>
              )}
            </button>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <AlertCircle size={18} />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-[#141414] rounded-xl overflow-hidden flex flex-col h-full"
              >
                <div className="p-6 border-b border-[#141414] bg-[#141414] text-[#E4E3E0]">
                  <p className="text-[10px] font-mono uppercase tracking-widest opacity-60 mb-1">Analysis Result</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-serif italic">{result.estimated_value.toFixed(2)}</span>
                    <span className="text-[10px] font-mono uppercase opacity-50">Units (Interpolated)</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Proximity Scale */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="text-left">
                        <p className="text-[9px] font-mono uppercase tracking-widest opacity-50">Ref A ({result.reference_A.value})</p>
                        <p className="text-lg font-bold">{result.pct_to_A.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-mono uppercase tracking-widest opacity-50">Ref B ({result.reference_B.value})</p>
                        <p className="text-lg font-bold">{result.pct_to_B.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-4 bg-[#E4E3E0] rounded-full overflow-hidden flex border border-[#141414]/10">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${result.pct_to_A}%` }} 
                      />
                      <div 
                        className="h-full bg-purple-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${result.pct_to_B}%` }} 
                      />
                    </div>
                    
                    {/* Calculation Breakdown */}
                    <div className="bg-[#141414]/5 p-3 rounded border border-[#141414]/10 space-y-2">
                      <p className="text-[9px] font-mono uppercase tracking-widest opacity-40 mb-1">Interpolation Logic</p>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="opacity-60">({result.pct_to_A.toFixed(1)}% × {result.reference_A.value})</span>
                        <span className="font-bold text-blue-600">+ {(result.pct_to_A / 100 * result.reference_A.value).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="opacity-60">({result.pct_to_B.toFixed(1)}% × {result.reference_B.value})</span>
                        <span className="font-bold text-purple-600">+ {(result.pct_to_B / 100 * result.reference_B.value).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-[#141414]/10 pt-1 flex justify-between text-[11px] font-mono font-bold">
                        <span>Resultant Value</span>
                        <span>= {result.estimated_value.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Normalization & Luminosity Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#E4E3E0]/30 border border-[#141414]/10 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw size={12} className="opacity-40" />
                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Normalization</span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-80 italic">
                        "{result.lighting_normalization.notes}"
                      </p>
                    </div>
                    <div className="p-4 bg-[#E4E3E0]/30 border border-[#141414]/10 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Sun size={12} className="opacity-40 text-amber-500" />
                        <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Luminosity</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold">{result.luminosity.value}</span>
                        <span className="text-[9px] font-mono uppercase opacity-50">{result.luminosity.unit}</span>
                      </div>
                      <p className="text-[10px] leading-tight opacity-60">
                        {result.luminosity.description}
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="opacity-40" />
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Spectral Reasoning</span>
                    </div>
                    <p className="text-sm leading-relaxed font-serif italic opacity-90">
                      {result.explanation}
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-[#141414]/10 bg-[#E4E3E0]/10">
                  <p className="text-[9px] font-mono uppercase text-center opacity-40">
                    Data processed via Gemini Vision Engine • Non-deterministic interpolation
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="h-full border-2 border-dashed border-[#141414]/10 rounded-xl flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-40">
                <Beaker size={48} strokeWidth={1} />
                <div className="space-y-1">
                  <p className="font-serif italic text-lg">Awaiting Input Data</p>
                  <p className="text-[10px] font-mono uppercase tracking-widest max-w-[200px] mx-auto">
                    Define regions and calibration values to generate quantitative report
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#141414] p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono uppercase tracking-widest font-bold">System Protocol</h4>
            <ul className="text-[11px] space-y-2 opacity-60">
              <li>1. Capture or upload environmental sample image.</li>
              <li>2. Define Reference A, Reference B, and Test regions.</li>
              <li>3. Define Control Patch (White) for light normalization.</li>
              <li>4. Execute interpolation engine for numeric result.</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono uppercase tracking-widest font-bold">Normalization Logic</h4>
            <p className="text-[11px] opacity-60 leading-relaxed">
              The system utilizes the white control patch to calculate relative luminance and chromaticity shifts, ensuring results are independent of ambient lighting conditions.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono uppercase tracking-widest font-bold">Interpolation Model</h4>
            <p className="text-[11px] opacity-60 leading-relaxed">
              Linear interpolation is applied based on positional proximity in the normalized color space (LAB/HSV), mapping the test sample between user-defined endpoints.
            </p>
          </div>
        </div>
      </footer>
      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#E4E3E0] border-l border-[#141414] z-50 flex flex-col"
            >
              <div className="p-6 border-b border-[#141414] flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
                <div>
                  <h2 className="font-serif italic text-xl">Analysis Archive</h2>
                  <p className="text-[10px] font-mono uppercase tracking-widest opacity-60">Historical Spectral Data</p>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                    <History size={48} strokeWidth={1} />
                    <p className="font-mono text-[10px] uppercase tracking-widest">No records found</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      className="group bg-white border border-[#141414] rounded-lg overflow-hidden hover:shadow-lg transition-all"
                    >
                      <div className="flex h-24">
                        <div className="w-24 h-full bg-black shrink-0 relative">
                          <img 
                            src={item.image} 
                            alt="Sample" 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start">
                              <p className="text-[9px] font-mono uppercase tracking-widest opacity-50">
                                {new Date(item.timestamp).toLocaleString()}
                              </p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteHistoryItem(item.id);
                                }}
                                className="text-red-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <h3 className="text-lg font-serif italic truncate">{item.title}</h3>
                            <div className="flex gap-3 mt-1">
                              <p className="text-[9px] font-mono opacity-60">A: {item.result.pct_to_A.toFixed(0)}%</p>
                              <p className="text-[9px] font-mono opacity-60">B: {item.result.pct_to_B.toFixed(0)}%</p>
                              <p className="text-[9px] font-mono font-bold ml-auto">V: {item.result.estimated_value.toFixed(2)}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => selectHistoryItem(item)}
                            className="w-full text-[9px] font-mono uppercase tracking-widest py-1 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
                          >
                            Restore Data
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
