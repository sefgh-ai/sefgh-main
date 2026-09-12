"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.q} className="rounded-xl border border-slate-800 bg-slate-900/60">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`faq-answer-${index}`}
              className="w-full px-4 py-4 flex items-center justify-between text-left"
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span className="font-medium text-white">{item.q}</span>
              <ChevronDown
                aria-hidden="true"
                className={`w-5 h-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <div id={`faq-answer-${index}`} className="px-4 pb-4 text-slate-300 text-sm">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
