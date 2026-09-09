// Builds the WhatsApp Flow JSON (endpoint / Data API mode).
// All imagery is injected as raw base64 in the encrypted endpoint response,
// so screens only declare data bindings here.
//
// Two flows are used so terminal services (My Card / Use Card / Contact) can
// close the menu instantly (Footer -> complete) while Register / Partners open
// a separate multi-screen "form" flow:
//   - MENU flow:  SERVICE_SELECT (terminal, completes with selected_service)
//   - FORM flow:  REGISTER -> PLAN_SELECT -> CONFIRM, and PARTNERS_LIST -> PARTNER_DETAILS

const bannerImage = (srcVar, visibleVar, alt) => ({
  type: 'Image',
  src: `\${data.${srcVar}}`,
  width: 1000,
  height: 125,
  'scale-type': 'cover',
  'alt-text': alt,
  visible: `\${data.${visibleVar}}`,
});

// ---------- Screens ----------

const SERVICE_SELECT = {
  id: 'SERVICE_SELECT',
  title: 'Choose Service',
  data: {
    welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
    has_welcome_banner: { type: 'boolean', __example__: true },
    heading: { type: 'string', __example__: 'Welcome to Student Benefit Card' },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          image: { type: 'string' },
        },
      },
      __example__: [
        { id: 'register', title: 'Register', description: 'Get your student card' },
        { id: 'partners', title: 'Our Partners', description: 'Browse partner offers' },
        { id: 'contact', title: 'Contact', description: 'Talk to us' },
      ],
    },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      bannerImage('welcome_banner', 'has_welcome_banner', 'Welcome banner'),
      { type: 'TextHeading', text: '${data.heading}' },
      { type: 'TextBody', text: 'Select a service to continue.' },
      {
        type: 'RadioButtonsGroup',
        name: 'selected_service',
        label: 'Select a service',
        required: true,
        'data-source': '${data.services}',
      },
      {
        type: 'Footer',
        label: 'Continue',
        'on-click-action': {
          name: 'data_exchange',
          payload: { selected_service: '${form.selected_service}' },
        },
      },
    ],
  },
};

const REGISTER = {
  id: 'REGISTER',
  title: 'Register',
  data: {
    register_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
    has_register_banner: { type: 'boolean', __example__: true },
    whatsapp_number: { type: 'string', __example__: '919000000000' },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      bannerImage('register_banner', 'has_register_banner', 'Register'),
      { type: 'TextHeading', text: 'Student Registration' },
      { type: 'TextInput', name: 'student_name', label: 'Student Name', required: true, 'input-type': 'text' },
      {
        type: 'TextInput',
        name: 'whatsapp_number',
        label: 'WhatsApp Number',
        required: true,
        'input-type': 'phone',
        enabled: false,
        'init-value': '${data.whatsapp_number}',
        'helper-text': 'Linked to this chat (cannot be changed)',
      },
      { type: 'TextInput', name: 'phone_number', label: 'Phone Number', required: true, 'input-type': 'phone' },
      { type: 'TextInput', name: 'school', label: 'School / Institute Name', required: true, 'input-type': 'text' },
      { type: 'DatePicker', name: 'dob', label: 'Date of Birth', required: true },
      {
        type: 'TextInput',
        name: 'password',
        label: 'Set Password',
        required: true,
        'input-type': 'password',
        'helper-text': 'Minimum 6 characters (used to log in on the website)',
      },
      { type: 'TextInput', name: 'confirm_password', label: 'Confirm Password', required: true, 'input-type': 'password' },
      {
        type: 'Footer',
        label: 'Continue',
        'on-click-action': {
          name: 'data_exchange',
          payload: {
            student_name: '${form.student_name}',
            whatsapp_number: '${data.whatsapp_number}',
            phone_number: '${form.phone_number}',
            school: '${form.school}',
            dob: '${form.dob}',
            password: '${form.password}',
            confirm_password: '${form.confirm_password}',
          },
        },
      },
    ],
  },
};

const PLAN_SELECT = {
  id: 'PLAN_SELECT',
  title: 'Choose Plan',
  data: {
    plan_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
    has_plan_banner: { type: 'boolean', __example__: true },
    plans: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          image: { type: 'string' },
        },
      },
      __example__: [
        { id: 'silver', title: 'Silver — ₹199', description: 'Basic benefits' },
        { id: 'gold', title: 'Gold — ₹399', description: 'More benefits' },
        { id: 'platinum', title: 'Platinum — ₹599', description: 'All benefits' },
      ],
    },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      bannerImage('plan_banner', 'has_plan_banner', 'Plans'),
      { type: 'TextHeading', text: 'Choose your plan' },
      {
        type: 'RadioButtonsGroup',
        name: 'selected_plan',
        label: 'Plans',
        required: true,
        'data-source': '${data.plans}',
      },
      {
        type: 'Footer',
        label: 'Continue',
        'on-click-action': {
          name: 'data_exchange',
          payload: { selected_plan: '${form.selected_plan}' },
        },
      },
    ],
  },
};

const CONFIRM = {
  id: 'CONFIRM',
  title: 'Confirm',
  terminal: true,
  data: {
    details_table: {
      type: 'array',
      items: { type: 'string' },
      __example__: [
        '# Confirm Your Details',
        'Please review and confirm to complete registration.',
        '',
        '| Field | Value |',
        '| --- | --- |',
        '| Name | John |',
        '| Plan | Gold |',
        '| Amount | ₹399 |',
      ],
    },
    student_name: { type: 'string', __example__: 'John' },
    phone_number: { type: 'string', __example__: '9000000000' },
    school: { type: 'string', __example__: 'ABC School' },
    dob: { type: 'string', __example__: '2005-01-01' },
    selected_plan: { type: 'string', __example__: 'gold' },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      { type: 'RichText', text: '${data.details_table}' },
      {
        type: 'Footer',
        label: 'Confirm & Pay',
        'on-click-action': {
          name: 'complete',
          payload: {
            intent: 'register_payment',
            student_name: '${data.student_name}',
            phone_number: '${data.phone_number}',
            school: '${data.school}',
            dob: '${data.dob}',
            selected_plan: '${data.selected_plan}',
          },
        },
      },
    ],
  },
};

const PARTNERS_LIST = {
  id: 'PARTNERS_LIST',
  title: 'Our Partners',
  data: {
    partners_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
    has_partners_banner: { type: 'boolean', __example__: true },
    partners: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          image: { type: 'string' },
        },
      },
      __example__: [{ id: 'p1', title: 'Cafe Mocha', description: 'Coffee & snacks' }],
    },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      bannerImage('partners_banner', 'has_partners_banner', 'Partners'),
      { type: 'TextHeading', text: 'Our Partners' },
      {
        type: 'RadioButtonsGroup',
        name: 'selected_partner',
        label: 'Choose a partner',
        required: true,
        'data-source': '${data.partners}',
      },
      {
        type: 'Footer',
        label: 'View',
        'on-click-action': {
          name: 'data_exchange',
          payload: { selected_partner: '${form.selected_partner}' },
        },
      },
    ],
  },
};

const PARTNER_DETAILS = {
  id: 'PARTNER_DETAILS',
  title: 'Partner',
  terminal: true,
  data: {
    partner_image: { type: 'string', __example__: 'iVBORw0KGgo' },
    has_partner_image: { type: 'boolean', __example__: true },
    partner_name: { type: 'string', __example__: 'Cafe Mocha' },
    partner_body: { type: 'string', __example__: 'Great coffee\nLocation: MG Road' },
    usage_text: { type: 'string', __example__: 'Redeemed 2 of 4 times' },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      {
        type: 'Image',
        src: '${data.partner_image}',
        width: 300,
        height: 300,
        'scale-type': 'cover',
        'alt-text': 'Partner',
        visible: '${data.has_partner_image}',
      },
      { type: 'TextHeading', text: '${data.partner_name}' },
      { type: 'TextBody', text: '${data.partner_body}' },
      { type: 'TextSubheading', text: '${data.usage_text}' },
      { type: 'Footer', label: 'Done', 'on-click-action': { name: 'complete', payload: {} } },
    ],
  },
};

const INFO = {
  id: 'INFO',
  title: 'Info',
  terminal: true,
  data: {
    info_title: { type: 'string', __example__: 'Done' },
    info_body: { type: 'string', __example__: 'Check your chat.' },
  },
  layout: {
    type: 'SingleColumnLayout',
    children: [
      { type: 'TextHeading', text: '${data.info_title}' },
      { type: 'TextBody', text: '${data.info_body}' },
      { type: 'Footer', label: 'Done', 'on-click-action': { name: 'complete', payload: {} } },
    ],
  },
};

// ---------- Flow builders ----------

// Single "Choose Service" flow containing every screen. SERVICE_SELECT uses
// data_exchange so the server navigates in-flow to Register / Plans / Partners.
function buildFlowJSON() {
  return {
    version: '7.3',
    data_api_version: '3.0',
    routing_model: {
      SERVICE_SELECT: ['REGISTER', 'PARTNERS_LIST', 'INFO'],
      REGISTER: ['PLAN_SELECT', 'INFO'],
      PLAN_SELECT: ['CONFIRM', 'INFO'],
      CONFIRM: [],
      PARTNERS_LIST: ['PARTNER_DETAILS', 'INFO'],
      PARTNER_DETAILS: [],
      INFO: [],
    },
    screens: [SERVICE_SELECT, REGISTER, PLAN_SELECT, CONFIRM, PARTNERS_LIST, PARTNER_DETAILS, INFO],
  };
}

module.exports = { buildFlowJSON };
