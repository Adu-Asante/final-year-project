// src/data/datasets/starterPhrases.ts
// Comprehensive dataset of 100+ authentic Twi (Akan) ↔ English phrasebook pairs

import type { Phrase } from '../../core/entities/Phrase';

export const STARTER_PHRASES: Phrase[] = [
  // ── 1. GREETINGS (🙏) ───────────────────────────────────────────────────────
  { id: 'g1',  category: 'greetings', twiText: 'Maakye',                   englishText: 'Good morning',                  usageCount: 0 },
  { id: 'g2',  category: 'greetings', twiText: 'Maaha',                    englishText: 'Good afternoon',                 usageCount: 0 },
  { id: 'g3',  category: 'greetings', twiText: 'Maadwo',                   englishText: 'Good evening',                   usageCount: 0 },
  { id: 'g4',  category: 'greetings', twiText: 'Medaase',                  englishText: 'Thank you',                      usageCount: 0 },
  { id: 'g5',  category: 'greetings', twiText: 'Medaase pii',              englishText: 'Thank you very much',            usageCount: 0 },
  { id: 'g6',  category: 'greetings', twiText: 'Akwaaba',                  englishText: 'Welcome',                        usageCount: 0 },
  { id: 'g7',  category: 'greetings', twiText: 'Da yie',                   englishText: 'Goodnight',                      usageCount: 0 },
  { id: 'g8',  category: 'greetings', twiText: 'Ɛte sɛn?',                 englishText: 'How are you?',                   usageCount: 0 },
  { id: 'g9',  category: 'greetings', twiText: 'Bɔkɔɔ',                    englishText: 'Fine / Peaceful',                usageCount: 0 },
  { id: 'g10', category: 'greetings', twiText: 'Eye',                      englishText: 'It is good / I am fine',         usageCount: 0 },
  { id: 'g11', category: 'greetings', twiText: 'Wo ho te sɛn?',            englishText: 'How are you doing?',             usageCount: 0 },
  { id: 'g12', category: 'greetings', twiText: 'Yɛfrɛ wo sɛn?',            englishText: 'What is your name?',             usageCount: 0 },
  { id: 'g13', category: 'greetings', twiText: 'Yɛfrɛ me...',              englishText: 'My name is...',                  usageCount: 0 },
  { id: 'g14', category: 'greetings', twiText: 'Akyire yi',                englishText: 'See you later',                  usageCount: 0 },

  // ── 2. HOSPITAL & HEALTH (🏥) ───────────────────────────────────────────────
  { id: 'h1',  category: 'hospital',  twiText: 'Me yare',                  englishText: 'I am sick',                      usageCount: 0 },
  { id: 'h2',  category: 'hospital',  twiText: 'Kuro me',                  englishText: 'Help me / I am hurt',            usageCount: 0 },
  { id: 'h3',  category: 'hospital',  twiText: 'Me ti yɛ me ya',           englishText: 'I have a headache',              usageCount: 0 },
  { id: 'h4',  category: 'hospital',  twiText: 'Me yam yɛ me ya',          englishText: 'I have a stomachache',           usageCount: 0 },
  { id: 'h5',  category: 'hospital',  twiText: 'Okyerɛfo bɛn?',            englishText: 'Where is the doctor?',           usageCount: 0 },
  { id: 'h6',  category: 'hospital',  twiText: 'Me hia aduru',             englishText: 'I need medicine',                usageCount: 0 },
  { id: 'h7',  category: 'hospital',  twiText: 'Ayaresabea wɔ he?',        englishText: 'Where is the hospital?',         usageCount: 0 },
  { id: 'h8',  category: 'hospital',  twiText: 'Me ho hyehye me',          englishText: 'I have a fever',                 usageCount: 0 },
  { id: 'h9',  category: 'hospital',  twiText: 'Frɛ ayaresabea kɔ ne ntɛm', englishText: 'Call an ambulance quickly',      usageCount: 0 },

  // ── 3. FOOD & DRINK (🍛) ─────────────────────────────────────────────────────
  { id: 'f1',  category: 'food',      twiText: 'Ɔkɔm de me',               englishText: 'I am hungry',                    usageCount: 0 },
  { id: 'f2',  category: 'food',      twiText: 'Nsukɔm de me',             englishText: 'I am thirsty',                   usageCount: 0 },
  { id: 'f3',  category: 'food',      twiText: 'Ɛyɛ dɛ',                   englishText: 'It is delicious',                usageCount: 0 },
  { id: 'f4',  category: 'food',      twiText: 'Me pɛ aduane',             englishText: 'I want food',                    usageCount: 0 },
  { id: 'f5',  category: 'food',      twiText: 'Me pɛ nsuo ma me nom',     englishText: 'I want water to drink',          usageCount: 0 },
  { id: 'f6',  category: 'food',      twiText: 'Wɔwɔ fufuo?',              englishText: 'Do you have Fufu?',              usageCount: 0 },
  { id: 'f7',  category: 'food',      twiText: 'Wɔwɔ jollof?',             englishText: 'Do you have Jollof rice?',       usageCount: 0 },
  { id: 'f8',  category: 'food',      twiText: 'Mempɛ mako',               englishText: 'I don\'t want pepper / spicy',   usageCount: 0 },
  { id: 'f9',  category: 'food',      twiText: 'Aduane no yɛ dɛ paa',      englishText: 'The food is very good',          usageCount: 0 },
  { id: 'f10', category: 'food',      twiText: 'Me mee',                   englishText: 'I am full',                      usageCount: 0 },

  // ── 4. POLICE & SAFETY (👮) ──────────────────────────────────────────────────
  { id: 'p1',  category: 'police',    twiText: 'Boa me',                   englishText: 'Help me',                        usageCount: 0 },
  { id: 'p2',  category: 'police',    twiText: 'Polisi fie wɔ he?',        englishText: 'Where is the police station?',   usageCount: 0 },
  { id: 'p3',  category: 'police',    twiText: 'Obi awia me sika',          englishText: 'Someone stole my money',         usageCount: 0 },
  { id: 'p4',  category: 'police',    twiText: 'Me phone ayera',           englishText: 'My phone is lost',               usageCount: 0 },
  { id: 'p5',  category: 'police',    twiText: 'Frɛ polisi!',              englishText: 'Call the police!',               usageCount: 0 },
  { id: 'p6',  category: 'police',    twiText: 'Meyɛ ɔhɔhoɔ',              englishText: 'I am a visitor / tourist',       usageCount: 0 },

  // ── 5. TRAVEL & TRANSPORT (🚌) ───────────────────────────────────────────────
  { id: 't1',  category: 'travel',    twiText: 'Fie no wɔ he?',            englishText: 'Where is the house?',            usageCount: 0 },
  { id: 't2',  category: 'travel',    twiText: 'Trotro wɔ he?',            englishText: 'Where is the bus / trotro?',     usageCount: 0 },
  { id: 't3',  category: 'travel',    twiText: 'Mekɔ Accra',               englishText: 'I am going to Accra',            usageCount: 0 },
  { id: 't4',  category: 'travel',    twiText: 'Gyae me wɔ ha',            englishText: 'Stop for me here / Drop me here', usageCount: 0 },
  { id: 't5',  category: 'travel',    twiText: 'Akwantuo pa',              englishText: 'Safe journey / Bon voyage',      usageCount: 0 },
  { id: 't6',  category: 'travel',    twiText: 'Teksi wɔ he?',             englishText: 'Where is a taxi?',               usageCount: 0 },
  { id: 't7',  category: 'travel',    twiText: 'Kɔ dɔm te he?',            englishText: 'How far is it?',                 usageCount: 0 },
  { id: 't8',  category: 'travel',    twiText: 'Kɔ w\'anim nkoaa',         englishText: 'Go straight ahead',              usageCount: 0 },

  // ── 6. SHOPPING & MONEY (🛒) ────────────────────────────────────────────────
  { id: 's1',  category: 'shopping',  twiText: 'Bɔ sɛn?',                  englishText: 'How much is it?',                usageCount: 0 },
  { id: 's2',  category: 'shopping',  twiText: 'Ɛyɛ dɛn kakra',            englishText: 'It is a bit expensive',          usageCount: 0 },
  { id: 's3',  category: 'shopping',  twiText: 'Te so ma me',              englishText: 'Reduce the price for me',        usageCount: 0 },
  { id: 's4',  category: 'shopping',  twiText: 'Mepɛ sɛ metɔ wei',         englishText: 'I want to buy this',             usageCount: 0 },
  { id: 's5',  category: 'shopping',  twiText: 'Sika sen na ɛkae?',        englishText: 'How much change is left?',       usageCount: 0 },
  { id: 's6',  category: 'shopping',  twiText: 'Wɔwɔ sika korɔ?',          englishText: 'Do you have change / cash?',     usageCount: 0 },
  { id: 's7',  category: 'shopping',  twiText: 'Mepɛ wei, ɛyɛ sɛn?',       englishText: 'I like this, how much?',         usageCount: 0 },
  { id: 's8',  category: 'shopping',  twiText: 'Dwa no apon',              englishText: 'The market is closed',           usageCount: 0 },

  // ── 7. EMERGENCY (🚨) ────────────────────────────────────────────────────────
  { id: 'e1',  category: 'emergency', twiText: 'Boa me! Boa me!',          englishText: 'Help me! Help me!',              usageCount: 0 },
  { id: 'e2',  category: 'emergency', twiText: 'Gya hye!',                 englishText: 'Fire!',                          usageCount: 0 },
  { id: 'e3',  category: 'emergency', twiText: 'Ka mo ho!',                englishText: 'Hurry up!',                      usageCount: 0 },
  { id: 'e4',  category: 'emergency', twiText: 'Akokɔɔ kɔ',                englishText: 'Danger ahead',                   usageCount: 0 },
  { id: 'e5',  category: 'emergency', twiText: 'Meyɛ asiane mu',           englishText: 'I am in trouble / emergency',    usageCount: 0 },

  // ── 8. NUMBERS (🔢) ──────────────────────────────────────────────────────────
  { id: 'n1',  category: 'numbers',   twiText: 'Baako',                    englishText: 'One (1)',                        usageCount: 0 },
  { id: 'n2',  category: 'numbers',   twiText: 'Mmienu',                   englishText: 'Two (2)',                        usageCount: 0 },
  { id: 'n3',  category: 'numbers',   twiText: 'Mmeɛnsa',                  englishText: 'Three (3)',                      usageCount: 0 },
  { id: 'n4',  category: 'numbers',   twiText: 'Nan',                      englishText: 'Four (4)',                       usageCount: 0 },
  { id: 'n5',  category: 'numbers',   twiText: 'Num',                      englishText: 'Five (5)',                       usageCount: 0 },
  { id: 'n6',  category: 'numbers',   twiText: 'Nsia',                     englishText: 'Six (6)',                        usageCount: 0 },
  { id: 'n7',  category: 'numbers',   twiText: 'Nsoŋ',                     englishText: 'Seven (7)',                      usageCount: 0 },
  { id: 'n8',  category: 'numbers',   twiText: 'Nwɔtwe',                   englishText: 'Eight (8)',                      usageCount: 0 },
  { id: 'n9',  category: 'numbers',   twiText: 'Nkron',                    englishText: 'Nine (9)',                       usageCount: 0 },
  { id: 'n10', category: 'numbers',   twiText: 'Du',                       englishText: 'Ten (10)',                       usageCount: 0 },
  { id: 'n11', category: 'numbers',   twiText: 'Du baako',                 englishText: 'Eleven (11)',                    usageCount: 0 },
  { id: 'n12', category: 'numbers',   twiText: 'Aduonu',                   englishText: 'Twenty (20)',                    usageCount: 0 },
  { id: 'n13', category: 'numbers',   twiText: 'Aduasa',                   englishText: 'Thirty (30)',                    usageCount: 0 },
  { id: 'n14', category: 'numbers',   twiText: 'Ɔha',                      englishText: 'One Hundred (100)',              usageCount: 0 },

  // ── 9. FAMILY & PEOPLE (👨‍👩‍👧) ────────────────────────────────────────────────
  { id: 'fm1', category: 'family',    twiText: 'Me maame',                 englishText: 'My mother',                      usageCount: 0 },
  { id: 'fm2', category: 'family',    twiText: 'Me papa',                  englishText: 'My father',                      usageCount: 0 },
  { id: 'fm3', category: 'family',    twiText: 'Me nua barima',            englishText: 'My brother',                     usageCount: 0 },
  { id: 'fm4', category: 'family',    twiText: 'Me nua baa',               englishText: 'My sister',                      usageCount: 0 },
  { id: 'fm5', category: 'family',    twiText: 'Me yere',                  englishText: 'My wife',                        usageCount: 0 },
  { id: 'fm6', category: 'family',    twiText: 'Me kunu',                  englishText: 'My husband',                     usageCount: 0 },
  { id: 'fm7', category: 'family',    twiText: 'Me ba',                    englishText: 'My child',                       usageCount: 0 },
  { id: 'fm8', category: 'family',    twiText: 'Me adamfo',                englishText: 'My friend',                      usageCount: 0 },
  { id: 'fm9', category: 'family',    twiText: 'Abofra',                   englishText: 'Child',                          usageCount: 0 },
  { id: 'fm10',category: 'family',    twiText: 'Nnipa',                    englishText: 'People',                         usageCount: 0 },

  // ── 10. DIRECTIONS & LOCATION (🧭) ──────────────────────────────────────────
  { id: 'd1',  category: 'directions', twiText: 'Kɔ benkum',               englishText: 'Turn left',                      usageCount: 0 },
  { id: 'd2',  category: 'directions', twiText: 'Kɔ nifa',                 englishText: 'Turn right',                     usageCount: 0 },
  { id: 'd3',  category: 'directions', twiText: 'Kɔ w\'anim',               englishText: 'Go forward / straight',          usageCount: 0 },
  { id: 'd4',  category: 'directions', twiText: 'San wo akyi',             englishText: 'Go back / Turn around',          usageCount: 0 },
  { id: 'd5',  category: 'directions', twiText: 'Ɛwɔ he?',                 englishText: 'Where is it?',                   usageCount: 0 },
  { id: 'd6',  category: 'directions', twiText: 'Ɛwɔ ha',                  englishText: 'It is here',                     usageCount: 0 },
  { id: 'd7',  category: 'directions', twiText: 'Ɛwɔ hɔ',                  englishText: 'It is there',                    usageCount: 0 },
  { id: 'd8',  category: 'directions', twiText: 'Ɛbɛn',                    englishText: 'It is near / close',             usageCount: 0 },
  { id: 'd9',  category: 'directions', twiText: 'Ɛwɔ akyirikyiri',         englishText: 'It is far away',                 usageCount: 0 },
  { id: 'd10', category: 'directions', twiText: 'Agyae agyae',             englishText: 'Stop here',                      usageCount: 0 },

  // ── 11. TIME & DAYS (🕒) ────────────────────────────────────────────────────
  { id: 'tm1', category: 'time',      twiText: 'Nnɛ',                      englishText: 'Today',                          usageCount: 0 },
  { id: 'tm2', category: 'time',      twiText: 'Ɔkyena',                   englishText: 'Tomorrow',                       usageCount: 0 },
  { id: 'tm3', category: 'time',      twiText: 'Nnra',                     englishText: 'Yesterday',                      usageCount: 0 },
  { id: 'tm4', category: 'time',      twiText: 'Anɔpa',                    englishText: 'Morning',                        usageCount: 0 },
  { id: 'tm5', category: 'time',      twiText: 'Awia',                     englishText: 'Afternoon',                      usageCount: 0 },
  { id: 'tm6', category: 'time',      twiText: 'Anwummere',                englishText: 'Evening',                        usageCount: 0 },
  { id: 'tm7', category: 'time',      twiText: 'Anadwo',                   englishText: 'Night',                          usageCount: 0 },
  { id: 'tm8', category: 'time',      twiText: 'Dɔnhwerewe sɛn?',          englishText: 'What time is it?',               usageCount: 0 },
  { id: 'tm9', category: 'time',      twiText: 'Dapɛn wei',                englishText: 'This week',                      usageCount: 0 },
  { id: 'tm10',category: 'time',      twiText: 'Afe wei',                  englishText: 'This year',                      usageCount: 0 },

  // ── 12. SLANG & IDIOMS (💬) ─────────────────────────────────────────────────
  { id: 'sl1', category: 'slang',     twiText: 'Chale',                    englishText: 'Friend / Buddy / Dude',          usageCount: 0 },
  { id: 'sl2', category: 'slang',     twiText: ' Charley, ɛte sɛn?',      englishText: 'Buddy, how is it going?',        usageCount: 0 },
  { id: 'sl3', category: 'slang',     twiText: 'Eii!',                     englishText: 'Wow! / Oh my goodness!',         usageCount: 0 },
  { id: 'sl4', category: 'slang',     twiText: 'Wofa',                     englishText: 'Uncle / Respectful term for man', usageCount: 0 },
  { id: 'sl5', category: 'slang',     twiText: 'Aante',                    englishText: 'Auntie / Respectful term for woman', usageCount: 0 },
  { id: 'sl6', category: 'slang',     twiText: 'Kwasia',                   englishText: 'Foolish (mild insult)',          usageCount: 0 },
  { id: 'sl7', category: 'slang',     twiText: 'Aane',                     englishText: 'Yes',                            usageCount: 0 },
  { id: 'sl8', category: 'slang',     twiText: 'Daabi',                    englishText: 'No',                             usageCount: 0 },
  { id: 'sl9', category: 'slang',     twiText: 'Ampa',                     englishText: 'Truly / Indeed',                 usageCount: 0 },
  { id: 'sl10',category: 'slang',     twiText: 'Asɛm aba!',                englishText: 'Trouble has come! / Big news!',  usageCount: 0 },

  // ── 13. BUSINESS & WORK (💼) ─────────────────────────────────────────────────
  { id: 'b1',  category: 'business',  twiText: 'Adwuma',                   englishText: 'Work / Job',                     usageCount: 0 },
  { id: 'b2',  category: 'business',  twiText: 'Me kɔ adwuma',             englishText: 'I am going to work',             usageCount: 0 },
  { id: 'b3',  category: 'business',  twiText: 'Sika',                     englishText: 'Money',                          usageCount: 0 },
  { id: 'b4',  category: 'business',  twiText: 'Sika nni hɔ',              englishText: 'There is no money',              usageCount: 0 },
  { id: 'b5',  category: 'business',  twiText: 'Mepɛ adwuma metoma',       englishText: 'I am looking for work',          usageCount: 0 },
  { id: 'b6',  category: 'business',  twiText: 'Wua w\'adwuma',            englishText: 'Well done at work',              usageCount: 0 },
  { id: 'b7',  category: 'business',  twiText: 'Banki wɔ he?',             englishText: 'Where is the bank?',             usageCount: 0 },
  { id: 'b8',  category: 'business',  twiText: 'Mo kyea adwuma',           englishText: 'Greetings to everyone at work', usageCount: 0 },
];
