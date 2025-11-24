const { filters } = useWorkerSearchFilters();

let q = supabase.from("workers").select("*");

if (filters.service) q = q.ilike("metier", `%${filters.service}%`);
if (filters.ville) q = q.ilike("ville", `%${filters.ville}%`);
if (filters.commune) q = q.ilike("commune", `%${filters.commune}%`);
if (filters.quartier) q = q.ilike("quartier", `%${filters.quartier}%`);

const { data, error } = await q;
