import React, { useState } from "react";
import { jsPDF } from "jspdf";
import {
  Download,
  FileBadge2,
  FileSignature,
  FileText,
  Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PdfKind = "exit_letter" | "certificate" | "solde";

type CommonPayload = {
  success?: boolean;
  document_type?: string;
  template?: string;
  sortie_rupture_id?: string;
};

type ExitLetterPayload = CommonPayload & {
  organization?: {
    name?: string;
  };
  employee?: {
    code?: string;
    full_name?: string;
    position?: string;
  };
  exit?: {
    date_sortie?: string;
    type?: string;
    motif?: string;
    commentaire?: string;
  };
  document?: {
    title?: string;
    subject?: string;
    body?: string;
  };
};

type CertificatePayload = CommonPayload & {
  organization?: {
    name?: string;
  };
  employee?: {
    code?: string;
    full_name?: string;
    position?: string;
    hire_date?: string;
  };
  exit?: {
    date_sortie?: string;
    type?: string;
  };
  document?: {
    title?: string;
    body?: string;
  };
};

type SoldePayload = CommonPayload & {
  employee?: {
    code?: string;
    full_name?: string;
  };
  exit?: {
    date_sortie?: string;
    type?: string;
    motif?: string;
  };
  currency?: string;
  lines?: Array<{
    code?: string;
    label?: string;
    amount?: number;
  }>;
  totals?: {
    salaire_mensuel?: number;
    brut_total?: number;
    total_retenues?: number;
    net_a_payer?: number;
  };
};

type Props = {
  sortieRuptureId: string;
  className?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  onDone?: () => void | Promise<void>;
};

function formatDateFR(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function formatMoney(value?: number | null, currency = "GNF") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return `0 ${currency}`;
  return `${n.toLocaleString("fr-FR")} ${currency}`;
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 7
) {
  const lines = doc.splitTextToSize(text || "", maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 20, 22);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(subtitle, 20, 29);
    doc.setTextColor(0, 0, 0);
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(20, 34, 190, 34);
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Page ${i} / ${pageCount}`, 170, 290);
  }

  doc.setTextColor(0, 0, 0);
}

function generateExitLetterPdf(payload: ExitLetterPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const org = payload.organization?.name ?? "Entreprise";
  const employee = payload.employee?.full_name ?? "Employé";
  const code = payload.employee?.code ?? "—";
  const position = payload.employee?.position ?? "—";
  const dateSortie = formatDateFR(payload.exit?.date_sortie);
  const typeSortie = payload.exit?.type ?? "—";
  const motif = payload.exit?.motif ?? "—";
  const subject = payload.document?.subject ?? "Notification de sortie";
  const body = payload.document?.body ?? "";

  drawHeader(doc, payload.document?.title ?? "Lettre de sortie", org);

  let y = 46;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Date : ${dateSortie}`, 20, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text(`Objet : ${subject}`, 20, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.text(`Employé : ${employee}`, 20, y);
  y += 7;
  doc.text(`Matricule : ${code}`, 20, y);
  y += 7;
  doc.text(`Poste : ${position}`, 20, y);
  y += 7;
  doc.text(`Type de sortie : ${typeSortie}`, 20, y);
  y += 7;
  doc.text(`Motif : ${motif}`, 20, y);
  y += 12;

  y = addWrappedText(doc, body, 20, y, 170, 7);
  y += 16;

  doc.text("Signature RH :", 20, y);
  doc.line(20, y + 16, 80, y + 16);

  drawFooter(doc);

  const fileName = sanitizeFileName(
    `lettre_sortie_${employee}_${payload.sortie_rupture_id ?? "document"}.pdf`
  );
  doc.save(fileName);
}

function generateCertificatePdf(payload: CertificatePayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const org = payload.organization?.name ?? "Entreprise";
  const employee = payload.employee?.full_name ?? "Employé";
  const code = payload.employee?.code ?? "—";
  const position = payload.employee?.position ?? "—";
  const hireDate = formatDateFR(payload.employee?.hire_date);
  const exitDate = formatDateFR(payload.exit?.date_sortie);
  const body = payload.document?.body ?? "";

  drawHeader(doc, payload.document?.title ?? "Certificat de travail", org);

  let y = 48;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Employé : ${employee}`, 20, y);
  y += 7;
  doc.text(`Matricule : ${code}`, 20, y);
  y += 7;
  doc.text(`Poste : ${position}`, 20, y);
  y += 7;
  doc.text(`Période : du ${hireDate} au ${exitDate}`, 20, y);
  y += 14;

  y = addWrappedText(doc, body, 20, y, 170, 7);
  y += 18;

  doc.text("Fait pour servir et valoir ce que de droit.", 20, y);
  y += 22;
  doc.text("Signature et cachet :", 20, y);
  doc.line(20, y + 18, 90, y + 18);

  drawFooter(doc);

  const fileName = sanitizeFileName(
    `certificat_travail_${employee}_${payload.sortie_rupture_id ?? "document"}.pdf`
  );
  doc.save(fileName);
}

function generateSoldePdf(payload: SoldePayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const employee = payload.employee?.full_name ?? "Employé";
  const code = payload.employee?.code ?? "—";
  const dateSortie = formatDateFR(payload.exit?.date_sortie);
  const currency = payload.currency ?? "GNF";
  const lines = payload.lines ?? [];
  const totals = payload.totals ?? {};

  drawHeader(
    doc,
    "Solde de tout compte",
    `${employee} • ${code}`
  );

  let y = 44;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Date de sortie : ${dateSortie}`, 20, y);
  y += 8;
  doc.text(`Type : ${payload.exit?.type ?? "—"}`, 20, y);
  y += 8;
  doc.text(`Motif : ${payload.exit?.motif ?? "—"}`, 20, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Détail du calcul", 20, y);
  y += 8;

  doc.setDrawColor(220, 220, 220);
  doc.rect(20, y, 170, 10);
  doc.text("Libellé", 24, y + 6.5);
  doc.text("Montant", 160, y + 6.5, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");

  lines.forEach((line) => {
    if (y > 265) {
      doc.addPage();
      y = 24;
    }

    doc.rect(20, y, 170, 9);
    doc.text(line.label ?? "Ligne", 24, y + 6);
    doc.text(formatMoney(line.amount ?? 0, currency), 160, y + 6, {
      align: "right",
    });
    y += 9;
  });

  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text(`Brut total : ${formatMoney(totals.brut_total, currency)}`, 20, y);
  y += 8;
  doc.text(
    `Total retenues : ${formatMoney(totals.total_retenues, currency)}`,
    20,
    y
  );
  y += 10;

  doc.setFillColor(240, 248, 255);
  doc.rect(20, y - 5, 170, 12, "F");
  doc.text(`Net à payer : ${formatMoney(totals.net_a_payer, currency)}`, 24, y + 2);

  drawFooter(doc);

  const fileName = sanitizeFileName(
    `solde_tout_compte_${employee}_${payload.sortie_rupture_id ?? "document"}.pdf`
  );
  doc.save(fileName);
}

async function callRpc(sortieRuptureId: string, kind: PdfKind) {
  if (kind === "exit_letter") {
    const { data, error } = await supabase.rpc(
      "rh_generate_exit_letter_pdf_payload" as any,
      { p_sortie_rupture_id: sortieRuptureId }
    );
    if (error) throw error;
    return data as ExitLetterPayload;
  }

  if (kind === "certificate") {
    const { data, error } = await supabase.rpc(
      "rh_generate_exit_certificate_pdf_payload" as any,
      { p_sortie_rupture_id: sortieRuptureId }
    );
    if (error) throw error;
    return data as CertificatePayload;
  }

  const { data, error } = await supabase.rpc(
    "rh_generate_solde_pdf_payload" as any,
    { p_sortie_rupture_id: sortieRuptureId }
  );
  if (error) throw error;
  return data as SoldePayload;
}

export function ExitPdfGenerator({
  sortieRuptureId,
  className,
  variant = "outline",
  size = "sm",
  onDone,
}: Props) {
  const [loadingKind, setLoadingKind] = useState<PdfKind | null>(null);

  const generate = async (kind: PdfKind) => {
    try {
      setLoadingKind(kind);

      const payload = await callRpc(sortieRuptureId, kind);

      if (!payload?.success) {
        throw new Error("Le payload PDF retourné est invalide.");
      }

      if (kind === "exit_letter") {
        generateExitLetterPdf(payload as ExitLetterPayload);
      } else if (kind === "certificate") {
        generateCertificatePdf(payload as CertificatePayload);
      } else {
        generateSoldePdf(payload as SoldePayload);
      }

      toast({
        title: "PDF généré",
        description:
          kind === "exit_letter"
            ? "Lettre de sortie générée."
            : kind === "certificate"
              ? "Certificat de travail généré."
              : "Solde tout compte généré.",
      });

      await onDone?.();
    } catch (e: any) {
      console.error("[ExitPdfGenerator]", e);
      toast({
        title: "Erreur PDF",
        description: e?.message ?? "Impossible de générer le PDF.",
        variant: "destructive",
      });
    } finally {
      setLoadingKind(null);
    }
  };

  const isBusy = loadingKind !== null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant={variant}
        size={size}
        disabled={isBusy}
        onClick={() => generate("exit_letter")}
      >
        {loadingKind === "exit_letter" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Lettre PDF
      </Button>

      <Button
        variant={variant}
        size={size}
        disabled={isBusy}
        onClick={() => generate("certificate")}
      >
        {loadingKind === "certificate" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileBadge2 className="mr-2 h-4 w-4" />
        )}
        Certificat PDF
      </Button>

      <Button
        variant={variant}
        size={size}
        disabled={isBusy}
        onClick={() => generate("solde")}
      >
        {loadingKind === "solde" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSignature className="mr-2 h-4 w-4" />
        )}
        Solde PDF
      </Button>

      {isBusy ? (
        <span className="inline-flex items-center text-xs text-muted-foreground">
          <Download className="mr-1 h-3.5 w-3.5" />
          Génération…
        </span>
      ) : null}
    </div>
  );
}

export default ExitPdfGenerator;
