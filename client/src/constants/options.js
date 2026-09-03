// Canonical option lists for structured fields.
// Keep these values aligned with the cleaned Excel so manual entries match imports.
// If a stored record holds a value outside a list (legacy data), the UI appends it
// as a one-off option on edit rather than blanking it.

export const SCHOLAR_DESIGNATIONS = [
    'Dean',
    'Associate Professor',
    'Senior Professor',
    'Professor',
    'Chairman',
    'Consultant' // a visitor not affiliated with any university
];

export const SCHOLAR_CAMPUSES = [
    'Kudlu',
    'Harohalli'
];

// Human status / type vocabularies for the one-by-one Add forms.
// Values mirror what the modules actually store (audit_snapshot.json) and what the
// list-page filters show, so manual entries match imports and filter buckets.
// If a record holds a value outside a list (legacy data), the UI appends it as a
// one-off option on edit rather than blanking it.

export const SCHOLAR_STATUSES = [
    'Completed',
    'Upcoming',
    'In Progress',
    'Not Coming',
    'Canceled'
];

export const EXCHANGE_STATUSES = [
    'Completed',
    'Pending',
    'On Going',
    'Cancelled',
    'Withdrawn',
    'Opted Out'
];

export const PROGRAM_STATUSES = [
    'Completed',
    'In Progress',
    'Planning',
    'Cancelled'
];

export const MEMBERSHIP_STATUSES = [
    'Completed',
    'Active',
    'In Process'
];

export const MOU_UPDATE_STATUSES = [
    'Completed',
    'In Process'
];

export const MOU_VALIDITY_STATUSES = [
    'Active',
    'Expiring Soon',
    'Expired'
];

export const ACTIVE_STATUSES = [
    'Active',
    'Inactive'
];

// Data already stores Completed/InProgress (Partners filter badges). Broader lifecycle
// options are offered for new entries; the Partners filter picks them up dynamically
// once records carry them.
export const PARTNER_MOU_STATUS = [
    'Completed',
    'InProgress',
    'Draft',
    'Signed',
    'Expired',
    'Renewed'
];

export const CEREMONY_TYPES = [
    'In-Person',
    'Virtual',
    'Hybrid'
];

export const MEDIA_CHANNELS = [
    'LinkedIn',
    'News Portal',
    'Newspaper',
    'Magazine',
    'TV',
    'Radio'
];

export const MEETING_TIMEZONES = [
    'IST', 'GMT', 'EST', 'EDT', 'CST', 'PST', 'PDT',
    'AEST', 'SGT', 'GST', 'CET'
];

export const AGREEMENT_TYPES = [
    'MoU',
    'MoA',
    'Letter of Intent',
    'Letter of Agreement'
];

export const MEMBERSHIP_DURATIONS = [
    '1 Year',
    '2 Years',
    '3 Years',
    '5 Years'
];

export const CURRENCIES = [
    'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD',
    'SGD', 'AED', 'JPY', 'CNY', 'NZD', 'CHF'
];

export const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
    'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
    'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
    'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
    'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
    'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Republic of the)', 'Congo (Democratic Republic of the)',
    'Costa Rica', "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic (Czechia)',
    'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
    'Eswatini', 'Ethiopia',
    'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
    'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Honduras', 'Hungary',
    'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Jordan',
    'Kazakhstan', 'Kenya', 'Kiribati', 'Korea (North)', 'Korea (South)', 'Kuwait', 'Kyrgyzstan',
    'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
    'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
    'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
    'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
    'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
    'Nigeria', 'North Macedonia', 'Norway',
    'Oman',
    'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
    'Philippines', 'Poland', 'Portugal',
    'Qatar',
    'Romania', 'Russia', 'Rwanda',
    'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
    'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
    'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
    'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
    'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
    'Uruguay', 'Uzbekistan',
    'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
    'Yemen',
    'Zambia', 'Zimbabwe'
];
