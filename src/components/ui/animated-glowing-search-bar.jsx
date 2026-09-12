'use client';

import React from "react";
import { Search, Filter } from "lucide-react";

const SearchComponent = ({ placeholder, onSearch }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q");
    if (onSearch && query) {
      onSearch(query);
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 opacity-80 blur-[6px]" aria-hidden />

      <form
        onSubmit={handleSubmit}
        className="relative w-full bg-slate-950 rounded-xl border border-white/10 shadow-lg"
      >
        <input
          placeholder={placeholder || "Search..."}
          type="text"
          name="q"
          className="bg-transparent border-none w-full h-14 rounded-xl text-white pl-14 pr-14 text-lg focus:outline-none placeholder-slate-500"
        />

        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="w-6 h-6" />
        </div>

        <div className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
          <Filter className="w-5 h-5 text-slate-400 hover:text-blue-400" />
        </div>
      </form>
    </div>
  );
};

export default SearchComponent;
