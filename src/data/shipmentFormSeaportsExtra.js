/** Seaport names by ISO country code (excluding IN/US — see shipmentFormPorts.js) */

/** @type {Readonly<Record<string, readonly string[]>>} */
export const SEAPORT_NAMES_BY_COUNTRY_CODE = {
  CN: [
    "Shanghai",
    "Shenzhen",
    "Ningbo-Zhoushan",
    "Qingdao",
    "Guangzhou",
    "Tianjin",
    "Xiamen",
    "Dalian",
  ],
  SG: ["Singapore"],
  AE: ["Jebel Ali", "Dubai", "Abu Dhabi", "Sharjah"],
  DE: ["Hamburg", "Bremerhaven", "Wilhelmshaven"],
  GB: ["Felixstowe", "Southampton", "London Gateway", "Liverpool"],
  NL: ["Rotterdam", "Amsterdam"],
  HK: ["Hong Kong"],
  JP: ["Tokyo", "Yokohama", "Osaka", "Kobe", "Nagoya"],
  KR: ["Busan", "Incheon", "Gwangyang"],
  AU: ["Melbourne", "Sydney", "Brisbane", "Fremantle"],
  BR: ["Santos", "Paranaguá", "Rio de Janeiro"],
  SA: ["Jeddah", "Dammam", "King Abdullah Port"],
  FR: ["Le Havre", "Marseille", "Dunkirk"],
  IT: ["Genoa", "La Spezia", "Gioia Tauro", "Trieste"],
  ES: ["Valencia", "Barcelona", "Algeciras"],
  CA: ["Vancouver", "Montreal", "Halifax", "Prince Rupert"],
  MX: ["Manzanillo", "Lázaro Cárdenas", "Veracruz", "Altamira"],
  VN: ["Ho Chi Minh City (Cat Lai)", "Hai Phong", "Da Nang"],
};
