// src/lib/guineaLocations.ts
export const GUINEA_REGIONS = [
  "Conakry",
  "Kindia",
  "Boké",
  "Mamou",
  "Labé",
  "Kankan",
  "Faranah",
  "N'Zérékoré"
];

export const GUINEA_CITIES_BY_REGION: Record<string, string[]> = {
  "Conakry": ["Conakry"],
  "Kindia": ["Kindia"],
  "Boké": ["Boké"],
  "Mamou": ["Mamou"],
  "Labé": ["Labé"],
  "Kankan": ["Kankan"],
  "Faranah": ["Faranah"],
  "N'Zérékoré": ["N'Zérékoré"]
};

export const GUINEA_COMMUNES_BY_CITY: Record<string, string[]> = {
  "Conakry": ["Kaloum", "Dixinn", "Ratoma", "Matam", "Matoto"],
  "Kindia": ["Kindia-Centre", "Coyah", "Dubreka", "Forecariah", "Telemele", "Fria"],
  "Boké": ["Boké-Centre", "Boffa", "Koundara", "Gaoul"],
  "Mamou": ["Mamou-Centre", "Pita", "Dalaba"],
  "Labé": ["Labé-Centre", "Mali", "Lelouma", "Koubia", "Tougué"],
  "Kankan": ["Kankan-Centre", "Siguiri", "Kouroussa", "Mandiana", "Kerouané"],
  "Faranah": ["Faranah-Centre", "Dabola", "Dinguiraye", "Kissidougou"],
  "N'Zérékoré": ["N'Zérékoré-Centre", "Youmou", "Lola", "Gueckedou", "Beyla", "Macenta"]
};

export const GUINEA_DISTRICTS_BY_COMMUNE: Record<string, string[]> = {
  "Kaloum": ["Boulbinet", "Sandervalia", "Coronthie"],
  "Dixinn": ["Bellevue", "Taouyah", "Camayenne"],
  "Ratoma": ["Lambanyi", "Kipé", "Nongo"],
  "Matam": ["Madina", "Bonfi", "Matam-Centre"],
  "Matoto": ["Sangoyah", "Yimbaya", "Tombolia"],
  "Kindia-Centre": ["Marché", "Carrefour"],
  "Boké-Centre": ["Quartier 1", "Quartier 2"],
  "Mamou-Centre": ["Quartier 1", "Quartier 2"],
  "Labé-Centre": ["Quartier 1", "Quartier 2"],
  "Kankan-Centre": ["Quartier 1", "Quartier 2"],
  "Faranah-Centre": ["Quartier 1", "Quartier 2"],
  "N'Zérékoré-Centre": ["Quartier 1", "Quartier 2"]
};
