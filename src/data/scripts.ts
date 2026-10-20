import type { Priority, TranscriptLine } from '../types';

/** Copilot state that a live call reveals as the transcript grows. */
export interface CopilotUpdate {
  intent?: string;
  confidence?: number;
  category?: string;
  priority?: Priority;
  sentiment?: 'positive' | 'neutral' | 'negative';
  entities?: { orderId?: string; partNo?: string; invoice?: string };
  hint?: string;
}

export interface ScriptLine extends TranscriptLine {
  copilot?: CopilotUpdate;
}

export interface CallScript {
  key: string;
  desk: 'helpline' | 'edukaan' | 'loyalty';
  heroKey: string;
  ivrPath: string[];
  ivrLabel: string;
  agentName: string;
  language: string;
  initialSubject: string;
  finalSubject: string;
  lines: ScriptLine[];
  summary: string;
  category: string;
  intent: string;
  priority: Priority;
  entities: { orderId?: string; partNo?: string; invoice?: string };
  nextAction: string;
  whatsappUpdate: string;
}

export const CALL_SCRIPTS: Record<string, CallScript> = {
  edukaan_dispatch: {
    key: 'edukaan_dispatch',
    desk: 'edukaan',
    heroKey: 'rajesh',
    ivrPath: ['Hindi', '2 → eDukaan', 'Order status'],
    ivrLabel: 'IVR: eDukaan',
    agentName: 'Aditi S.',
    language: 'Hinglish',
    initialSubject: 'Inbound call: eDukaan order enquiry',
    finalSubject: 'eDukaan order ED-558210 not dispatched after 5 days (brake pads)',
    lines: [
      { speaker: 'agent', text: 'Namaste, BizSensAi Parts Support se Aditi baat kar rahi hoon. Main aapki kya madad kar sakti hoon?' },
      {
        speaker: 'customer',
        text: 'Haan ji, main Rajesh Patil bol raha hoon, Shree Ganesh Auto Spares, Pune se. Maine eDukaan pe ek order kiya tha, ED-558210.',
        copilot: { intent: 'Order status', confidence: 0.62, category: 'Order & dispatch', entities: { orderId: 'ED-558210' }, hint: 'Order ED-558210 found in eDukaan' },
      },
      { speaker: 'agent', text: 'Ji Rajesh ji, order ED-558210 dikh raha hai. Ismein brake pad set PRT-27014-BRK hai, 40 units.', copilot: { entities: { orderId: 'ED-558210', partNo: 'PRT-27014-BRK' } } },
      {
        speaker: 'customer',
        text: 'Haan wahi. Paanch din ho gaye, abhi tak dispatch nahi hua. Mera customer roz phone kar raha hai, fleet ki gaadiyan khadi hain.',
        copilot: { intent: 'Dispatch delay', confidence: 0.86, priority: 'P2', sentiment: 'negative', hint: 'Vehicles off road: suggest P2' },
      },
      { speaker: 'agent', text: 'Main samajh sakti hoon. Main abhi SAP mein dispatch status check karti hoon.' },
      {
        speaker: 'customer',
        text: 'Pichhle hafte bhi maine email kiya tha, kisi ne reply nahi kiya.',
        copilot: { confidence: 0.91, hint: 'Repeat contact: 3rd contact in 7 days, linked ticket found' },
      },
      { speaker: 'agent', text: 'Sorry sir. Aapka pichhla ticket bhi mere saamne hai, aapko dobara kuch batane ki zaroorat nahi.' },
      {
        speaker: 'agent',
        text: 'SAP ke hisaab se stock Pune warehouse mein allocate ho gaya hai, lekin transporter pickup pending hai.',
        copilot: { confidence: 0.94, hint: 'Root cause: transporter pickup pending at Pune WH' },
      },
      { speaker: 'customer', text: 'Toh kab tak aa jayega? Mujhe kal tak chahiye.' },
      { speaker: 'agent', text: 'Main warehouse team ko abhi escalate kar rahi hoon. Kal shaam tak dispatch confirm karke aapko WhatsApp pe tracking number bhej denge.' },
      { speaker: 'customer', text: 'Theek hai, please jaldi kijiye. Dhanyavaad.', copilot: { sentiment: 'neutral' } },
      { speaker: 'agent', text: 'Zaroor, Rajesh ji. Aapka ticket number WhatsApp pe bhej diya hai.' },
    ],
    summary:
      'Retailer Rajesh Patil (Shree Ganesh Auto Spares, Pune) called about eDukaan order ED-558210 (40 × brake pad set PRT-27014-BRK), not dispatched after 5 days. SAP shows stock allocated at Pune WH with transporter pickup pending. The customer had emailed last week without a reply. The agent escalated to the warehouse team and committed to a dispatch confirmation with tracking on WhatsApp by tomorrow evening.',
    category: 'Order & dispatch',
    intent: 'Dispatch delay',
    priority: 'P2',
    entities: { orderId: 'ED-558210', partNo: 'PRT-27014-BRK' },
    nextAction: 'Warehouse team to confirm transporter pickup by 17:00 tomorrow, then send tracking on WhatsApp.',
    whatsappUpdate:
      'Hi Rajesh ji, your order ED-558210 has been escalated to our Pune warehouse team. We will share the tracking number by tomorrow evening. Ticket: {id}',
  },
  loyalty_points: {
    key: 'loyalty_points',
    desk: 'loyalty',
    heroKey: 'imran',
    ivrPath: ['Hindi', '3 → Loyalty', 'Talk to an agent'],
    ivrLabel: 'IVR: Loyalty',
    agentName: 'Karan M.',
    language: 'Hinglish',
    initialSubject: 'Inbound call: loyalty enquiry',
    finalSubject: 'Loyalty points not credited for invoice INV-2026-44817',
    lines: [
      { speaker: 'agent', text: 'Namaste, Loyalty desk se Karan bol raha hoon. Bataiye, kya madad karoon?' },
      {
        speaker: 'customer',
        text: 'Karan ji, mera naam Imran Qureshi hai, Lucknow se mechanic hoon. Loyalty ID LYT-778201.',
        copilot: { intent: 'Points enquiry', confidence: 0.55, category: 'Loyalty points', hint: 'Member LYT-778201 verified by caller ID' },
      },
      { speaker: 'agent', text: 'Ji Imran ji, aapka account khul gaya. Aapka balance 12,480 points hai.' },
      {
        speaker: 'customer',
        text: 'Wahi toh problem hai. Maine 10 tarikh ko invoice INV-2026-44817 pe parts liye the, uske points abhi tak credit nahi hue.',
        copilot: { intent: 'Points not credited', confidence: 0.9, entities: { invoice: 'INV-2026-44817' }, priority: 'P3', hint: 'Invoice INV-2026-44817 found: 640 points pending' },
      },
      { speaker: 'agent', text: 'Ek minute, main ledger check karta hoon. Invoice INV-2026-44817 ki entry pending batch mein hai.' },
      {
        speaker: 'customer',
        text: 'Har baar aisa hota hai. Pichhli baar bhi teen hafte lag gaye the.',
        copilot: { sentiment: 'negative', confidence: 0.93, hint: 'Known issue: credits stuck after invoice batch runs' },
      },
      { speaker: 'agent', text: 'Main samajh sakta hoon. Is invoice ke 640 points main abhi manually credit kar raha hoon.' },
      { speaker: 'customer', text: 'Accha, abhi ho jayega?' },
      { speaker: 'agent', text: 'Ji haan, dus minute mein reflect ho jayega aur aapko WhatsApp pe confirmation aa jayega.' },
      { speaker: 'customer', text: 'Theek hai, shukriya Karan ji.', copilot: { sentiment: 'positive' } },
    ],
    summary:
      'Loyalty member Imran Qureshi (mechanic, Lucknow, LYT-778201) reported 640 points not credited for invoice INV-2026-44817 dated 10 Oct. The ledger showed the entry stuck in a pending batch; this is the third delayed credit for this member. The agent credited the points manually and promised a WhatsApp confirmation within 10 minutes.',
    category: 'Loyalty points',
    intent: 'Points not credited',
    priority: 'P3',
    entities: { invoice: 'INV-2026-44817' },
    nextAction: 'Confirm 640 points reflect in Loyalty CRM; flag batch job failure to the CRM team.',
    whatsappUpdate:
      'Hi Imran ji, 640 loyalty points for invoice INV-2026-44817 have been credited. New balance: 13,120 points. Ticket: {id}',
  },
};

/** Short transcripts for seeded historical calls. */
export const SEED_TRANSCRIPTS: Record<string, { lines: TranscriptLine[]; summary: string }> = {
  wrong_part: {
    lines: [
      { speaker: 'agent', text: 'Parts Helpline, good morning. How can I help?' },
      { speaker: 'customer', text: 'Sir, ICV ke liye clutch plate mangwayi thi, jo aayi hai woh size mein chhoti hai.' },
      { speaker: 'agent', text: 'Kya aap box par likha part number bata sakte hain?' },
      { speaker: 'customer', text: 'PRT-31208-CLT likha hai, lekin vehicle ka chassis number dekh ke dusra part chahiye.' },
      { speaker: 'agent', text: 'Main replacement ke liye return request raise kar raha hoon. Pickup 48 ghante mein hoga.' },
    ],
    summary: 'Customer received a clutch plate that does not fit the ICV chassis. Agent raised a return and replacement; pickup within 48 hours.',
  },
  payment_twice: {
    lines: [
      { speaker: 'agent', text: 'eDukaan support, Aditi speaking.' },
      { speaker: 'customer', text: 'Madam, order place karte waqt payment do baar debit ho gaya. Bank statement mein dono entries hain.' },
      { speaker: 'agent', text: 'Main gateway mein transaction check karti hoon. Haan, ek duplicate transaction dikh raha hai.' },
      { speaker: 'agent', text: 'Duplicate amount ka refund 5 to 7 working days mein aapke account mein aa jayega.' },
      { speaker: 'customer', text: 'Theek hai, refund reference SMS kar dijiye.' },
    ],
    summary: 'Customer was charged twice for one eDukaan order. Gateway confirmed a duplicate transaction; refund initiated with 5–7 working days timeline.',
  },
  portal_login: {
    lines: [
      { speaker: 'agent', text: 'eDukaan support, how may I help you?' },
      { speaker: 'customer', text: 'Retailer portal pe login nahi ho raha, OTP aata hi nahi.' },
      { speaker: 'agent', text: 'Aapka registered mobile number purana hai. Main update karke reset link bhej rahi hoon.' },
      { speaker: 'customer', text: 'Haan, ab OTP aa gaya. Thank you.' },
    ],
    summary: 'Retailer could not log in to the eDukaan portal because the registered mobile number was outdated. Number updated and reset link sent; login confirmed.',
  },
  warranty_status: {
    lines: [
      { speaker: 'agent', text: 'Parts Helpline, Priya speaking.' },
      { speaker: 'customer', text: 'Alternator ka warranty claim teen hafte se pending hai, status kya hai?' },
      { speaker: 'agent', text: 'IPMS mein claim technical review mein hai. Main reviewer ko reminder bhej rahi hoon.' },
      { speaker: 'customer', text: 'Please jaldi karwaiye, customer gaadi le jaana chahta hai.' },
    ],
    summary: 'Dealer followed up on an alternator warranty claim pending for three weeks. Claim is in technical review; agent sent a reminder to the reviewer.',
  },
  points_balance: {
    lines: [
      { speaker: 'agent', text: 'Loyalty desk, bataiye.' },
      { speaker: 'customer', text: 'Mere points kitne hain aur redeem kaise karoon?' },
      { speaker: 'agent', text: 'Aapka balance 6,320 points hai. App mein Rewards section se redeem kar sakte hain.' },
      { speaker: 'customer', text: 'Accha, samajh gaya. Dhanyavaad.' },
    ],
    summary: 'Loyalty member asked for points balance and how to redeem. Balance shared and redemption steps explained.',
  },
  dispatch_generic: {
    lines: [
      { speaker: 'agent', text: 'Parts Helpline, good afternoon.' },
      { speaker: 'customer', text: 'Order ka dispatch kab hoga? Teen din ho gaye.' },
      { speaker: 'agent', text: 'SAP mein dekh raha hoon, kal dispatch scheduled hai. Tracking number WhatsApp pe aa jayega.' },
      { speaker: 'customer', text: 'Theek hai.' },
    ],
    summary: 'Customer asked about a delayed dispatch. SAP shows dispatch scheduled for tomorrow; tracking to be shared on WhatsApp.',
  },
};

export interface VoiceBotLine {
  speaker: 'bot' | 'customer';
  hi: string;
  en: string;
}

export interface VoiceBotScript {
  key: string;
  heroKey: string;
  time: string;
  title: string;
  lines: VoiceBotLine[];
  outcome: 'resolved' | 'handoff';
}

export const VOICEBOT_SCRIPTS: Record<string, VoiceBotScript> = {
  self_resolved: {
    key: 'self_resolved',
    heroKey: 'ramesh',
    time: '10:04 pm',
    title: 'Points balance enquiry',
    outcome: 'resolved',
    lines: [
      { speaker: 'bot', hi: 'नमस्ते! BizSensAi पार्ट्स सपोर्ट में आपका स्वागत है। मैं आपकी AI सहायक हूँ। बताइए, मैं क्या मदद कर सकती हूँ?', en: 'Hello! Welcome to BizSensAi Parts Support. I am your AI assistant. How can I help you?' },
      { speaker: 'customer', hi: 'मेरे लॉयल्टी पॉइंट्स कितने हैं?', en: 'How many loyalty points do I have?' },
      { speaker: 'bot', hi: 'ज़रूर। यह नंबर रमेश यादव जी, इंदौर के नाम पर रजिस्टर्ड है। पुष्टि के लिए अपनी लॉयल्टी आईडी के आख़िरी चार अंक बताइए।', en: 'Sure. This number is registered to Ramesh Yadav, Indore. Please tell me the last four digits of your loyalty ID to confirm.' },
      { speaker: 'customer', hi: 'दो नौ एक तीन।', en: 'Two nine one three.' },
      { speaker: 'bot', hi: 'धन्यवाद। आपका बैलेंस 8,240 पॉइंट्स है। 1,760 पॉइंट्स और जुड़ने पर आप गोल्ड टियर में पहुँच जाएँगे।', en: 'Thank you. Your balance is 8,240 points. 1,760 more points will take you to Gold tier.' },
      { speaker: 'customer', hi: 'और पिछला क्रेडिट कब हुआ था?', en: 'And when was the last credit?' },
      { speaker: 'bot', hi: 'पिछला क्रेडिट 14 अक्टूबर को 420 पॉइंट्स का हुआ था, इनवॉइस INV-2026-43902 पर। क्या मैं यह जानकारी WhatsApp पर भेज दूँ?', en: 'The last credit was 420 points on 14 October, for invoice INV-2026-43902. Shall I send this on WhatsApp?' },
      { speaker: 'customer', hi: 'हाँ, भेज दीजिए। धन्यवाद।', en: 'Yes, please send it. Thank you.' },
      { speaker: 'bot', hi: 'भेज दिया है। आपका दिन शुभ हो!', en: 'Sent. Have a good night!' },
    ],
  },
  handoff: {
    key: 'handoff',
    heroKey: 'anil',
    time: '10:17 pm',
    title: 'Wrong part, wants a human',
    outcome: 'handoff',
    lines: [
      { speaker: 'bot', hi: 'नमस्ते! BizSensAi पार्ट्स सपोर्ट में आपका स्वागत है। बताइए, मैं क्या मदद कर सकती हूँ?', en: 'Hello! Welcome to BizSensAi Parts Support. How can I help you?' },
      { speaker: 'customer', hi: 'मेरे वर्कशॉप में ट्रक खड़ा है, क्लच प्लेट गलत आ गई है। किसी इंसान से बात करनी है।', en: 'A truck is standing in my workshop and the wrong clutch plate arrived. I need to talk to a person.' },
      { speaker: 'bot', hi: 'मैं समझ सकती हूँ, यह ज़रूरी है। अभी हमारे एजेंट उपलब्ध नहीं हैं; हमारा समय सुबह 9 बजे से है। क्या आप अपना ऑर्डर नंबर बता सकते हैं?', en: 'I understand this is urgent. Our agents are not available right now; our hours start at 9 am. Can you tell me your order number?' },
      { speaker: 'customer', hi: 'ऑर्डर नंबर ED-559034 है। ICV के लिए मंगवाई थी।', en: 'The order number is ED-559034. I ordered it for an ICV.' },
      { speaker: 'bot', hi: 'धन्यवाद। मैंने आपकी शिकायत हाई प्रायोरिटी टिकट के रूप में दर्ज कर दी है। सुबह 9:30 बजे हमारे एजेंट आपको कॉल करेंगे। टिकट नंबर SMS पर भेज दिया है।', en: 'Thank you. I have registered your complaint as a high-priority ticket. Our agent will call you at 9:30 am. The ticket number has been sent by SMS.' },
      { speaker: 'customer', hi: 'ठीक है, सुबह ज़रूर कॉल करवाइए।', en: 'Okay, please make sure someone calls in the morning.' },
      { speaker: 'bot', hi: 'ज़रूर। शुभ रात्रि!', en: 'Certainly. Good night!' },
    ],
  },
};

export interface WaStep {
  from: 'customer' | 'bot' | 'agent' | 'system';
  text: string;
  buttons?: string[];
  card?: { title: string; rows: [string, string][] };
  delay: number;
  action?: 'create_ticket' | 'assign';
}

export const WHATSAPP_JOURNEY: WaStep[] = [
  { from: 'customer', text: 'Hi', delay: 700 },
  {
    from: 'bot',
    text: 'Namaste Gurpreet ji 👋 Welcome to BizSensAi Parts Support. How can we help today?',
    buttons: ['Track my order', 'Loyalty points', 'Raise a complaint', 'Talk to an agent'],
    delay: 1300,
  },
  { from: 'customer', text: 'Track my order', delay: 1600 },
  { from: 'bot', text: 'Please share your eDukaan order ID (for example ED-558210).', delay: 1100 },
  { from: 'customer', text: 'ED-558774', delay: 1700 },
  {
    from: 'bot',
    text: 'Here is the latest from eDukaan:',
    card: {
      title: 'Order ED-558774',
      rows: [
        ['Items', '6 × Shock absorber (rear)'],
        ['Status', 'In transit'],
        ['Dispatched', '18 Oct · Jamshedpur WH'],
        ['Tracking', 'TRK-88213407'],
        ['Expected', '23 Oct'],
      ],
    },
    delay: 1500,
  },
  { from: 'bot', text: 'Is there anything else I can help with?', buttons: ['No, thanks', 'Talk to an agent'], delay: 900 },
  { from: 'customer', text: 'Delivery is late, my trucks are waiting. need to talk to someone', delay: 2200 },
  {
    from: 'system',
    text: 'Connecting you to an eDukaan specialist. Ticket {id} created; you will not need to repeat your details.',
    delay: 1300,
    action: 'create_ticket',
  },
  {
    from: 'agent',
    text: 'Hi Gurpreet ji, Aditi here from eDukaan. I can see order ED-558774 and this chat. I am checking with the transporter for an earlier delivery slot and will update you within 30 minutes.',
    delay: 2600,
    action: 'assign',
  },
  { from: 'customer', text: 'Thank you 🙏', delay: 1500 },
];
