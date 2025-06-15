
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield, MapPin, MessageCircle, Star, Users, Clock } from 'lucide-react';

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Shield,
      title: t('home.features.quality.title'),
      description: t('home.features.quality.desc'),
      color: 'text-green-600'
    },
    {
      icon: MapPin,
      title: t('home.features.local.title'),
      description: t('home.features.local.desc'),
      color: 'text-blue-600'
    },
    {
      icon: MessageCircle,
      title: t('home.features.contact.title'),
      description: t('home.features.contact.desc'),
      color: 'text-purple-600'
    }
  ];

  return (
    <section className="py-20 bg-pro-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-pro-gray mb-4">
            {t('home.features.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold text-pro-gray mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto">
          {[
            { icon: Users, number: '2,500+', label: 'Professionnels' },
            { icon: Star, number: '4.8/5', label: 'Note moyenne' },
            { icon: Clock, number: '24h', label: 'Temps de réponse' },
            { icon: Shield, number: '100%', label: 'Vérifiés' }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <stat.icon className="w-8 h-8 text-pro-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-pro-gray">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
