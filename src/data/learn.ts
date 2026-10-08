/** Learn cards (PRD 4.11): short swipeable cards in three languages. */
import type { Lang } from '../lib/types';

export interface LearnCard {
  id: string;
  color: string; // token, e.g. var(--wet)
  title: Record<Lang, string>;
  body: Record<Lang, string>;
}

export const LEARN_CARDS: LearnCard[] = [
  {
    id: 'wet',
    color: 'var(--wet)',
    title: { en: 'Green bin: wet waste', hi: 'हरा डिब्बा: गीला कचरा', kn: 'ಹಸಿರು ಡಬ್ಬಿ: ಹಸಿ ಕಸ' },
    body: {
      en: 'Food scraps, peels, tea leaves, eggshells, flowers and leaves. It rots, so it becomes compost.',
      hi: 'खाने का बचा हुआ, छिलके, चाय पत्ती, अंडे के छिलके, फूल और पत्ते। यह सड़ता है, इसलिए खाद बनता है।',
      kn: 'ಉಳಿದ ಆಹಾರ, ಸಿಪ್ಪೆ, ಚಹಾ ಎಲೆ, ಮೊಟ್ಟೆ ಚಿಪ್ಪು, ಹೂವು, ಎಲೆಗಳು. ಇದು ಕೊಳೆಯುತ್ತದೆ, ಆದ್ದರಿಂದ ಗೊಬ್ಬರವಾಗುತ್ತದೆ.',
    },
  },
  {
    id: 'dry',
    color: 'var(--dry)',
    title: { en: 'Blue bin: dry waste', hi: 'नीला डिब्बा: सूखा कचरा', kn: 'ನೀಲಿ ಡಬ್ಬಿ: ಒಣ ಕಸ' },
    body: {
      en: 'Plastic, paper, cardboard, metal, glass and cloth. Keep it clean and dry so it can be recycled.',
      hi: 'प्लास्टिक, कागज़, गत्ता, धातु, काँच और कपड़ा। साफ़ और सूखा रखें ताकि रीसायकल हो सके।',
      kn: 'ಪ್ಲಾಸ್ಟಿಕ್, ಕಾಗದ, ರಟ್ಟು, ಲೋಹ, ಗಾಜು ಮತ್ತು ಬಟ್ಟೆ. ಮರುಬಳಕೆಗಾಗಿ ಸ್ವಚ್ಛ ಮತ್ತು ಒಣವಾಗಿ ಇಡಿ.',
    },
  },
  {
    id: 'hazardous',
    color: 'var(--hazardous)',
    title: { en: 'Red: hazardous waste', hi: 'लाल: खतरनाक कचरा', kn: 'ಕೆಂಪು: ಅಪಾಯಕಾರಿ ಕಸ' },
    body: {
      en: 'Batteries, bulbs, medicines, paint, sharp items and sanitary waste. Keep it separate and wrapped.',
      hi: 'बैटरी, बल्ब, दवाइयाँ, पेंट, नुकीली चीज़ें और सैनिटरी कचरा। अलग और लपेटकर रखें।',
      kn: 'ಬ್ಯಾಟರಿ, ಬಲ್ಬ್, ಔಷಧಿ, ಬಣ್ಣ, ಚೂಪಾದ ವಸ್ತು ಮತ್ತು ಸ್ಯಾನಿಟರಿ ಕಸ. ಬೇರೆಯಾಗಿ ಸುತ್ತಿ ಇಡಿ.',
    },
  },
  {
    id: 'why',
    color: 'var(--primary)',
    title: { en: 'Why segregate?', hi: 'अलग क्यों करें?', kn: 'ಏಕೆ ಬೇರ್ಪಡಿಸಬೇಕು?' },
    body: {
      en: 'Mixed waste ends up in landfills that burn and pollute. Sorted waste becomes compost and new products.',
      hi: 'मिला हुआ कचरा लैंडफ़िल में जाता है जो जलते और प्रदूषण फैलाते हैं। छाँटा हुआ कचरा खाद और नए सामान बनता है।',
      kn: 'ಬೆರೆತ ಕಸ ಭೂಭರ್ತಿಗೆ ಹೋಗಿ ಸುಟ್ಟು ಮಾಲಿನ್ಯ ಮಾಡುತ್ತದೆ. ವಿಂಗಡಿಸಿದ ಕಸ ಗೊಬ್ಬರ ಮತ್ತು ಹೊಸ ವಸ್ತುಗಳಾಗುತ್ತದೆ.',
    },
  },
  {
    id: 'ewaste',
    color: 'var(--accent)',
    title: { en: 'E-waste', hi: 'ई-कचरा', kn: 'ಇ-ತ್ಯಾಜ್ಯ' },
    body: {
      en: 'Old phones, chargers, cables and earphones. Give them to an authorised e-waste collector, never the dustbin.',
      hi: 'पुराने फ़ोन, चार्जर, तार और ईयरफ़ोन। अधिकृत ई-कचरा संग्रहकर्ता को दें, कूड़ेदान में कभी नहीं।',
      kn: 'ಹಳೆಯ ಫೋನ್, ಚಾರ್ಜರ್, ಕೇಬಲ್ ಮತ್ತು ಇಯರ್‌ಫೋನ್. ಅಧಿಕೃತ ಇ-ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹಕಾರರಿಗೆ ಕೊಡಿ, ಕಸದ ಡಬ್ಬಿಗೆ ಎಂದಿಗೂ ಬೇಡ.',
    },
  },
  {
    id: 'medicine',
    color: 'var(--hazardous)',
    title: { en: 'Medicines', hi: 'दवाइयाँ', kn: 'ಔಷಧಿಗಳು' },
    body: {
      en: 'Never flush medicines. Keep them in their strips and return them to a pharmacy take-back box.',
      hi: 'दवाइयाँ कभी फ़्लश न करें। पत्ते में रखें और फ़ार्मेसी के वापसी बॉक्स में दें।',
      kn: 'ಔಷಧಿಗಳನ್ನು ಎಂದಿಗೂ ಫ್ಲಶ್ ಮಾಡಬೇಡಿ. ಸ್ಟ್ರಿಪ್‌ನಲ್ಲೇ ಇಟ್ಟು ಫಾರ್ಮಸಿ ಪೆಟ್ಟಿಗೆಗೆ ಹಿಂತಿರುಗಿಸಿ.',
    },
  },
  {
    id: 'sanitary',
    color: 'var(--hazardous)',
    title: { en: 'Sanitary waste', hi: 'सैनिटरी कचरा', kn: 'ಸ್ಯಾನಿಟರಿ ಕಸ' },
    body: {
      en: 'Wrap used pads and diapers in paper and mark them with a red dot. This keeps waste workers safe.',
      hi: 'इस्तेमाल किए पैड और डायपर कागज़ में लपेटें और लाल बिंदु लगाएँ। इससे सफ़ाई कर्मचारी सुरक्षित रहते हैं।',
      kn: 'ಬಳಸಿದ ಪ್ಯಾಡ್ ಮತ್ತು ಡೈಪರ್‌ಗಳನ್ನು ಕಾಗದದಲ್ಲಿ ಸುತ್ತಿ ಕೆಂಪು ಚುಕ್ಕೆ ಹಾಕಿ. ಇದರಿಂದ ಸ್ವಚ್ಛತಾ ಕಾರ್ಮಿಕರು ಸುರಕ್ಷಿತ.',
    },
  },
];
