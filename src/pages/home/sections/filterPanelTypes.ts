export type ViewOptionTone =
  "top200" | "buy" | "like" | "surge" | "new" | "music";

export interface ViewOption {
  id: string;
  label: string;
  disabled?: boolean;
  live?: boolean;
  tone?: ViewOptionTone;
}

export interface RegionOption {
  label: string;
  value: string;
}
