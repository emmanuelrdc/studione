export interface PosSettings {
  id: 1;
  theme: "dark" | "light";
  allow_discounts: 0 | 1;
  allow_promotions: 0 | 1;
  show_clients_panel: 0 | 1;
  birthday_discount_enabled: 0 | 1;
  birthday_discount_percent: number;
  updated_by: number | null;
  updated_at: string;
}

export interface Promotion {
  id: number;
  name: string;
  type: "percent" | "fixed";
  discount_value: number;
  target_type: "product" | "service" | "all";
  target_id: number | null;
  valid_from: string | null;
  valid_to: string | null;
  active: 0 | 1;
  is_current: 0 | 1;
  created_at: string;
}

export const DEFAULT_POS_SETTINGS: PosSettings = {
  id: 1,
  theme: "dark",
  allow_discounts: 0,
  allow_promotions: 0,
  show_clients_panel: 1,
  birthday_discount_enabled: 0,
  birthday_discount_percent: 0,
  updated_by: null,
  updated_at: new Date().toISOString(),
};
