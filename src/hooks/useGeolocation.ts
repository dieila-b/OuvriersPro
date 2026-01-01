import { useState } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  const getLocation = () => {
    if (!navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        error: "La géolocalisation n'est pas supportée par votre navigateur",
        loading: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = "Impossible d'obtenir votre position";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Vous avez refusé l'accès à votre position";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position non disponible";
            break;
          case error.TIMEOUT:
            errorMessage = "La demande a expiré";
            break;
        }

        setState({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const clearLocation = () => {
    setState({
      latitude: null,
      longitude: null,
      error: null,
      loading: false,
    });
  };

  return {
    ...state,
    // Expose loading as geoLocating for backwards compatibility
    geoLocating: state.loading,
    getLocation,
    clearLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}
