/**
 * Starter quiz questions in all three languages. The app uses these when
 * there are no admin-created questions in Firestore (quizQuestions), and the
 * Admin "Load starter content" button copies them into Firestore.
 */
import type { Lang } from '../lib/types';

interface Text {
  q: string;
  options: string[];
  why: string;
}
export interface StarterQuestion {
  id: string;
  answerIndex: number;
  text: Record<Lang, Text>;
}

export const STARTER_QUIZ: StarterQuestion[] = [
  {
    id: 'battery',
    answerIndex: 2,
    text: {
      en: { q: 'Where does a used battery go?', options: ['Wet bin', 'Dry bin', 'Hazardous', 'Drain'], why: 'Batteries leak harmful chemicals, so they are hazardous waste.' },
      hi: { q: 'इस्तेमाल की हुई बैटरी कहाँ जाती है?', options: ['गीला डिब्बा', 'सूखा डिब्बा', 'खतरनाक', 'नाली'], why: 'बैटरी से हानिकारक रसायन रिसते हैं, इसलिए यह खतरनाक कचरा है।' },
      kn: { q: 'ಬಳಸಿದ ಬ್ಯಾಟರಿ ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತದೆ?', options: ['ಹಸಿ ಡಬ್ಬಿ', 'ಒಣ ಡಬ್ಬಿ', 'ಅಪಾಯಕಾರಿ', 'ಚರಂಡಿ'], why: 'ಬ್ಯಾಟರಿಗಳಿಂದ ಹಾನಿಕಾರಕ ರಾಸಾಯನಿಕ ಸೋರುತ್ತದೆ, ಆದ್ದರಿಂದ ಅವು ಅಪಾಯಕಾರಿ ಕಸ.' },
    },
  },
  {
    id: 'peel',
    answerIndex: 0,
    text: {
      en: { q: 'Which bin is right for vegetable peels?', options: ['Green (wet)', 'Blue (dry)', 'Red (hazardous)', 'Any bin'], why: 'Peels are food waste and turn into compost.' },
      hi: { q: 'सब्ज़ी के छिलकों के लिए सही डिब्बा कौन सा है?', options: ['हरा (गीला)', 'नीला (सूखा)', 'लाल (खतरनाक)', 'कोई भी'], why: 'छिलके खाने का कचरा हैं और खाद बन जाते हैं।' },
      kn: { q: 'ತರಕಾರಿ ಸಿಪ್ಪೆಗಳಿಗೆ ಸರಿಯಾದ ಡಬ್ಬಿ ಯಾವುದು?', options: ['ಹಸಿರು (ಹಸಿ)', 'ನೀಲಿ (ಒಣ)', 'ಕೆಂಪು (ಅಪಾಯಕಾರಿ)', 'ಯಾವುದಾದರೂ'], why: 'ಸಿಪ್ಪೆಗಳು ಆಹಾರ ಕಸ, ಅವು ಗೊಬ್ಬರವಾಗುತ್ತವೆ.' },
    },
  },
  {
    id: 'milk',
    answerIndex: 1,
    text: {
      en: { q: 'What should you do with a milk packet before binning it?', options: ['Burn it', 'Rinse and dry it', 'Fill it with peels', 'Nothing'], why: 'Clean, dry plastic can be recycled; dirty plastic usually cannot.' },
      hi: { q: 'दूध की थैली फेंकने से पहले क्या करें?', options: ['जला दें', 'धोकर सुखाएँ', 'छिलके भर दें', 'कुछ नहीं'], why: 'साफ़, सूखा प्लास्टिक रीसायकल हो सकता है; गंदा अक्सर नहीं।' },
      kn: { q: 'ಹಾಲಿನ ಪ್ಯಾಕೆಟ್ ಎಸೆಯುವ ಮೊದಲು ಏನು ಮಾಡಬೇಕು?', options: ['ಸುಡಬೇಕು', 'ತೊಳೆದು ಒಣಗಿಸಬೇಕು', 'ಸಿಪ್ಪೆ ತುಂಬಬೇಕು', 'ಏನೂ ಬೇಡ'], why: 'ಸ್ವಚ್ಛ, ಒಣ ಪ್ಲಾಸ್ಟಿಕ್ ಮರುಬಳಕೆಯಾಗುತ್ತದೆ; ಕೊಳಕು ಪ್ಲಾಸ್ಟಿಕ್ ಸಾಮಾನ್ಯವಾಗಿ ಆಗದು.' },
    },
  },
  {
    id: 'sanitary',
    answerIndex: 3,
    text: {
      en: { q: 'How should used sanitary pads be thrown away?', options: ['Flush them', 'In the wet bin', 'Loose in the dry bin', 'Wrapped in paper, marked red'], why: 'Wrapping and marking keeps waste pickers safe.' },
      hi: { q: 'इस्तेमाल किए सैनिटरी पैड कैसे फेंकें?', options: ['फ़्लश करें', 'गीले डिब्बे में', 'खुले में सूखे डिब्बे में', 'कागज़ में लपेटकर, लाल निशान लगाकर'], why: 'लपेटने और निशान लगाने से कचरा उठाने वाले सुरक्षित रहते हैं।' },
      kn: { q: 'ಬಳಸಿದ ಸ್ಯಾನಿಟರಿ ಪ್ಯಾಡ್ ಹೇಗೆ ಎಸೆಯಬೇಕು?', options: ['ಫ್ಲಶ್ ಮಾಡಿ', 'ಹಸಿ ಡಬ್ಬಿಗೆ', 'ಹಾಗೆಯೇ ಒಣ ಡಬ್ಬಿಗೆ', 'ಕಾಗದದಲ್ಲಿ ಸುತ್ತಿ, ಕೆಂಪು ಗುರುತು ಹಾಕಿ'], why: 'ಸುತ್ತಿ ಗುರುತು ಹಾಕಿದರೆ ಕಸ ಸಂಗ್ರಹಕಾರರು ಸುರಕ್ಷಿತ.' },
    },
  },
  {
    id: 'medicine',
    answerIndex: 1,
    text: {
      en: { q: 'Where should expired medicines go?', options: ['Down the sink', 'Pharmacy take-back or hazardous', 'Wet bin', 'On the road'], why: 'Medicines can poison water and soil, so they are hazardous.' },
      hi: { q: 'पुरानी (एक्सपायर्ड) दवाइयाँ कहाँ दें?', options: ['सिंक में बहा दें', 'फ़ार्मेसी वापसी या खतरनाक', 'गीला डिब्बा', 'सड़क पर'], why: 'दवाइयाँ पानी और मिट्टी को ज़हरीला कर सकती हैं, इसलिए खतरनाक हैं।' },
      kn: { q: 'ಅವಧಿ ಮೀರಿದ ಔಷಧಿಗಳು ಎಲ್ಲಿಗೆ?', options: ['ಸಿಂಕ್‌ಗೆ', 'ಫಾರ್ಮಸಿ ಹಿಂತಿರುಗಿಸುವಿಕೆ ಅಥವಾ ಅಪಾಯಕಾರಿ', 'ಹಸಿ ಡಬ್ಬಿ', 'ರಸ್ತೆಗೆ'], why: 'ಔಷಧಿಗಳು ನೀರು ಮತ್ತು ಮಣ್ಣನ್ನು ವಿಷಗೊಳಿಸಬಹುದು, ಆದ್ದರಿಂದ ಅಪಾಯಕಾರಿ.' },
    },
  },
  {
    id: 'newspaper',
    answerIndex: 1,
    text: {
      en: { q: 'Old newspaper is…', options: ['Wet waste', 'Dry waste', 'Hazardous waste', 'Not waste'], why: 'Dry paper is recyclable dry waste. Kabadiwalas buy it too!' },
      hi: { q: 'पुराना अख़बार है…', options: ['गीला कचरा', 'सूखा कचरा', 'खतरनाक कचरा', 'कचरा नहीं'], why: 'सूखा कागज़ रीसायकल होने वाला सूखा कचरा है। कबाड़ीवाले भी इसे ख़रीदते हैं!' },
      kn: { q: 'ಹಳೆಯ ದಿನಪತ್ರಿಕೆ…', options: ['ಹಸಿ ಕಸ', 'ಒಣ ಕಸ', 'ಅಪಾಯಕಾರಿ ಕಸ', 'ಕಸವಲ್ಲ'], why: 'ಒಣ ಕಾಗದ ಮರುಬಳಕೆಯ ಒಣ ಕಸ. ಗುಜರಿಯವರೂ ಖರೀದಿಸುತ್ತಾರೆ!' },
    },
  },
  {
    id: 'cfl',
    answerIndex: 2,
    text: {
      en: { q: 'A broken CFL bulb contains…', options: ['Sugar', 'Water', 'Mercury', 'Nothing'], why: 'Mercury is toxic, so CFLs and tube lights are hazardous.' },
      hi: { q: 'टूटे CFL बल्ब में होता है…', options: ['चीनी', 'पानी', 'पारा', 'कुछ नहीं'], why: 'पारा ज़हरीला है, इसलिए CFL और ट्यूबलाइट खतरनाक कचरा हैं।' },
      kn: { q: 'ಒಡೆದ CFL ಬಲ್ಬ್‌ನಲ್ಲಿ ಇರುವುದು…', options: ['ಸಕ್ಕರೆ', 'ನೀರು', 'ಪಾದರಸ', 'ಏನೂ ಇಲ್ಲ'], why: 'ಪಾದರಸ ವಿಷಕಾರಿ, ಆದ್ದರಿಂದ CFL ಮತ್ತು ಟ್ಯೂಬ್‌ಲೈಟ್ ಅಪಾಯಕಾರಿ.' },
    },
  },
  {
    id: 'compost',
    answerIndex: 0,
    text: {
      en: { q: 'About how long does home compost take?', options: ['6–8 weeks', '1 day', '10 years', 'It never works'], why: 'With mixing and the right moisture, compost is ready in about 2 months.' },
      hi: { q: 'घर पर खाद बनने में लगभग कितना समय लगता है?', options: ['6–8 हफ़्ते', '1 दिन', '10 साल', 'कभी नहीं बनती'], why: 'सही नमी और मिलाने से खाद लगभग 2 महीने में तैयार होती है।' },
      kn: { q: 'ಮನೆ ಗೊಬ್ಬರಕ್ಕೆ ಸುಮಾರು ಎಷ್ಟು ಸಮಯ ಬೇಕು?', options: ['6–8 ವಾರ', '1 ದಿನ', '10 ವರ್ಷ', 'ಎಂದಿಗೂ ಆಗದು'], why: 'ಸರಿಯಾದ ತೇವ ಮತ್ತು ಕಲಕುವಿಕೆಯಿಂದ ಸುಮಾರು 2 ತಿಂಗಳಲ್ಲಿ ಗೊಬ್ಬರ ಸಿದ್ಧ.' },
    },
  },
  {
    id: 'burn',
    answerIndex: 3,
    text: {
      en: { q: 'Why should we never burn garbage?', options: ['It is too slow', 'It smells nice', 'It wastes matches', 'The smoke is toxic'], why: 'Burning plastic and waste releases harmful gases.' },
      hi: { q: 'कचरा कभी क्यों नहीं जलाना चाहिए?', options: ['बहुत धीमा है', 'अच्छी खुशबू आती है', 'माचिस बर्बाद होती है', 'धुआँ ज़हरीला है'], why: 'प्लास्टिक और कचरा जलाने से हानिकारक गैसें निकलती हैं।' },
      kn: { q: 'ಕಸವನ್ನು ಎಂದಿಗೂ ಏಕೆ ಸುಡಬಾರದು?', options: ['ತುಂಬಾ ನಿಧಾನ', 'ಒಳ್ಳೆಯ ವಾಸನೆ', 'ಬೆಂಕಿಪೊಟ್ಟಣ ವ್ಯರ್ಥ', 'ಹೊಗೆ ವಿಷಕಾರಿ'], why: 'ಪ್ಲಾಸ್ಟಿಕ್ ಮತ್ತು ಕಸ ಸುಟ್ಟರೆ ಹಾನಿಕಾರಕ ಅನಿಲಗಳು ಬಿಡುಗಡೆಯಾಗುತ್ತವೆ.' },
    },
  },
  {
    id: 'ewaste',
    answerIndex: 1,
    text: {
      en: { q: 'An old mobile charger is…', options: ['Wet waste', 'E-waste', 'Compost', 'Not waste'], why: 'Electronics go to authorised e-waste collectors.' },
      hi: { q: 'पुराना मोबाइल चार्जर है…', options: ['गीला कचरा', 'ई-कचरा', 'खाद', 'कचरा नहीं'], why: 'इलेक्ट्रॉनिक सामान अधिकृत ई-कचरा संग्रहकर्ता को दें।' },
      kn: { q: 'ಹಳೆಯ ಮೊಬೈಲ್ ಚಾರ್ಜರ್…', options: ['ಹಸಿ ಕಸ', 'ಇ-ತ್ಯಾಜ್ಯ', 'ಗೊಬ್ಬರ', 'ಕಸವಲ್ಲ'], why: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ವಸ್ತುಗಳು ಅಧಿಕೃತ ಇ-ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹಕಾರರಿಗೆ.' },
    },
  },
  {
    id: 'mix',
    answerIndex: 0,
    text: {
      en: { q: 'What happens when wet and dry waste are mixed?', options: ['Dry waste gets dirty and can\'t be recycled', 'Nothing', 'It becomes compost faster', 'It disappears'], why: 'Segregation keeps recyclables clean and compost pure.' },
      hi: { q: 'गीला और सूखा कचरा मिलाने पर क्या होता है?', options: ['सूखा कचरा गंदा होकर रीसायकल नहीं होता', 'कुछ नहीं', 'खाद जल्दी बनती है', 'गायब हो जाता है'], why: 'अलग रखने से रीसायकल वाला कचरा साफ़ और खाद शुद्ध रहती है।' },
      kn: { q: 'ಹಸಿ ಮತ್ತು ಒಣ ಕಸ ಬೆರೆತರೆ ಏನಾಗುತ್ತದೆ?', options: ['ಒಣ ಕಸ ಕೊಳಕಾಗಿ ಮರುಬಳಕೆ ಆಗದು', 'ಏನೂ ಆಗದು', 'ಬೇಗ ಗೊಬ್ಬರ', 'ಮಾಯವಾಗುತ್ತದೆ'], why: 'ಬೇರ್ಪಡಿಸಿದರೆ ಮರುಬಳಕೆ ವಸ್ತು ಸ್ವಚ್ಛ, ಗೊಬ್ಬರ ಶುದ್ಧ.' },
    },
  },
  {
    id: 'drain',
    answerIndex: 2,
    text: {
      en: { q: 'What often blocks city drains?', options: ['Rainwater', 'Sunlight', 'Plastic bags and litter', 'Trees'], why: 'Plastic litter clogs drains and causes flooding in the monsoon.' },
      hi: { q: 'शहर की नालियाँ अक्सर किससे बंद होती हैं?', options: ['बारिश का पानी', 'धूप', 'प्लास्टिक थैलियाँ और कूड़ा', 'पेड़'], why: 'प्लास्टिक कूड़ा नालियाँ रोकता है और बारिश में बाढ़ लाता है।' },
      kn: { q: 'ನಗರದ ಚರಂಡಿಗಳು ಹೆಚ್ಚಾಗಿ ಯಾವುದರಿಂದ ಕಟ್ಟಿಕೊಳ್ಳುತ್ತವೆ?', options: ['ಮಳೆನೀರು', 'ಬಿಸಿಲು', 'ಪ್ಲಾಸ್ಟಿಕ್ ಚೀಲ ಮತ್ತು ಕಸ', 'ಮರಗಳು'], why: 'ಪ್ಲಾಸ್ಟಿಕ್ ಕಸ ಚರಂಡಿ ಕಟ್ಟಿ ಮಳೆಗಾಲದಲ್ಲಿ ಪ್ರವಾಹ ತರುತ್ತದೆ.' },
    },
  },
  {
    id: 'glass',
    answerIndex: 1,
    text: {
      en: { q: 'A clean glass jar goes in the…', options: ['Green bin', 'Blue bin', 'Drain', 'Compost'], why: 'Glass is recyclable dry waste. Wrap broken glass before binning.' },
      hi: { q: 'साफ़ काँच का जार किस डिब्बे में जाता है?', options: ['हरा डिब्बा', 'नीला डिब्बा', 'नाली', 'खाद'], why: 'काँच रीसायकल होने वाला सूखा कचरा है। टूटा काँच लपेटकर फेंकें।' },
      kn: { q: 'ಸ್ವಚ್ಛ ಗಾಜಿನ ಜಾಡಿ ಯಾವ ಡಬ್ಬಿಗೆ?', options: ['ಹಸಿರು ಡಬ್ಬಿ', 'ನೀಲಿ ಡಬ್ಬಿ', 'ಚರಂಡಿ', 'ಗೊಬ್ಬರ'], why: 'ಗಾಜು ಮರುಬಳಕೆಯ ಒಣ ಕಸ. ಒಡೆದ ಗಾಜನ್ನು ಸುತ್ತಿ ಎಸೆಯಿರಿ.' },
    },
  },
  {
    id: 'flowers',
    answerIndex: 0,
    text: {
      en: { q: 'Pooja flowers are best…', options: ['Composted', 'Thrown in a lake', 'Burnt', 'Put in the dry bin'], why: 'Flowers are wet waste and make great compost.' },
      hi: { q: 'पूजा के फूलों के लिए सबसे अच्छा है…', options: ['खाद बनाना', 'झील में फेंकना', 'जलाना', 'सूखे डिब्बे में'], why: 'फूल गीला कचरा हैं और बढ़िया खाद बनाते हैं।' },
      kn: { q: 'ಪೂಜೆಯ ಹೂವುಗಳಿಗೆ ಉತ್ತಮ…', options: ['ಗೊಬ್ಬರ ಮಾಡುವುದು', 'ಕೆರೆಗೆ ಎಸೆಯುವುದು', 'ಸುಡುವುದು', 'ಒಣ ಡಬ್ಬಿಗೆ'], why: 'ಹೂವುಗಳು ಹಸಿ ಕಸ, ಒಳ್ಳೆಯ ಗೊಬ್ಬರವಾಗುತ್ತವೆ.' },
    },
  },
  {
    id: 'reduce',
    answerIndex: 2,
    text: {
      en: { q: 'Which is the BEST way to cut waste?', options: ['Recycle more', 'Burn it', 'Use less in the first place', 'Hide it'], why: 'Reduce comes first: waste never made needs no sorting.' },
      hi: { q: 'कचरा कम करने का सबसे अच्छा तरीका कौन सा है?', options: ['ज़्यादा रीसायकल', 'जला देना', 'शुरू से ही कम इस्तेमाल', 'छिपा देना'], why: 'कम इस्तेमाल सबसे पहले: जो कचरा बना ही नहीं, उसे छाँटना नहीं पड़ता।' },
      kn: { q: 'ಕಸ ಕಡಿಮೆ ಮಾಡಲು ಅತ್ಯುತ್ತಮ ದಾರಿ ಯಾವುದು?', options: ['ಹೆಚ್ಚು ಮರುಬಳಕೆ', 'ಸುಡುವುದು', 'ಮೊದಲೇ ಕಡಿಮೆ ಬಳಸುವುದು', 'ಮುಚ್ಚಿಡುವುದು'], why: 'ಕಡಿಮೆ ಬಳಕೆ ಮೊದಲು: ಹುಟ್ಟದ ಕಸವನ್ನು ವಿಂಗಡಿಸಬೇಕಿಲ್ಲ.' },
    },
  },
];
