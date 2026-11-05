/**
 * Copy and data for every section of the home page, in page order. Change a
 * headline, number, or sentence here; the components read it from this file.
 */

export const hero = {
  eyebrow: 'Earth observation from 525 km',
  /** Each item is one line of the headline. */
  headline: ['Every place', 'on Earth.', 'Every day.'],
  subhead:
    'Apogee Orbital flies 48 satellites that photograph any place on the planet at 50 cm, up to 12 times a day. Choose a place and watch one get there.',
  secondaryLink: { label: 'Task a satellite', href: '#tasking' },
  globeLabel:
    'Live globe of the Apogee constellation: 48 satellites in three orbital planes with their ground tracks and the day-night line.',
  globeHint: 'Drag to turn the globe. Select a satellite for its telemetry.',
  telemetry: {
    title: 'Telemetry',
    altitude: 'Altitude',
    velocity: 'Velocity',
    latitude: 'Latitude',
    longitude: 'Longitude',
    nextPass: 'Next pass',
    inContact: 'In contact',
    simClock: 'Sim clock'
  }
};

export const tasking = {
  index: '02',
  label: 'Tasking',
  title: 'Point at a place. Get a picture.',
  body: 'Pick a site, or click anywhere on the globe. The scheduler assigns the first satellite that will pass over it in daylight, leans it toward the target, and sends the capture down. The clock runs fast here, so hours of waiting take seconds.',
  listLabel: 'Preset sites',
  clickHint: 'Or click any point on the globe.',
  keyboardHint:
    'Arrow keys turn the globe. Enter tasks the point under the crosshair.',
  customTargetName: 'Custom target',
  steps: {
    target: 'Target',
    assigned: 'Assigned',
    countdown: 'Next pass',
    imaging: 'Imaging',
    delivered: 'Delivered'
  },
  idle: 'Select a site to task a satellite.',
  noPass: 'No daylight pass in the next 36 hours. Polar night: try a site nearer the equator.',
  revisitsLabel: 'Daylight passes, next 24 h',
  viewer: {
    beforeAfterLabel: 'Before and after',
    falseColor: 'False color',
    falseColorNote: 'vegetation',
    trueColor: 'True color',
    another: 'Task another site',
    sliderLabel: 'Drag to compare before and after'
  }
};

export const industries = {
  index: '03',
  label: 'Who uses it',
  title: 'For the people who have to know first.',
  items: [
    {
      id: 'insurance',
      name: 'Insurance',
      siteId: 'miami-beach',
      falseColor: false,
      sentence:
        'Claims teams see which blocks took the storm surge the morning after landfall, before an adjuster can reach the coast.'
    },
    {
      id: 'agriculture',
      name: 'Agriculture',
      siteId: 'cote-de-beaune',
      falseColor: true,
      sentence:
        'Growers find the vineyard block under water stress in the infrared a week before the leaves show it.'
    },
    {
      id: 'maritime',
      name: 'Maritime',
      siteId: 'maasvlakte',
      falseColor: false,
      sentence:
        'Port operators count ships at berth and container stacks every day instead of every quarter.'
    },
    {
      id: 'disaster-response',
      name: 'Disaster response',
      siteId: 'mekong-delta',
      falseColor: false,
      sentence:
        'Relief teams map which villages the floodwater has cut off within 90 minutes of the pass.'
    }
  ],
  /** Fictional customers, drawn as wordmarks. */
  customers: ['Halden Re', 'Corvane Mutual', 'Meridia Agri', 'Tessaline', 'Ostra Relief']
};

export const constellationSection = {
  index: '04',
  label: 'The constellation',
  title: 'From the fairing to first light.',
  intro:
    'Every satellite takes the same path into service. Scroll to follow one from the launch pad to its first picture.',
  stages: [
    {
      id: 'launch',
      name: 'Launch',
      sentence:
        'A rideshare climbs to a 525 km sun-synchronous orbit, so every pass over a place happens at the same local time.'
    },
    {
      id: 'deployment',
      name: 'Deployment',
      sentence:
        'The fairing opens and the dispenser releases satellites ten seconds apart; they drift into their slots along the plane.'
    },
    {
      id: 'commissioning',
      name: 'Commissioning',
      sentence:
        'Solar arrays unfold, the star tracker locks, and the telescope is focused during three weeks of checkout.'
    },
    {
      id: 'first-light',
      name: 'First light',
      sentence:
        'The first image comes down on the next pass over Toulouse. From then on the satellite joins the daily schedule.'
    }
  ],
  /** Key numbers under the timeline. */
  numbers: [
    { value: '48', unit: '', label: 'Satellites in orbit' },
    { value: '50', unit: 'cm', label: 'Resolution' },
    { value: '12', unit: '', label: 'Revisits a day' },
    { value: '<90', unit: 'min', label: 'Capture to delivery' }
  ]
};

export const missionsSection = {
  index: '05',
  label: 'Missions',
  title: 'Next launch',
  link: { label: 'All missions', href: '/missions' },
  countdownLabel: 'T minus',
  noUpcoming: 'No launch is scheduled right now.'
};

export const requestSection = {
  index: '06',
  label: 'Samples',
  title: 'Request sample imagery',
  body: 'Tell us where you work. We will send a recent 50 cm capture of your area, with all eight bands, within two business days.',
  points: [
    'Cloud-optimized GeoTIFF and a PNG preview',
    'True color, false color, and a vegetation index',
    'No account, no card, no follow-up sequence'
  ],
  form: {
    email: { label: 'Work email', placeholder: 'name@organization.com' },
    organization: { label: 'Organization', placeholder: 'Who you work for' },
    areaOfInterest: {
      label: 'Area of interest',
      placeholder: 'A place name, like Port of Durban',
      hint: 'Up to 120 characters.'
    },
    useCase: {
      label: 'Use case',
      placeholder: 'Choose one',
      /** `value` is what the database stores; keep it stable. */
      options: [
        { value: 'insurance', label: 'Insurance' },
        { value: 'agriculture', label: 'Agriculture' },
        { value: 'maritime', label: 'Maritime' },
        { value: 'disaster-response', label: 'Disaster response' },
        { value: 'government', label: 'Government' },
        { value: 'other', label: 'Other' }
      ]
    },
    submit: 'Request sample imagery',
    submitting: 'Sending…',
    privacy: 'We use these details to send your samples and reply once. Read the privacy notice.',
    success: {
      title: 'Request received.',
      body: 'An analyst will reply within two business days with sample scenes over your area.'
    },
    duplicate: {
      title: 'You are already on the list.',
      body: 'We already have a request from this email, so nothing new was added. An analyst will reply to the first one.'
    },
    rateLimited:
      'Too many requests from this connection. Your details are still here; wait an hour and send again.',
    networkError:
      'We could not send your request. Your details are still here; check your connection and press the button again.',
    invalid: 'Check the highlighted fields.'
  }
};
