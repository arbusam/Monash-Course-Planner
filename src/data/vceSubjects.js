const studies = {
  'English': ['English', 'English as an Additional Language', 'English Language', 'Literature'],
  'Mathematics': ['Foundation Mathematics', 'General Mathematics', 'Mathematical Methods', 'Specialist Mathematics'],
  'Science': ['Biology', 'Chemistry', 'Environmental Science', 'Physics', 'Psychology'],
  'Business and Economics': ['Accounting', 'Business Management', 'Economics', 'Industry and Enterprise', 'Legal Studies'],
  'Humanities': ['Australian and Global Politics', 'Classical Studies', 'Geography', 'History', 'Philosophy', 'Politics', 'Religion and Society', 'Sociology', 'Texts and Traditions'],
  'Digital Technologies': ['Algorithmics (HESS)', 'Applied Computing'],
  'Health and Physical Education': ['Health and Human Development', 'Outdoor and Environmental Studies', 'Physical Education'],
  'Performing Arts': ['Dance', 'Drama', 'Music', 'Theatre Studies'],
  'Visual Arts': ['Art Creative Practice', 'Art Making and Exhibiting', 'Media', 'Visual Communication Design'],
  'Design and Technologies': ['Agricultural and Horticultural Studies', 'Food Studies', 'Product Design and Technologies', 'Systems Engineering'],
  'Other': ['Extended Investigation'],
  'Languages': [
    'Aboriginal Languages of Victoria', 'Arabic', 'Armenian', 'Auslan', 'Bengali', 'Bosnian',
    'Chin Hakha', 'Chinese First Language', 'Chinese Language, Culture and Society',
    'Chinese Second Language', 'Chinese Second Language Advanced', 'Classical Greek', 'Croatian',
    'Dutch', 'Filipino', 'French', 'German', 'Greek', 'Hebrew', 'Hindi', 'Hungarian',
    'Indonesian First Language', 'Indonesian Second Language', 'Italian', 'Japanese First Language',
    'Japanese Second Language', 'Karen', 'Khmer', 'Korean First Language', 'Korean Second Language',
    'Latin', 'Macedonian', 'Malay', 'Maltese', 'Persian', 'Polish', 'Portuguese', 'Punjabi',
    'Romanian', 'Russian', 'Serbian', 'Sinhala', 'Spanish', 'Swedish', 'Tamil', 'Turkish',
    'Vietnamese First Language', 'Vietnamese Second Language', 'Yiddish'
  ],
  'VCE Vocational Major': [
    'VCE VM Literacy', 'VCE VM Numeracy', 'VCE VM Personal Development Skills',
    'VCE VM Work Related Skills'
  ]
};

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const VCE_SUBJECTS = Object.entries(studies).flatMap(([category, names]) =>
  names.map((name) => ({ id: slugify(name), name, category }))
);

export const VCE_SUBJECT_BY_ID = new Map(VCE_SUBJECTS.map((subject) => [subject.id, subject]));

export const VCE_SUBJECT_ALIASES = {
  'further mathematics': 'general-mathematics',
  'general mathematics': 'general-mathematics',
  'mathematical methods': 'mathematical-methods',
  'mathematical methods cas': 'mathematical-methods',
  'maths methods': 'mathematical-methods',
  'specialist mathematics': 'specialist-mathematics',
  'specialist maths': 'specialist-mathematics',
  'english as an additional language': 'english-as-an-additional-language',
  eal: 'english-as-an-additional-language'
};

VCE_SUBJECTS.forEach(({ id, name }) => {
  VCE_SUBJECT_ALIASES[name.toLowerCase()] = id;
});

export const VCE_UNIT_CREDIT_EQUIVALENTS = {
  'algorithmics-hess': ['FIT1045', 'FIT1053']
};
