export interface PublicEquipmentItem {
  id: string;
  slug: string;
  cat: string;
  catLabel: string;
  brand: string;
  name: string;
  desc: string;
  specs: string[];
  price: number;
  priceType: 'numeric' | 'on_request';
  priceTax: 'HT' | 'TTC';
  priceHT: number;
  priceTTC: number;
  image: string | null;
  quantity: number;
  isPack: boolean;
}

export interface CategoryItem {
  id: string;
  label: string;
}
