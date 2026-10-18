"use client";

import React, { useState, useEffect } from "react";
import { Search, Key, X, ExternalLink, Loader2, Download, Hexagon, Zap, Globe2, Box } from "lucide-react";

export interface CloudGlbAsset {
  uid: string;
  name: string;
  category: string;
  keywords: string;
  verts: string;
  thumbnail: string;
  glbUrl: string;
  builtInModel?: string;
  description: string;
}

export interface SketchfabSearchResult {
  uid: string;
  name: string;
  description: string;
  viewerUrl: string;
  thumbnails: { images: { url: string; width: number }[] };
  user: { displayName: string };
  faceCount: number;
  vertexCount: number;
}

export const VERIFIED_CLOUD_MODELS: CloudGlbAsset[] = [
  { uid: "builtin-heart", name: "Beating Human Heart", category: "BIOLOGY", keywords: "heart human anatomy", verts: "68.4k Verts", thumbnail: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=600&q=80", glbUrl: "", builtInModel: "heart", description: "Real-time procedural beating 3D heart." },
  { uid: "glb-astronaut", name: "NASA EVA Space Suit", category: "AEROSPACE", keywords: "astronaut space nasa suit", verts: "48.5k Verts", thumbnail: "https://modelviewer.dev/assets/poster-astronaut.webp", glbUrl: "https://modelviewer.dev/shared-assets/models/Astronaut.glb", description: "NASA pressurized space suit." },
  { uid: "glb-brain", name: "Human BrainStem", category: "NEUROSCIENCE", keywords: "brain anatomy medical", verts: "64.5k Verts", thumbnail: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/BrainStem/screenshot/screenshot.jpg", glbUrl: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/BrainStem/glTF-Binary/BrainStem.glb", description: "Cranial neural mesh optimized for dissection." },
  { uid: "glb-engine", name: "V8 Combustion Engine", category: "MECHANICAL", keywords: "engine car piston motor", verts: "112.4k Verts", thumbnail: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/2CylinderEngine/screenshot/screenshot.jpg", glbUrl: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/2CylinderEngine/glTF-Binary/2CylinderEngine.glb", description: "Multi-part mechanical engine." },
  { uid: "glb-helmet", name: "Sci-Fi Space Helmet", category: "AEROSPACE", keywords: "helmet space sci-fi visor", verts: "46.3k Verts", thumbnail: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/DamagedHelmet/screenshot/screenshot.png", glbUrl: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb", description: "High-detail PBR aerospace helmet." },
  { uid: "glb-camera", name: "Antique Optical Camera", category: "OPTICS", keywords: "camera lens optics vintage", verts: "42.8k Verts", thumbnail: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/AntiqueCamera/screenshot/screenshot.png", glbUrl: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/AntiqueCamera/glTF-Binary/AntiqueCamera.glb", description: "Optical camera with sliding bellows." }
];

interface ModelLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCloudModel: (model: CloudGlbAsset) => void;
  onImportSketchfabModel: (model: SketchfabSearchResult, token: string) => void;
}

export default function ModelLibraryModal({ isOpen, onClose, onImportCloudModel, onImportSketchfabModel }: ModelLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [matchedCloudResults, setMatchedCloudResults] = useState<CloudGlbAsset[]>(VERIFIED_CLOUD_MODELS);
  const [sfResults, setSfResults] = useState<SketchfabSearchResult[]>([]);
  const [isSfSearching, setIsSfSearching] = useState(false);
  const [sfApiToken, setSfApiToken] = useState("");
  const [showSfTokenInput, setShowSfTokenInput] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setSfApiToken(localStorage.getItem("sketchfab_api_token") || "");
  }, []);

  const saveSfToken = (val: string) => {
    setSfApiToken(val);
    if (typeof window !== "undefined") localStorage.setItem("sketchfab_api_token", val.trim());
  };

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setMatchedCloudResults(VERIFIED_CLOUD_MODELS);
      setSfResults([]);
      setIsSfSearching(false);
      return;
    }

    const cloudMatches = VERIFIED_CLOUD_MODELS.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.keywords.toLowerCase().includes(q)
    );
    setMatchedCloudResults(cloudMatches);

    setIsSfSearching(true);
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(q)}&downloadable=true&sort_by=-relevance&count=6`;
        const res = await fetch(url);
        const data = await res.json();
        setSfResults(data.results || []);
      } catch (err) {
        console.error("Sketchfab search error:", err);
      } finally {
        setIsSfSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-6 pointer-events-auto">
      {/* Premium Blur Backdrop */}
      <div className="absolute inset-0 bg-[#020108]/90 backdrop-blur-3xl" onClick={onClose} />

      <div className="relative w-full max-w-[1440px] h-[88vh] rounded-[36px] bg-gradient-to-br from-[#0c081e] to-[#04020a] border border-cyan-500/20 shadow-[0_0_150px_rgba(34,211,238,0.15)] flex flex-col overflow-hidden">
        {/* Top RGB Glowing Edge */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-purple-600" />

        {/* Header Section */}
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              <Hexagon className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-white tracking-tight">Premium 3D Hub</h2>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold tracking-widest flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> ULTRA-FAST CDN
                </span>
              </div>
              <p className="text-sm text-white/50 mt-1 font-medium">Instantly stream verified, unblocked 3D assets directly into your touchless lab.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSfTokenInput((p) => !p)}
              className={`px-5 py-3 rounded-2xl border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                sfApiToken ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>{sfApiToken ? "Sketchfab Linked" : "Link Sketchfab (Optional)"}</span>
            </button>

            <button onClick={onClose} className="p-3.5 rounded-2xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/50 text-white/70 hover:text-rose-400 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Token Input Drawer */}
        {showSfTokenInput && (
          <div className="px-10 py-4 bg-purple-950/30 border-b border-purple-500/20 flex items-center justify-between z-10 shrink-0">
            <div className="text-xs text-purple-200 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-purple-400" />
              <span><strong>Global Search:</strong> Add your token from <a href="https://sketchfab.com/settings/password" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">sketchfab.com</a> to unlock 10,000+ extra models.</span>
            </div>
            <div className="flex items-center gap-2 w-[400px]">
              <input type="password" value={sfApiToken} onChange={(e) => saveSfToken(e.target.value)} placeholder="Paste Sketchfab API Token..." className="flex-1 bg-black/50 border border-purple-500/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors" />
              <button onClick={() => setShowSfTokenInput(false)} className="px-5 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]">Save</button>
            </div>
          </div>
        )}

        {/* Search Bar Area */}
        <div className="px-10 py-6 border-b border-white/5 bg-white/[0.01] shrink-0 z-10">
          <div className="flex items-center gap-4 w-full bg-[#05030e] border border-white/10 focus-within:border-cyan-400 rounded-[24px] px-6 py-4 shadow-inner transition-all">
            <Search className="w-6 h-6 text-cyan-400" />
            <input type="text" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search for engines, biology, aerospace, or machinery..." className="flex-1 bg-transparent text-lg text-white placeholder:text-white/30 focus:outline-none" />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white/50">Clear</button>}
          </div>
        </div>

        {/* Model Grid Area */}
        <div className="flex-1 overflow-y-auto px-10 py-8 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max gap-8">
            
            {/* Verified Premium Cloud Assets */}
            {matchedCloudResults.map((item) => (
              <div
                key={item.uid}
                onClick={() => onImportCloudModel(item)}
                className="group cursor-pointer rounded-[28px] bg-white/[0.02] border border-white/5 hover:border-cyan-400 hover:bg-white/[0.04] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_20px_60px_rgba(34,211,238,0.15)] hover:-translate-y-2"
              >
                <div className="relative h-48 w-full bg-[#090614] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090614] via-transparent to-transparent z-10" />
                  <img src={item.thumbnail} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100" />
                  <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    {item.builtInModel ? "PROCEDURAL" : "GLB READY"}
                  </div>
                  <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/70">
                    {item.verts}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-cyan-500 font-bold tracking-widest">{item.category}</div>
                    <h3 className="text-lg font-bold text-white mt-1 group-hover:text-cyan-300 transition-colors">{item.name}</h3>
                    <p className="text-sm text-white/50 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <button className="w-full py-3 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-400 text-cyan-400 group-hover:text-black font-bold text-sm flex items-center justify-center gap-2 transition-all">
                      <Download className="w-4 h-4" /> Load in 3D Lab
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Sketchfab Global Assets (Only shows if typing in search) */}
            {sfResults.map((item) => {
              const thumb = item.thumbnails?.images?.find((img) => img.width >= 400)?.url || item.thumbnails?.images?.[0]?.url || "";
              return (
                <div
                  key={item.uid}
                  onClick={() => onImportSketchfabModel(item, sfApiToken)}
                  className="group cursor-pointer rounded-[28px] bg-white/[0.02] border border-white/5 hover:border-purple-500 hover:bg-white/[0.04] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_20px_60px_rgba(168,85,247,0.15)] hover:-translate-y-2"
                >
                  <div className="relative h-48 w-full bg-[#090614] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090614] via-transparent to-transparent z-10" />
                    {thumb ? <img src={thumb} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-70 group-hover:opacity-100" /> : <div className="absolute inset-0 flex items-center justify-center"><Box className="w-10 h-10 text-white/20" /></div>}
                    <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                      SKETCHFAB
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-purple-400 font-bold tracking-widest truncate">BY {item.user?.displayName || "CREATOR"}</div>
                      <h3 className="text-lg font-bold text-white mt-1 group-hover:text-purple-300 transition-colors truncate">{item.name}</h3>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5">
                      <button className="w-full py-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500 text-purple-400 group-hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <Download className="w-4 h-4" /> Import Model
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {isSfSearching && (
            <div className="w-full flex items-center justify-center py-12 text-cyan-400 font-mono text-sm gap-3">
              <Loader2 className="w-6 h-6 animate-spin" /> Fetching global library...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}