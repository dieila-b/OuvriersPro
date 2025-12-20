import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  className?: string;
};

const ClientBackToDashboard: React.FC<Props> = ({ className }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <div className={className ?? ""}>
      <Button
        type="button"
        variant="outline"
        onClick={() => navigate("/espace-client")}
      >
        {language === "fr"
          ? "Retour à l’espace client / particulier"
          : "Back to client area"}
      </Button>
    </div>
  );
};

export default ClientBackToDashboard;
