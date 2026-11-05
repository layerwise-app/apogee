/** Copy for the Privacy and Terms pages. Plain sentences, short sections. */

export type LegalSection = { heading: string; paragraphs: string[] };

export const privacy = {
  title: 'Privacy notice',
  updated: '2026-11-01',
  intro:
    'Apogee Orbital is a fictional company used in this website template. This notice explains what the site collects and why.',
  sections: [
    {
      heading: 'What we collect',
      paragraphs: [
        'When you request sample imagery we store your work email, your organization, the area of interest you typed, and the use case you chose, with the time of the request.',
        'To stop abuse we keep a one-way, salted fingerprint of your connection’s IP address for up to a day. We never store the address itself.'
      ]
    },
    {
      heading: 'Why we collect it',
      paragraphs: [
        'We use your request to prepare and send the samples, and to reply to you once about them. We do not add you to a mailing list or sell or share your details.'
      ]
    },
    {
      heading: 'How long we keep it',
      paragraphs: [
        'Requests are kept for two years and then deleted. Connection fingerprints are deleted after a day.'
      ]
    },
    {
      heading: 'Cookies and tracking',
      paragraphs: [
        'This site sets no advertising or tracking cookies and loads no third-party trackers.'
      ]
    },
    {
      heading: 'Your choices',
      paragraphs: [
        'You can ask us to show you, correct, or delete what we hold about you at any time by replying to any email we send you.'
      ]
    }
  ] satisfies LegalSection[]
};

export const terms = {
  title: 'Terms of use',
  updated: '2026-11-01',
  intro:
    'Apogee Orbital is a fictional company used in this website template. These terms cover this website and the sample imagery it sends.',
  sections: [
    {
      heading: 'Using this site',
      paragraphs: [
        'You may read and share anything on this site. Do not try to break it, overload it, or send requests in someone else’s name.'
      ]
    },
    {
      heading: 'Sample imagery',
      paragraphs: [
        'Samples are for evaluation inside your organization. You may show them to colleagues and clients, but not resell them or publish them as your own data.',
        'Samples are provided as they are. Weather, sun angle, and satellite availability can change what a capture shows.'
      ]
    },
    {
      heading: 'Simulated content',
      paragraphs: [
        'The globe, tasking demo, and captures on this site are drawn by a simulation. Passes and readouts are computed from simple circular orbits and are not operational data.'
      ]
    },
    {
      heading: 'Changes',
      paragraphs: [
        'We may update these terms. The date at the top shows the latest version.'
      ]
    }
  ] satisfies LegalSection[]
};
