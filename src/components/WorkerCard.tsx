
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock } from 'lucide-react';

interface WorkerCardProps {
  worker: {
    id: string;
    name: string;
    trade: string;
    hourlyRate: number;
    rating: number;
    reviewCount: number;
    location: string;
    avatar: string;
    experience: number;
    verified: boolean;
  };
}

const WorkerCard = ({ worker }: WorkerCardProps) => {
  const { t } = useLanguage();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={worker.avatar}
              alt={worker.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            {worker.verified && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-current" />
              </div>
            )}
          </div>

          {/* Worker Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-pro-gray truncate">
                {worker.name}
              </h3>
              <Badge variant="secondary" className="bg-pro-blue/10 text-pro-blue">
                {worker.trade}
              </Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>{worker.rating}</span>
                <span>({worker.reviewCount})</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{worker.location}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{worker.experience} {t('profile.years')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-pro-blue">
                {worker.hourlyRate}{t('common.euro')}/{t('subscription.month')}
              </div>
              <Button
                size="sm"
                className="bg-pro-blue hover:bg-blue-700"
              >
                {t('profile.contact')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerCard;
