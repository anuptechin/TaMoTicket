export const PARTS = [
  { no: 'PRT-27014-BRK', name: 'Brake pad set (front)', price: 2450 },
  { no: 'PRT-31208-CLT', name: 'Clutch plate assembly', price: 6890 },
  { no: 'PRT-44102-ALT', name: 'Alternator 24V 70A', price: 14200 },
  { no: 'PRT-52310-RAD', name: 'Radiator core', price: 9350 },
  { no: 'PRT-61877-FPM', name: 'Fuel pump module', price: 11800 },
  { no: 'PRT-18240-HLP', name: 'Headlamp assembly LH', price: 3120 },
  { no: 'PRT-10455-OFL', name: 'Oil filter element', price: 420 },
  { no: 'PRT-10462-AFL', name: 'Air filter element', price: 860 },
  { no: 'PRT-38811-SHK', name: 'Shock absorber (rear)', price: 2980 },
  { no: 'PRT-39020-LSP', name: 'Leaf spring main leaf', price: 5400 },
  { no: 'PRT-71233-WPR', name: 'Wiper motor', price: 2240 },
  { no: 'PRT-44188-STM', name: 'Starter motor 24V', price: 12600 },
  { no: 'PRT-52144-WPM', name: 'Water pump', price: 3760 },
  { no: 'PRT-36610-HUB', name: 'Wheel hub bearing kit', price: 1890 },
  { no: 'PRT-29507-DSC', name: 'Brake disc rotor', price: 3340 },
] as const;

export const SEGMENTS = ['SCV', 'Pickup', 'ICV', 'M&HCV', 'Bus'] as const;

export const CITIES: { city: string; state: string; code: string; region: string }[] = [
  { city: 'Pune', state: 'Maharashtra', code: 'MH', region: 'West' },
  { city: 'Jamshedpur', state: 'Jharkhand', code: 'JH', region: 'East' },
  { city: 'Lucknow', state: 'Uttar Pradesh', code: 'UP', region: 'North' },
  { city: 'Indore', state: 'Madhya Pradesh', code: 'MP', region: 'Central' },
  { city: 'Coimbatore', state: 'Tamil Nadu', code: 'TN', region: 'South' },
  { city: 'Guwahati', state: 'Assam', code: 'AS', region: 'East' },
  { city: 'Nagpur', state: 'Maharashtra', code: 'MH', region: 'Central' },
  { city: 'Ludhiana', state: 'Punjab', code: 'PB', region: 'North' },
  { city: 'Jaipur', state: 'Rajasthan', code: 'RJ', region: 'North' },
  { city: 'Ahmedabad', state: 'Gujarat', code: 'GJ', region: 'West' },
  { city: 'Kolkata', state: 'West Bengal', code: 'WB', region: 'East' },
  { city: 'Patna', state: 'Bihar', code: 'BR', region: 'East' },
  { city: 'Nashik', state: 'Maharashtra', code: 'MH', region: 'West' },
  { city: 'Madurai', state: 'Tamil Nadu', code: 'TN', region: 'South' },
  { city: 'Hubballi', state: 'Karnataka', code: 'KA', region: 'South' },
  { city: 'Raipur', state: 'Chhattisgarh', code: 'CG', region: 'Central' },
  { city: 'Dehradun', state: 'Uttarakhand', code: 'UK', region: 'North' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', code: 'AP', region: 'South' },
  { city: 'Kochi', state: 'Kerala', code: 'KL', region: 'South' },
  { city: 'Bhopal', state: 'Madhya Pradesh', code: 'MP', region: 'Central' },
];

export const FIRST_NAMES = [
  'Amit', 'Sunil', 'Rakesh', 'Mahesh', 'Vijay', 'Ashok', 'Prakash', 'Deepak', 'Sanjay', 'Naresh',
  'Harish', 'Ravi', 'Manish', 'Kiran', 'Sachin', 'Rahul', 'Ajay', 'Dinesh', 'Mukesh', 'Satish',
  'Venkatesh', 'Murugan', 'Bhavesh', 'Jignesh', 'Tarun', 'Pradeep', 'Arvind', 'Rupesh', 'Bikash', 'Hemant',
  'Sunita', 'Lakshmi', 'Anjali', 'Rekha', 'Shalini', 'Farida', 'Nirmala', 'Jaspreet', 'Mohit', 'Abdul',
];

export const LAST_NAMES = [
  'Sharma', 'Verma', 'Patil', 'Jadhav', 'Pawar', 'Singh', 'Yadav', 'Gupta', 'Agarwal', 'Mishra',
  'Reddy', 'Naidu', 'Pillai', 'Nair', 'Shah', 'Patel', 'Desai', 'Das', 'Bora', 'Saikia',
  'Choudhary', 'Rathore', 'Thakur', 'Kumar', 'Sinha', 'Ansari', 'Khan', 'Gill', 'Sandhu', 'Mahato',
];

export const COMPANY_PREFIX = [
  'Shree Ganesh', 'Sai', 'Balaji', 'Om', 'Laxmi', 'New India', 'Royal', 'Highway', 'Kisan', 'Bharat',
  'Mahalaxmi', 'Jai Hind', 'Annapurna', 'Sunrise', 'Galaxy', 'Prime', 'Durga', 'Krishna', 'Metro', 'Express',
];

export const COMPANY_SUFFIX: Record<string, string[]> = {
  dealer: ['Motors', 'Automobiles', 'Auto Agencies', 'Vehicles Pvt Ltd'],
  retailer: ['Auto Spares', 'Spare Parts Centre', 'Auto Parts', 'Motor Stores'],
  garage: ['Auto Works', 'Garage', 'Motor Workshop', 'Service Point'],
  fleet: ['Roadlines', 'Logistics', 'Transport Co.', 'Carriers'],
  loyalty: ['Auto Works', 'Mechanic Point', 'Motor Garage', 'Repair Shop'],
};

export const WAREHOUSES = ['Pune WH', 'Jamshedpur WH', 'Lucknow WH', 'Dharwad WH', 'Pantnagar WH'];
