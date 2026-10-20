import type { Customer, Order, Priority, Ticket } from '../types';

export type ActionId =
  | 'sap_dispatch'
  | 'resend_invoice'
  | 'credit_points'
  | 'escalate_warehouse'
  | 'check_payment'
  | 'reset_portal'
  | 'check_stock'
  | 'supersession'
  | 'warranty_status'
  | 'send_tracking'
  | 'schedule_pickup';

export const ACTION_LABELS: Record<ActionId, string> = {
  sap_dispatch: 'Check dispatch status in SAP',
  resend_invoice: 'Resend invoice on WhatsApp',
  credit_points: 'Credit loyalty points',
  escalate_warehouse: 'Escalate to warehouse team',
  check_payment: 'Look up payment in gateway',
  reset_portal: 'Send eDukaan reset link',
  check_stock: 'Check stock across warehouses',
  supersession: 'Look up supersession in PLM',
  warranty_status: 'Get claim status from IPMS',
  send_tracking: 'Send tracking on WhatsApp',
  schedule_pickup: 'Schedule return pickup',
};

export interface CopilotView {
  intent: string;
  confidence: number;
  category: string;
  priority: Priority;
  priorityReason: string;
  replies: { formal: string; friendly: string; hindi: string };
  actions: ActionId[];
}

const first = (c?: Customer) => c?.name.split(' ')[0] ?? 'Sir/Madam';

export function copilotFor(t: Ticket, c?: Customer, orders: Order[] = []): CopilotView {
  const order = t.entities?.orderId ?? orders.find((o) => o.customerId === c?.id && o.status !== 'Delivered')?.id;
  const name = first(c);
  const cat = t.category;
  let actions: ActionId[] = ['sap_dispatch', 'escalate_warehouse'];
  let formal = '';
  let friendly = '';
  let hindi = '';
  let suggested: Priority = t.priority;
  let reason = 'Matches the policy for this category';

  if (cat === 'Order & dispatch') {
    actions = ['sap_dispatch', 'send_tracking', 'escalate_warehouse', 'resend_invoice'];
    formal = `Dear ${name} ji,\n\nThank you for your patience. We have checked order ${order ?? 'your order'} in SAP: the stock is allocated at our warehouse and the transporter pickup is being expedited. We will share the tracking number on WhatsApp by tomorrow evening.\n\nWe regret the delay.\n\nRegards,\nParts Support`;
    friendly = `Hi ${name} ji, sorry for the wait! Your order ${order ?? ''} is packed and we're pushing the transporter for pickup today. You'll get the tracking number on WhatsApp by tomorrow evening. 🙏`;
    hindi = `नमस्ते ${name} जी, देरी के लिए क्षमा करें। आपका ऑर्डर ${order ?? ''} वेयरहाउस में तैयार है और हम ट्रांसपोर्टर पिकअप जल्दी करवा रहे हैं। कल शाम तक ट्रैकिंग नंबर WhatsApp पर भेज देंगे।`;
    if (t.sentiment === 'negative' || /off road|waiting|urgent/i.test(t.subject + JSON.stringify(t.interactions.slice(0, 3)))) {
      suggested = t.priority === 'P1' ? 'P1' : 'P2';
      reason = 'Vehicles off road and repeat contact';
    }
  } else if (cat === 'Loyalty points') {
    actions = ['credit_points', 'resend_invoice'];
    formal = `Dear ${name} ji,\n\nWe have verified invoice ${t.entities?.invoice ?? ''} and credited the pending loyalty points to your account. The updated balance will reflect in the app within 10 minutes.\n\nRegards,\nLoyalty Desk`;
    friendly = `Hi ${name} ji! Points for invoice ${t.entities?.invoice ?? ''} are now credited ✅ Check the app in 10 minutes for your new balance.`;
    hindi = `नमस्ते ${name} जी, इनवॉइस ${t.entities?.invoice ?? ''} के पॉइंट्स आपके खाते में जमा कर दिए गए हैं। 10 मिनट में ऐप में नया बैलेंस दिखेगा।`;
    suggested = 'P3';
    reason = 'Financial impact on member; standard loyalty policy';
  } else if (cat === 'Payment & refund') {
    actions = ['check_payment', 'resend_invoice'];
    formal = `Dear ${name} ji,\n\nWe found a duplicate debit against your eDukaan order and have initiated a refund. The amount will reach your account in 5–7 working days. Refund reference will follow by SMS.\n\nRegards,\neDukaan Support`;
    friendly = `Hi ${name} ji, we spotted the double charge and the refund is on its way (5–7 working days). Sorry for the trouble!`;
    hindi = `नमस्ते ${name} जी, डुप्लिकेट भुगतान का रिफंड शुरू कर दिया गया है। राशि 5–7 कार्य दिवसों में आपके खाते में आ जाएगी।`;
    suggested = 'P2';
    reason = 'Money debited twice: payment issues are P2 by policy';
  } else if (cat === 'Portal access') {
    actions = ['reset_portal'];
    formal = `Dear ${name} ji,\n\nYour registered mobile number has been updated and a password reset link has been sent. Please try logging in again.\n\nRegards,\neDukaan Support`;
    friendly = `Hi ${name} ji, all set! We've sent a fresh reset link. Give it a try and let us know.`;
    hindi = `नमस्ते ${name} जी, आपका मोबाइल नंबर अपडेट कर दिया गया है और रीसेट लिंक भेज दिया गया है। कृपया फिर से लॉग इन करें।`;
  } else if (cat === 'Warranty') {
    actions = ['warranty_status', 'escalate_warehouse'];
    formal = `Dear ${name} ji,\n\nYour warranty claim is in technical review. We have requested the reviewer to expedite it and will share the decision within 2 working days.\n\nRegards,\nParts Helpline`;
    friendly = `Hi ${name} ji, your claim is with our technical team; we've nudged them and will update you within 2 working days.`;
    hindi = `नमस्ते ${name} जी, आपका वारंटी क्लेम तकनीकी समीक्षा में है। हमने इसे जल्दी करने का अनुरोध किया है; 2 कार्य दिवसों में अपडेट देंगे।`;
  } else if (cat === 'Part supersession' || cat === 'Availability') {
    actions = ['supersession', 'check_stock'];
    formal = `Dear ${name} ji,\n\nThe part you asked about has been superseded. The new part number is interchangeable (two-way) and is in stock at the nearest warehouse. Price list attached.\n\nRegards,\nParts Helpline`;
    friendly = `Hi ${name} ji, good news: the new part number fits the same application and is in stock. Sharing details now.`;
    hindi = `नमस्ते ${name} जी, यह पार्ट नए पार्ट नंबर से बदल गया है, जो पूरी तरह संगत है और स्टॉक में उपलब्ध है।`;
  } else if (cat === 'Wrong / damaged part') {
    actions = ['schedule_pickup', 'check_stock', 'escalate_warehouse'];
    formal = `Dear ${name} ji,\n\nWe apologise for the incorrect supply. A replacement has been initiated and the pickup of the wrong part is scheduled within 48 hours.\n\nRegards,\nParts Helpline`;
    friendly = `Hi ${name} ji, really sorry about the mix-up! Replacement is on its way and we'll pick up the wrong part within 48 hours.`;
    hindi = `नमस्ते ${name} जी, गलत पार्ट के लिए खेद है। रिप्लेसमेंट भेजा जा रहा है और गलत पार्ट का पिकअप 48 घंटे में होगा।`;
    suggested = t.priority === 'P1' ? 'P1' : 'P2';
    reason = 'Vehicle likely off road until replacement arrives';
  } else {
    actions = ['resend_invoice', 'sap_dispatch'];
    formal = `Dear ${name} ji,\n\nThank you for your message. Please find the requested document attached. Let us know if anything else is needed.\n\nRegards,\nParts Support`;
    friendly = `Hi ${name} ji, here you go! Sharing the document now. Anything else we can help with?`;
    hindi = `नमस्ते ${name} जी, अनुरोधित दस्तावेज़ भेज दिया गया है। और कोई सहायता चाहिए तो बताइए।`;
  }

  const confidence = 0.84 + ((t.id.charCodeAt(t.id.length - 1) % 10) / 100);
  return { intent: t.intent, confidence, category: cat, priority: suggested, priorityReason: reason, replies: { formal, friendly, hindi }, actions };
}

/** Simple, clearly-marked machine translation samples for the composer. */
export const TRANSLATIONS: Record<string, (text: string) => string> = {
  Hindi: () => 'नमस्ते, आपकी समस्या दर्ज कर ली गई है। हम जल्द ही अपडेट देंगे। धन्यवाद।',
  Marathi: () => 'नमस्कार, आपली तक्रार नोंदवली आहे. आम्ही लवकरच अपडेट देऊ. धन्यवाद.',
  Tamil: () => 'வணக்கம், உங்கள் புகார் பதிவு செய்யப்பட்டது. விரைவில் தகவல் தருகிறோம். நன்றி.',
  Bengali: () => 'নমস্কার, আপনার অভিযোগ নথিভুক্ত হয়েছে। আমরা শীঘ্রই আপডেট দেব। ধন্যবাদ।',
};
