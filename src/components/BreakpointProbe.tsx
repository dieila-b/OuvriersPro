import React from "react";

const BreakpointProbe = () => {
  return (
    <div className="fixed bottom-3 left-3 z-[9999] rounded-md bg-black/80 text-white text-xs px-2 py-1 font-mono">
      <span className="inline sm:hidden">XS</span>
      <span className="hidden sm:inline md:hidden">SM</span>
      <span className="hidden md:inline lg:hidden">MD</span>
      <span className="hidden lg:inline xl:hidden">LG</span>
      <span className="hidden xl:inline 2xl:hidden">XL</span>
      <span className="hidden 2xl:inline">2XL</span>
    </div>
  );
};

export default BreakpointProbe;
