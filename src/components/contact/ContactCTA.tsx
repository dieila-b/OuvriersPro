// src/components/contact/ContactCTA.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import ContactModal from "@/components/contact/ContactModal";

type Props = {
  className?: string;
};

export default function ContactCTA({ className = "" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={["mt-4", className].join(" ")}>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90"
      >
        <Mail className="mr-2 h-4 w-4" />
        Contact
      </Button>

      <p className="mt-2 text-xs text-gray-500 leading-snug">
        Une question ? Notre équipe vous répond rapidement.
      </p>

      <ContactModal open={open} onOpenChange={setOpen} defaultSubject="" />
    </div>
  );
}
