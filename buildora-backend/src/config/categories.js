// Business categories are data-driven: add a new entry here and it appears
// everywhere (API validation, create-business screen, store page).
// `icon` is a lucide-react icon name rendered by the frontend.
export const CATEGORIES = [
  {
    id: 'boutique-dress',
    name: 'Boutique & Dress',
    description: 'Sarees, kurtis, kids wear and fashion',
    examples: ['Sarees', 'Kurtis', 'Kids Wear', 'Fashion'],
    icon: 'Shirt',
  },
  {
    id: 'home-bakery',
    name: 'Home Bakery & Cakes',
    description: 'Cakes, brownies, cupcakes and snacks',
    examples: ['Cakes', 'Brownies', 'Cupcakes', 'Snacks'],
    icon: 'CakeSlice',
  },
  {
    id: 'home-food',
    name: 'Home Food',
    description: 'Homemade food, lunch boxes and snacks',
    examples: ['Homemade Food', 'Lunch Box', 'Snacks'],
    icon: 'UtensilsCrossed',
  },
  {
    id: 'beauty-makeup',
    name: 'Beauty & Makeup',
    description: 'Makeup, bridal makeup and beauty services',
    examples: ['Makeup', 'Bridal Makeup', 'Beauty Services'],
    icon: 'Sparkles',
  },
  {
    id: 'tailoring',
    name: 'Tailoring & Alterations',
    description: 'Blouse stitching, dress stitching and alterations',
    examples: ['Blouse Stitching', 'Dress Stitching', 'Alterations'],
    icon: 'Scissors',
  },
  {
    id: 'jewellery',
    name: 'Jewellery & Accessories',
    description: 'Handmade and imitation jewellery, accessories',
    examples: ['Handmade Jewellery', 'Imitation Jewellery', 'Accessories'],
    icon: 'Gem',
  },
  {
    id: 'handmade-gifts',
    name: 'Handmade & Gifts',
    description: 'Handmade products, gift boxes, candles and crafts',
    examples: ['Handmade Products', 'Gift Boxes', 'Candles', 'Crafts'],
    icon: 'Gift',
  },
  {
    id: 'mehndi-henna',
    name: 'Mehndi & Henna',
    description: 'Bridal and event mehndi',
    examples: ['Bridal Mehndi', 'Event Mehndi'],
    icon: 'Flower2',
  },
  {
    id: 'plants-garden',
    name: 'Plants & Home Garden',
    description: 'Plants, pots and gardening products',
    examples: ['Plants', 'Pots', 'Gardening Products'],
    icon: 'Sprout',
  },
  {
    id: 'home-decor',
    name: 'Home Décor',
    description: 'Wall décor, handmade décor and home accessories',
    examples: ['Wall Décor', 'Handmade Décor', 'Home Accessories'],
    icon: 'Lamp',
  },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);
