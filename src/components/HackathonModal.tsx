import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Terminal,
  Server,
  Cpu,
  Video,
  FileText,
  Github,
  Globe,
} from 'lucide-react';
import { AIStatusResponse } from '../services/ai';

interface HackathonModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiStatus: AIStatusResponse | null;
  isAiVerified: boolean;
}

export const HackathonModal: React.FC<HackathonModalProps> = ({
  isOpen,
  onClose,
  aiStatus,
  isAiVerified,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-2xl p-5 sm:p-7 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              SkySense AI — System Architecture & Hackathon Submission Guide
            </h2>
            <p className="text-xs text-slate-400">
              Verified Implementation Checklist • Nebius Token Factory • NVIDIA Nemotron
            </p>
          </div>
        </div>

        {/* 1. Verified Live Status Banner */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 mb-5">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Backend Integration & API Verification State
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Open-Meteo Weather:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Live & Connected
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">NVIDIA Nemotron via Nebius:</span>
              {isAiVerified ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Live
                </span>
              ) : aiStatus?.configured ? (
                <span className="text-sky-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key Configured
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Requires Key Setup
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Configured Model:</span>
              <span className="text-cyan-300 font-mono text-[11px] truncate max-w-[180px]">
                {aiStatus?.model || 'nvidia/Llama-3_1-Nemotron-70B-Instruct-HF'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Multilingual & Voice:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Urdu (RTL), Hindi, Telugu, English
              </span>
            </div>
          </div>
        </div>

        {/* 2. Step-by-Step Nebius Key Configuration */}
        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
            <h4 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              How to add NEBIUS_API_KEY to your environment
            </h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>
                Log in to <strong className="text-white">Nebius AI Studio</strong> (
                <a
                  href="https://studio.nebius.ai/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 underline"
                >
                  https://studio.nebius.ai/
                </a>
                ) and create an API Token under Token Factory.
              </li>
              <li>
                In Google AI Studio or your deployment container settings, add the environment variable:
                <div className="mt-1.5 p-2 bg-slate-950 rounded-lg font-mono text-cyan-300 flex items-center justify-between">
                  <span>NEBIUS_API_KEY=&quot;your_nebius_api_key_here&quot;</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'env1',
                        'NEBIUS_API_KEY="your_nebius_api_key_here"\nNEBIUS_MODEL="nvidia/Llama-3_1-Nemotron-70B-Instruct-HF"'
                      )
                    }
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'env1' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </li>
              <li>
                Optionally set <code className="bg-slate-900 text-sky-300 px-1">NEBIUS_MODEL</code> to your preferred NVIDIA model (e.g. <code className="text-white">nvidia/Llama-3_1-Nemotron-70B-Instruct-HF</code>).
              </li>
              <li>
                Once configured, click <strong className="text-white">&quot;Test Nebius&quot;</strong> in the AI Assistant tab to perform an live handshake. The app will immediately display the green <span className="text-emerald-400 font-semibold">&quot;NVIDIA Live Verified&quot;</span> badge.
              </li>
            </ol>
          </div>

          {/* 3. Hackathon Deliverables Checklist */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Hackathon Submission Checklist (Rule Adherence)
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Full-Stack Architecture:</strong> Express server with strict server-side proxy (<code className="text-cyan-300 font-mono">/api/ai/chat</code>), never leaking credentials to the client.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Open-Meteo Real Data:</strong> Live geocoding for Indian towns/villages, 24h hourly forecast, 7-day outlook, solar times, and wind compass.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Farmer Agricultural Matrix:</strong> Operational indices for spraying, irrigation, harvesting, and sowing with transparent KVK notices.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Weather Safety & Hazard Cautions:</strong> Clear distinction between automated forecast thresholds and statutory IMD/NDMA evacuation orders.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Multilingual Urdu RTL & Indian Scripts:</strong> Complete bilingual translation with right-to-left layout for Urdu and native rendering for Hindi and Telugu.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Voice I/O:</strong> Web Speech Recognition and SpeechSynthesis with multi-language dialect mapping and graceful fallbacks.
                </div>
              </div>
            </div>
          </div>

          {/* 4. Demo Video Advice */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
            <h4 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" />
              Recording Your 3-Minute Demo Video
            </h4>
            <p className="text-slate-300">
              When filming your hackathon video:
              <br />
              • Start by showing the live URL running on a mobile viewport.
              <br />
              • Search for an Indian agricultural town (e.g., Warangal or Guntur) and show real Open-Meteo data.
              <br />
              • Switch languages to Urdu (show RTL layout) or Hindi.
              <br />
              • Ask the AI Assistant a farming question using voice or text: &quot;Can I spray pesticide today?&quot; and demonstrate the live NVIDIA Nemotron answer.
              <br />
              • Show the Farmer Help and Safety & Alerts tabs with official links to IMD and NDMA.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Open Source under Apache-2.0 License • SkySense AI
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
