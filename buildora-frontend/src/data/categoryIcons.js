import {
  CakeSlice, Flower2, Gem, Gift, Lamp, Scissors, Shirt, Sparkles, Sprout, Store, UtensilsCrossed,
} from 'lucide-react';

// Categories come from the API; this maps their `icon` names to components.
// A new category with an unknown icon name falls back to a generic store icon.
const ICONS = { CakeSlice, Flower2, Gem, Gift, Lamp, Scissors, Shirt, Sparkles, Sprout, UtensilsCrossed };

export const getCategoryIcon = (name) => ICONS[name] || Store;
