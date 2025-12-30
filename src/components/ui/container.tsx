import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  size?: "xl" | "2xl";
};

export default function Container({ children, className = "", size = "2xl" }: Props) {
  const max = size === "xl" ? "max-w-6xl" : "max-w-7xl";
  return (
    <div className={`w-full ${max} mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
