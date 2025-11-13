import React from "react";
import { ShieldCheck, MapPin, MessageCircle } from "lucide-react";

const FeaturesSection: React.FC = () => {
  const items = [
    {
      icon: ShieldCheck,
      title: "Professionnels vérifiés",
      text: "Tous nos ouvriers sont contrôlés et certifiés",
    },
    {
      icon: MapPin,
      title: "Proximité garantie",
      text: "Trouvez des professionnels dans votre région",
    },
    {
      icon: MessageCircle,
      title: "Contact direct",
      text: "Échangez directement avec les artisans",
    },
  ];

  return (
    <section className="w-full py-16 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-pro-gray mb-10">
          Pourquoi choisir OuvriersPro ?
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-pro-blue/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-pro-blue" />
              </div>
              <h3 className="font-semibold text-lg text-pro-gray mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
