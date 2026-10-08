/**
 * Cities that compete on the leaderboard, each with a centre point and some
 * area names (localities). Users pick a home city and a locality (never an
 * exact address). A report counts for the city its pin is in.
 *
 * To add a city: add it here AND add its id to cityIds() in firestore.rules.
 */
import type { Lang } from './types';

export interface Locality {
  name: string;
  lat: number;
  lng: number;
}

export interface City {
  id: string;
  name: Record<Lang, string>;
  lat: number;
  lng: number;
  localities: Locality[];
}

export const CITIES: City[] = [
  {
    id: 'bengaluru',
    name: { en: 'Bengaluru', hi: 'बेंगलुरु', kn: 'ಬೆಂಗಳೂರು' },
    lat: 12.9716,
    lng: 77.5946,
    localities: [
      { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
      { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
      { name: 'HSR Layout', lat: 12.9116, lng: 77.6474 },
      { name: 'Jayanagar', lat: 12.925, lng: 77.5938 },
      { name: 'JP Nagar', lat: 12.9063, lng: 77.5857 },
      { name: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
      { name: 'Basavanagudi', lat: 12.9416, lng: 77.5756 },
      { name: 'Malleshwaram', lat: 13.0035, lng: 77.5709 },
      { name: 'Rajajinagar', lat: 12.9915, lng: 77.5544 },
      { name: 'Hebbal', lat: 13.0358, lng: 77.597 },
      { name: 'Whitefield', lat: 12.9698, lng: 77.75 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.6974 },
      { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
      { name: 'Banashankari', lat: 12.9255, lng: 77.5468 },
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
      { name: 'MG Road', lat: 12.9756, lng: 77.6066 },
    ],
  },
  {
    id: 'mysuru',
    name: { en: 'Mysuru', hi: 'मैसूरु', kn: 'ಮೈಸೂರು' },
    lat: 12.2958,
    lng: 76.6394,
    localities: [
      { name: 'Vijayanagar', lat: 12.3375, lng: 76.6123 },
      { name: 'Kuvempunagar', lat: 12.2851, lng: 76.6236 },
      { name: 'Saraswathipuram', lat: 12.3004, lng: 76.6266 },
      { name: 'Gokulam', lat: 12.3302, lng: 76.6305 },
      { name: 'Jayalakshmipuram', lat: 12.3241, lng: 76.6261 },
      { name: 'Hebbal (Mysuru)', lat: 12.3478, lng: 76.6098 },
    ],
  },
  {
    id: 'mumbai',
    name: { en: 'Mumbai', hi: 'मुंबई', kn: 'ಮುಂಬೈ' },
    lat: 19.076,
    lng: 72.8777,
    localities: [
      { name: 'Andheri', lat: 19.1136, lng: 72.8697 },
      { name: 'Bandra', lat: 19.0596, lng: 72.8295 },
      { name: 'Dadar', lat: 19.0178, lng: 72.8478 },
      { name: 'Colaba', lat: 18.9067, lng: 72.8147 },
      { name: 'Powai', lat: 19.1176, lng: 72.906 },
      { name: 'Borivali', lat: 19.2307, lng: 72.8567 },
      { name: 'Chembur', lat: 19.0522, lng: 72.9005 },
      { name: 'Goregaon', lat: 19.1663, lng: 72.8526 },
    ],
  },
  {
    id: 'pune',
    name: { en: 'Pune', hi: 'पुणे', kn: 'ಪುಣೆ' },
    lat: 18.5204,
    lng: 73.8567,
    localities: [
      { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
      { name: 'Hinjewadi', lat: 18.5913, lng: 73.7389 },
      { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
      { name: 'Aundh', lat: 18.5602, lng: 73.8031 },
      { name: 'Hadapsar', lat: 18.5089, lng: 73.926 },
      { name: 'Shivajinagar (Pune)', lat: 18.5308, lng: 73.8475 },
    ],
  },
  {
    id: 'delhi',
    name: { en: 'Delhi', hi: 'दिल्ली', kn: 'ದೆಹಲಿ' },
    lat: 28.6139,
    lng: 77.209,
    localities: [
      { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
      { name: 'Dwarka', lat: 28.5921, lng: 77.046 },
      { name: 'Rohini', lat: 28.7495, lng: 77.0565 },
      { name: 'Lajpat Nagar', lat: 28.5677, lng: 77.2433 },
      { name: 'Karol Bagh', lat: 28.6519, lng: 77.1909 },
      { name: 'Saket', lat: 28.5245, lng: 77.2066 },
      { name: 'Mayur Vihar', lat: 28.6077, lng: 77.2938 },
      { name: 'Janakpuri', lat: 28.6219, lng: 77.0878 },
    ],
  },
  {
    id: 'chennai',
    name: { en: 'Chennai', hi: 'चेन्नई', kn: 'ಚೆನ್ನೈ' },
    lat: 13.0827,
    lng: 80.2707,
    localities: [
      { name: 'T Nagar', lat: 13.0418, lng: 80.2341 },
      { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
      { name: 'Anna Nagar', lat: 13.085, lng: 80.2101 },
      { name: 'Velachery', lat: 12.9815, lng: 80.218 },
      { name: 'Mylapore', lat: 13.0368, lng: 80.2676 },
      { name: 'Tambaram', lat: 12.9249, lng: 80.1 },
    ],
  },
  {
    id: 'hyderabad',
    name: { en: 'Hyderabad', hi: 'हैदराबाद', kn: 'ಹೈದರಾಬಾದ್' },
    lat: 17.385,
    lng: 78.4867,
    localities: [
      { name: 'Banjara Hills', lat: 17.4156, lng: 78.4347 },
      { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
      { name: 'Kukatpally', lat: 17.4849, lng: 78.4138 },
      { name: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
      { name: 'Madhapur', lat: 17.4483, lng: 78.3915 },
      { name: 'Dilsukhnagar', lat: 17.3688, lng: 78.5247 },
    ],
  },
  {
    id: 'kolkata',
    name: { en: 'Kolkata', hi: 'कोलकाता', kn: 'ಕೋಲ್ಕತ್ತಾ' },
    lat: 22.5726,
    lng: 88.3639,
    localities: [
      { name: 'Salt Lake', lat: 22.5867, lng: 88.4171 },
      { name: 'Park Street', lat: 22.5535, lng: 88.3525 },
      { name: 'Howrah', lat: 22.5958, lng: 88.2636 },
      { name: 'Gariahat', lat: 22.5186, lng: 88.3656 },
      { name: 'New Town', lat: 22.5806, lng: 88.4612 },
      { name: 'Behala', lat: 22.4983, lng: 88.3101 },
    ],
  },
  {
    id: 'ahmedabad',
    name: { en: 'Ahmedabad', hi: 'अहमदाबाद', kn: 'ಅಹಮದಾಬಾದ್' },
    lat: 23.0225,
    lng: 72.5714,
    localities: [
      { name: 'Navrangpura', lat: 23.0365, lng: 72.5611 },
      { name: 'Satellite', lat: 23.0301, lng: 72.5176 },
      { name: 'Maninagar', lat: 22.9962, lng: 72.6031 },
      { name: 'Bodakdev', lat: 23.0386, lng: 72.5108 },
      { name: 'Chandkheda', lat: 23.1092, lng: 72.5847 },
    ],
  },
  {
    id: 'jaipur',
    name: { en: 'Jaipur', hi: 'जयपुर', kn: 'ಜೈಪುರ' },
    lat: 26.9124,
    lng: 75.7873,
    localities: [
      { name: 'Malviya Nagar (Jaipur)', lat: 26.8549, lng: 75.8243 },
      { name: 'Vaishali Nagar', lat: 26.9116, lng: 75.7425 },
      { name: 'Mansarovar', lat: 26.8705, lng: 75.7616 },
      { name: 'C-Scheme', lat: 26.9061, lng: 75.8017 },
      { name: 'Raja Park', lat: 26.8996, lng: 75.8299 },
    ],
  },
  {
    id: 'lucknow',
    name: { en: 'Lucknow', hi: 'लखनऊ', kn: 'ಲಖನೌ' },
    lat: 26.8467,
    lng: 80.9462,
    localities: [
      { name: 'Gomti Nagar', lat: 26.8505, lng: 81.0047 },
      { name: 'Hazratganj', lat: 26.8505, lng: 80.9466 },
      { name: 'Aliganj', lat: 26.8953, lng: 80.9415 },
      { name: 'Indira Nagar (Lucknow)', lat: 26.8781, lng: 80.9973 },
      { name: 'Alambagh', lat: 26.8131, lng: 80.9025 },
    ],
  },
  {
    id: 'kochi',
    name: { en: 'Kochi', hi: 'कोच्चि', kn: 'ಕೊಚ್ಚಿ' },
    lat: 9.9312,
    lng: 76.2673,
    localities: [
      { name: 'Ernakulam', lat: 9.9816, lng: 76.2999 },
      { name: 'Kakkanad', lat: 10.0159, lng: 76.3419 },
      { name: 'Edappally', lat: 10.0261, lng: 76.3083 },
      { name: 'Fort Kochi', lat: 9.9658, lng: 76.2421 },
      { name: 'Vyttila', lat: 9.9658, lng: 76.3196 },
    ],
  },
  {
    id: 'indore',
    name: { en: 'Indore', hi: 'इंदौर', kn: 'ಇಂದೋರ್' },
    lat: 22.7196,
    lng: 75.8577,
    localities: [
      { name: 'Vijay Nagar (Indore)', lat: 22.7533, lng: 75.8937 },
      { name: 'Palasia', lat: 22.7244, lng: 75.8839 },
      { name: 'Rajwada', lat: 22.7186, lng: 75.8553 },
      { name: 'Bhawarkua', lat: 22.6936, lng: 75.8676 },
    ],
  },
  {
    id: 'chandigarh',
    name: { en: 'Chandigarh', hi: 'चंडीगढ़', kn: 'ಚಂಡೀಗಢ' },
    lat: 30.7333,
    lng: 76.7794,
    localities: [
      { name: 'Sector 17', lat: 30.7398, lng: 76.7827 },
      { name: 'Sector 22', lat: 30.7333, lng: 76.7726 },
      { name: 'Sector 35', lat: 30.7225, lng: 76.7587 },
      { name: 'Manimajra', lat: 30.7187, lng: 76.8326 },
    ],
  },
  {
    id: 'coimbatore',
    name: { en: 'Coimbatore', hi: 'कोयंबटूर', kn: 'ಕೊಯಮತ್ತೂರು' },
    lat: 11.0168,
    lng: 76.9558,
    localities: [
      { name: 'RS Puram', lat: 11.0089, lng: 76.9502 },
      { name: 'Gandhipuram', lat: 11.0183, lng: 76.9682 },
      { name: 'Peelamedu', lat: 11.0306, lng: 77.0244 },
      { name: 'Saibaba Colony', lat: 11.0247, lng: 76.9446 },
    ],
  },
  {
    id: 'mangaluru',
    name: { en: 'Mangaluru', hi: 'मंगलुरु', kn: 'ಮಂಗಳೂರು' },
    lat: 12.9141,
    lng: 74.856,
    localities: [
      { name: 'Hampankatta', lat: 12.8698, lng: 74.8431 },
      { name: 'Kadri', lat: 12.8857, lng: 74.8556 },
      { name: 'Bejai', lat: 12.8899, lng: 74.8442 },
      { name: 'Surathkal', lat: 13.0108, lng: 74.7943 },
    ],
  },
  {
    id: 'hubballi',
    name: { en: 'Hubballi-Dharwad', hi: 'हुबली-धारवाड़', kn: 'ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡ' },
    lat: 15.3647,
    lng: 75.124,
    localities: [
      { name: 'Vidyanagar (Hubballi)', lat: 15.3666, lng: 75.1239 },
      { name: 'Keshwapur', lat: 15.3478, lng: 75.1407 },
      { name: 'Dharwad', lat: 15.4589, lng: 75.0078 },
      { name: 'Gokul Road', lat: 15.3549, lng: 75.0994 },
    ],
  },
  {
    id: 'bhopal',
    name: { en: 'Bhopal', hi: 'भोपाल', kn: 'ಭೋಪಾಲ್' },
    lat: 23.2599,
    lng: 77.4126,
    localities: [
      { name: 'MP Nagar', lat: 23.2332, lng: 77.4343 },
      { name: 'Arera Colony', lat: 23.2142, lng: 77.4335 },
      { name: 'Kolar Road', lat: 23.1797, lng: 77.4166 },
      { name: 'TT Nagar', lat: 23.2384, lng: 77.3977 },
    ],
  },
];

export const DEFAULT_CITY = CITIES[0];
export const CITY_IDS = CITIES.map((c) => c.id);

/** Colour tokens from tokens.css, given out to cities in turn. */
const PALETTE = ['--city-1', '--city-2', '--city-3', '--city-4', '--city-5', '--city-6', '--city-7', '--city-8'];

export function cityColourVar(cityId: string): string {
  const i = Math.max(0, CITY_IDS.indexOf(cityId));
  return PALETTE[i % PALETTE.length];
}

export function findCity(id: string | undefined): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/** A city's name in the user's language. */
export function cityName(id: string, lang: Lang): string {
  return findCity(id)?.name[lang] ?? id;
}

/** Read a token's current value, e.g. tokenValue('--city-1') -> "#7c3aed". */
export function tokenValue(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}
