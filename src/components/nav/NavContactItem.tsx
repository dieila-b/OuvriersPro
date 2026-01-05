// src/components/nav/NavContactItem.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { Mail } from "lucide-react";

type Props = {
  /**
   * Route cible. Exemple: "/contact" ou "/#contact"
   */
  to?: string;
  /**
   * Libellé. Par défaut: "Contact"
   */
  label?: string;
  /**
   * Optionnel: callback si tu veux fermer un drawer/mobile menu au clic
   */
  onClick?: () => void;
  /**
   * Optionnel: classe additionnelle
   */
  className?: string;
};

export default function NavContactItem({
  to = "/contact",
  label = "Contact",
  onClick,
  className = "",
}: Props) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          // base
          "group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/35",
          // états
          isActive
            ? "bg-pro-blue text-white shadow-sm"
            : "text-pro-gray hover:bg-gray-100 hover:text-pro-gray",
          className,
        ].join(" ")
      }
      aria-label={label}
      title={label}
    >
      <span
        className={[
          "inline-flex h-8 w-8 items-center justify-center rounded-lg transition",
          "shrink-0",
          // fond icône selon état
          "group-[.active]:bg-white/15",
        ].join(" ")}
      >
        <Mail className="h-4 w-4" />
      </span>

      <span className="truncate">{label}</span>
    </NavLink>
  );
}
