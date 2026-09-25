import { useEffect, useState } from 'react';
import { businessService } from '../services/businessService';

let cache = null;

export function useCategories() {
  const [categories, setCategories] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cache) return;
    businessService
      .categories()
      .then((data) => {
        cache = data;
        setCategories(data);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const getCategory = (id) => categories.find((c) => c.id === id);
  return { categories, loading, error, getCategory };
}
