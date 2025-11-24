// src/components/NavBar.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white sticky top-0 z-50 border-b">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            OP
          </div>
          <span className="font-bold text-lg text-slate-900">OuvriersPro</span>
        </Link>

        {/* Desktop menu */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link to="/search" className="hover:text-blue-600">Rechercher</Link>
          <Link to="/faq" className="hover:text-blue-600">FAQ</Link>
          <Link to="/contact" className="hover:text-blue-600">Contact</Link>
        </nav>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/become-pro"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
          >
            Devenir Ouvrier Pro
          </Link>
          <button className="px-3 py-2 rounded-lg border text-sm">FR</button>
        </div>

        {/* Hamburger mobile */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-white">
          <nav className="w-full max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 text-slate-700">
            <Link to="/search" onClick={() => setOpen(false)} className="py-2">
              Rechercher
            </Link>
            <Link to="/faq" onClick={() => setOpen(false)} className="py-2">
              FAQ
            </Link>
            <Link to="/contact" onClick={() => setOpen(false)} className="py-2">
              Contact
            </Link>

            <Link
              to="/become-pro"
              onClick={() => setOpen(false)}
              className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold text-center"
            >
              Devenir Ouvrier Pro
            </Link>

            <button className="px-3 py-2 rounded-lg border text-sm w-fit">
              FR
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
