import { z } from "zod";

/**
 * Typed application settings stored in `app_setting` (key to jsonb). Each key
 * has a schema and a default, so reading a setting never yields an invalid
 * or missing value.
 */
export const SETTINGS = {
  "org.displayName": {
    label: "Organisation display name",
    schema: z.string().min(1).max(60),
    default: "AECOM GIS Practice",
  },
  "org.timeZone": {
    label: "Organisation time zone (IANA)",
    schema: z.string().min(1),
    default: "Asia/Dubai",
  },
  "report.itemsPerBlock": {
    label: "Items shown per block on the project update page",
    schema: z.coerce.number().int().min(1).max(20),
    default: 8,
  },
  "report.periodDays": {
    label: "Length of a reporting period in days",
    schema: z.coerce.number().int().min(7).max(31),
    default: 14,
  },
  "map.styleUrl": {
    label: "Map style URL (MapLibre style JSON; empty = built-in OpenStreetMap raster style)",
    schema: z.string().url().or(z.literal("")),
    default: "",
  },
  "map.center": {
    label: "Default map centre and zoom",
    schema: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      zoom: z.number().min(1).max(18),
    }),
    default: { lat: 24.5, lng: 46.5, zoom: 4.2 },
  },
  "planner.url": {
    label: "Resource Planner URL (shown in the header; empty = hidden)",
    schema: z.string().url().or(z.literal("")),
    default: "",
  },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>;
export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];

export function parseSetting<K extends SettingKey>(key: K, raw: unknown): SettingValue<K> {
  const def = SETTINGS[key];
  const result = def.schema.safeParse(raw);
  return (result.success ? result.data : def.default) as SettingValue<K>;
}
