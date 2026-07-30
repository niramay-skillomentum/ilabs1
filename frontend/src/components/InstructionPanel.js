"use client";

import { useState } from "react";
import { getDeskInstructions } from "./instructionsData";

export default function InstructionPanel({ desk }) {
  const [isInlineOpen, setIsInlineOpen] = useState(false);
  const deskInfo = getDeskInstructions(desk);

  const renderContent = () => (
    <div className="p-5 flex flex-col md:flex-row gap-6">
      <div className="flex-1 space-y-4">
        {deskInfo.steps.map((step, idx) => (
          <div key={idx} className="flex space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-200">
              {idx + 1}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 m-0 mb-1">{step.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed m-0">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Tips Section */}
      <div className="w-full md:w-1/3">
        <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-inner h-full">
          <h4 className="text-sm font-bold text-amber-800 flex items-center space-x-2 m-0 mb-3">
            <span className="text-xl">💡</span>
            <span>Pro Tip</span>
          </h4>
          <p className="text-sm text-amber-700 leading-relaxed m-0">
            {deskInfo.tips}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsInlineOpen(true)}
        className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm cursor-pointer"
      >
        <span className="text-lg leading-none">📖</span>
        <span className="font-semibold text-sm tracking-wide">
          View Operations Guide
        </span>
      </button>

      {/* Modal Popup */}
      {isInlineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden transform transition-all duration-200 scale-100 opacity-100">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 border-b border-slate-700/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2 m-0">
                  <span>🎯</span>
                  <span>{deskInfo.title}</span>
                </h3>
                <p className="text-slate-300 text-xs mt-1 mb-0 font-medium">Standard Operating Procedure</p>
              </div>
              <button 
                onClick={() => setIsInlineOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto bg-white">
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
