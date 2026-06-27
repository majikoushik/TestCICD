import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Grid, TextField, Button,
  CircularProgress, Alert, Snackbar, Avatar, Chip, Divider,
  MenuItem, Select, InputLabel, FormControl, Switch, FormControlLabel,
  Autocomplete, InputAdornment,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  VerifiedUser as NpiIcon,
  Person as PersonIcon,
  LocalHospital as PracticeIcon,
  ContactPhone as ContactIcon,
  Badge as LicenseIcon,
  PeopleAlt as ReferralIcon,
  AccountCircle as AccountCircleIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Print as PrintIcon,
  Apartment as ApartmentIcon,
  LocationCity as LocationCityIcon,
  Map as MapIcon,
  LocalPostOffice as PostalIcon,
  Wc as GenderIcon,
  Translate as TranslateIcon,
  HealthAndSafety as InsuranceIcon,
  Healing as ConditionsIcon,
  WorkspacePremium as CertIcon,
  AccountBalance as HospitalIcon,
  Videocam as TelehealthIcon,
  PersonAdd as AcceptingIcon,
  ChildCare as AgeGroupIcon,
  Lock as LockIcon,
  MedicalServices as MedicalIcon,
  BusinessCenter as ClinicIcon,
  CardMembership as CredentialIcon,
} from '@mui/icons-material';
import { get, patch } from '../../utils/apiUtils';
import { useAuth } from '../../contexts';

/* ── Static data ─────────────────────────────────────────────────────── */

const SPECIALTIES = [
  'Allergy & Immunology','Anesthesiology','Cardiology','Cardiovascular Surgery',
  'Clinical Genetics','Colon & Rectal Surgery','Critical Care Medicine',
  'Dermatology','Emergency Medicine','Endocrinology','Family Medicine',
  'Gastroenterology','General Surgery','Geriatrics','Hematology',
  'Hematology / Oncology','Hospice & Palliative Medicine','Hospitalist',
  'Infectious Disease','Internal Medicine','Interventional Radiology',
  'Medical Oncology','Neonatal-Perinatal Medicine','Nephrology',
  'Neurological Surgery','Neurology','Nuclear Medicine','Obstetrics & Gynecology',
  'Occupational Medicine','Ophthalmology','Oral & Maxillofacial Surgery',
  'Orthopedic Surgery','Otolaryngology (ENT)','Pain Management',
  'Pathology','Pediatric Surgery','Pediatrics','Physical Medicine & Rehabilitation',
  'Plastic Surgery','Podiatry','Pharmacist','Preventive Medicine','Psychiatry','Psychology',
  'Pulmonology','Radiation Oncology','Radiology','Rheumatology',
  'Sleep Medicine','Sports Medicine','Thoracic Surgery','Transplant Surgery',
  'Urology','Vascular Surgery','Wound Care',
];

const AGE_GROUPS = [
  'Neonatal (0–30 days)', 'Infant (1–12 months)', 'Pediatric (1–12 yrs)',
  'Adolescent (13–17 yrs)', 'Adult (18–64 yrs)', 'Geriatric (65+)',
];

const LANGUAGES = [
  'English','Spanish','Mandarin','Cantonese','French','Hindi','Portuguese',
  'Arabic','Russian','Tagalog','Vietnamese','Korean','German','Italian',
  'Japanese','Polish','Urdu','Bengali','Punjabi','Persian',
];

const INSURANCE_PLANS = [
  'Medicare','Medicaid','Medicare Advantage','Tricare',
  'Blue Cross Blue Shield','Aetna','Cigna','United Healthcare',
  'Humana','Kaiser Permanente','Anthem','Centene','Molina Healthcare',
  'WellCare','Oscar Health','Bright Health','Self-Pay / Uninsured',
  'Workers Compensation','No Fault / Auto',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: '',  label: 'Prefer not to say' },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Adornment icon — consistent sizing and color */
function FieldIcon({ icon, color = 'text.secondary' }) {
  return (
    <InputAdornment position="start">
      <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
    </InputAdornment>
  );
}

/** Wrapper for FormControl + Select fields to add a leading icon */
function SelectWithIcon({ icon, iconColor = 'text.secondary', children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{
        mt: 1.9, color: iconColor, display: 'flex', alignItems: 'center',
        bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1,
        p: '7px', flexShrink: 0,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 20 } })}
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}

/** Chip-input sub-label with icon */
function FieldLabel({ icon, label, color = 'text.secondary', required }) {
  return (
    <Box display="flex" alignItems="center" gap={0.75} mb={0.75}>
      <Box sx={{ color, display: 'flex', fontSize: 16 }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}{required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
      </Typography>
    </Box>
  );
}

/* ── Section header ──────────────────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle, color = '#6366f1', step, totalSteps }) {
  return (
    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2.5}>
      <Box display="flex" alignItems="flex-start" gap={1.5}>
        <Avatar sx={{ bgcolor: `${color}18`, color, width: 38, height: 38, mt: 0.25 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Box>
      {step && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, flexShrink: 0 }}>
          {step}/{totalSteps}
        </Typography>
      )}
    </Box>
  );
}

/* ── Chip-input: free-text tags ──────────────────────────────────────── */
function ChipInput({ icon, label, value, onChange, placeholder, iconColor }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput('');
  };
  const remove = (item) => onChange(value.filter(x => x !== item));
  return (
    <Box>
      <FieldLabel icon={icon} label={label} color={iconColor} />
      <Box display="flex" gap={1} mb={1}>
        <TextField
          size="small" fullWidth placeholder={placeholder}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <Button variant="outlined" size="small" onClick={add}
          sx={{ whiteSpace: 'nowrap', minWidth: 60 }}>
          Add
        </Button>
      </Box>
      <Box display="flex" flexWrap="wrap" gap={0.75}>
        {value.map(v => (
          <Chip key={v} label={v} size="small" onDelete={() => remove(v)}
            sx={{ bgcolor: '#f1f5f9', '& .MuiChip-deleteIcon': { fontSize: 14 } }} />
        ))}
      </Box>
    </Box>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export default function OnboardingProfileSetup() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { currentUser, refreshUser } = useAuth();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', organization: '',
    npi: '', credential: '', specialties: [], gender: '', organizationName: '',
    enumerationType: 'NPI-1',
    phone: '', fax: '',
    address: { line1: '', line2: '', city: '', state: '', zip: '' },
    licenseNumber: '', licenseState: '', deaNumber: '',
    acceptingNewPatients: true,
    telehealthAvailable: false,
    ageGroupsTreated: [],
    languagesSpoken: [],
    insuranceAccepted: [],
    boardCertifications: [],
    hospitalAffiliations: [],
    conditionsTreated: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  useEffect(() => {
    if (!currentUser) { startTransition(() => navigate('/login')); return; }
    loadProfile();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfile = async () => {
    try {
      const res = await get('/onboarding/profile');
      if (res.success) setForm(f => ({ ...f, ...res.data }));
    } catch (e) {
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const setAddr = (field, value) => setForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const handleSave = async () => {
    if (!form.specialties.length) { setError('Please select at least one specialty.'); return; }
    if (!form.phone.trim())       { setError('Phone number is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await patch('/onboarding/profile', {
        specialties:          form.specialties,
        credential:           form.credential,
        gender:               form.gender,
        organizationName:     form.organizationName,
        phone:                form.phone,
        fax:                  form.fax,
        address:              form.address,
        licenseNumber:        form.licenseNumber,
        licenseState:         form.licenseState,
        deaNumber:            form.deaNumber,
        acceptingNewPatients: form.acceptingNewPatients,
        telehealthAvailable:  form.telehealthAvailable,
        ageGroupsTreated:     form.ageGroupsTreated,
        languagesSpoken:      form.languagesSpoken,
        insuranceAccepted:    form.insuranceAccepted,
        boardCertifications:  form.boardCertifications,
        hospitalAffiliations: form.hospitalAffiliations,
        conditionsTreated:    form.conditionsTreated,
      });
      setSnack({ open: true, msg: 'Profile saved! Please upload your verification documents.', severity: 'success' });
      try { await refreshUser(); } catch (_) {}
      setTimeout(() => startTransition(() => navigate('/onboarding')), 1800);
    } catch (e) {
      setError(e.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="grey.50">
      <CircularProgress size={40} />
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">

        {/* ── Page header ── */}
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button startIcon={<BackIcon />} onClick={() => startTransition(() => navigate('/onboarding'))}
            variant="outlined" size="small">Back</Button>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800}>Complete Your Profile</Typography>
            <Typography variant="body2" color="text.secondary">
              Review NPI-pre-filled details and complete the referral information below.
            </Typography>
          </Box>
        </Box>

        {/* ── NPI badge ── */}
        {form.npi && (
          <Paper elevation={0} sx={{
            p: 2, mb: 3, borderRadius: 2.5,
            bgcolor: '#eff6ff', border: '1px solid #bfdbfe',
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <NpiIcon sx={{ color: '#1d4ed8' }} />
            <Typography variant="body2" color="#1d4ed8" fontWeight={700}>
              NPI #{form.npi} — Fields pre-filled from NPPES registry. All editable.
            </Typography>
            <Chip label="NPI Verified" size="small"
              sx={{ ml: 'auto', bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700 }} />
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* ════════════════════════════════════════════════
            SECTION 1 — Identity
        ════════════════════════════════════════════════ */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <SectionHeader
            icon={<PersonIcon fontSize="small" />}
            title="Identity"
            subtitle="From your registration — contact support to change these."
            color="#64748b"
            step={1} totalSteps={5}
          />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="First Name" value={form.firstName}
                InputProps={{
                  readOnly: true,
                  startAdornment: <FieldIcon icon={<AccountCircleIcon sx={{ fontSize: 20 }} />} />,
                  endAdornment: <InputAdornment position="end"><LockIcon sx={{ fontSize: 16, color: '#cbd5e1' }} /></InputAdornment>,
                }}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#f8fafc' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Last Name" value={form.lastName}
                InputProps={{
                  readOnly: true,
                  startAdornment: <FieldIcon icon={<AccountCircleIcon sx={{ fontSize: 20 }} />} />,
                  endAdornment: <InputAdornment position="end"><LockIcon sx={{ fontSize: 16, color: '#cbd5e1' }} /></InputAdornment>,
                }}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#f8fafc' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" value={form.email}
                InputProps={{
                  readOnly: true,
                  startAdornment: <FieldIcon icon={<EmailIcon sx={{ fontSize: 20 }} />} />,
                  endAdornment: <InputAdornment position="end"><LockIcon sx={{ fontSize: 16, color: '#cbd5e1' }} /></InputAdornment>,
                }}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#f8fafc' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Organization" value={form.organization}
                InputProps={{
                  readOnly: true,
                  startAdornment: <FieldIcon icon={<BusinessIcon sx={{ fontSize: 20 }} />} />,
                  endAdornment: <InputAdornment position="end"><LockIcon sx={{ fontSize: 16, color: '#cbd5e1' }} /></InputAdornment>,
                }}
                sx={{ '& .MuiInputBase-root': { bgcolor: '#f8fafc' } }} />
            </Grid>
          </Grid>
        </Paper>

        {/* ════════════════════════════════════════════════
            SECTION 2 — Professional Details
        ════════════════════════════════════════════════ */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <SectionHeader
            icon={<PracticeIcon fontSize="small" />}
            title="Professional Details"
            color="#8b5cf6"
            step={2} totalSteps={5}
          />
          <Grid container spacing={2}>

            {/* Specialties */}
            <Grid item xs={12}>
              <Autocomplete
                multiple freeSolo={false}
                options={SPECIALTIES}
                value={form.specialties}
                onChange={(_, v) => set('specialties', v)}
                filterSelectedOptions
                renderTags={(val, getTagProps) =>
                  val.map((opt, i) => (
                    <Chip label={opt} size="small" {...getTagProps({ index: i })}
                      sx={{ bgcolor: '#ede9fe', color: '#5b21b6', fontWeight: 600 }} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} required label="Specialties"
                    placeholder={form.specialties.length ? '' : 'Search and select…'}
                    helperText="Select all that apply — used for referral matching"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <FieldIcon icon={<MedicalIcon sx={{ fontSize: 20 }} />} color="#8b5cf6" />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Credential */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Credential"
                value={form.credential}
                onChange={e => set('credential', e.target.value)}
                placeholder="e.g. MD, DO, NP, PA, RPH"
                InputProps={{ startAdornment: <FieldIcon icon={<CredentialIcon sx={{ fontSize: 20 }} />} color="#8b5cf6" /> }}
              />
            </Grid>

            {/* Gender */}
            <Grid item xs={12} sm={6}>
              <SelectWithIcon icon={<GenderIcon />} iconColor="#8b5cf6">
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select value={form.gender} label="Gender"
                    onChange={e => set('gender', e.target.value)}>
                    {GENDER_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </SelectWithIcon>
            </Grid>

            {/* Practice / Clinic Name */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth
                label={form.enumerationType === 'NPI-2' ? 'Organization Name' : 'Practice / Clinic Name'}
                value={form.organizationName}
                onChange={e => set('organizationName', e.target.value)}
                placeholder="e.g. City Medical Center"
                InputProps={{ startAdornment: <FieldIcon icon={<ClinicIcon sx={{ fontSize: 20 }} />} color="#8b5cf6" /> }}
              />
            </Grid>

          </Grid>
        </Paper>

        {/* ════════════════════════════════════════════════
            SECTION 3 — Referral & Practice Details
        ════════════════════════════════════════════════ */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1.5px solid #e0e7ff', bgcolor: '#fafafe' }}>
          <SectionHeader
            icon={<ReferralIcon fontSize="small" />}
            title="Referral & Practice Details"
            subtitle="Used for referral matching, patient routing, and provider directory."
            color="#6366f1"
            step={3} totalSteps={5}
          />

          {/* Toggle row */}
          <Box display="flex" flexWrap="wrap" gap={3} mb={3}
            sx={{ p: 2, borderRadius: 2, bgcolor: '#fff', border: '1px solid #e5e7eb' }}>
            <FormControlLabel
              control={
                <Switch checked={form.acceptingNewPatients}
                  onChange={e => set('acceptingNewPatients', e.target.checked)}
                  color="success" />
              }
              label={
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <AcceptingIcon sx={{ fontSize: 20, color: form.acceptingNewPatients ? '#16a34a' : 'text.disabled', mt: 0.1 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Accepting New Patients</Typography>
                    <Typography variant="caption" color="text.secondary">Visible in referral directory</Typography>
                  </Box>
                </Box>
              }
            />
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            <FormControlLabel
              control={
                <Switch checked={form.telehealthAvailable}
                  onChange={e => set('telehealthAvailable', e.target.checked)}
                  color="primary" />
              }
              label={
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <TelehealthIcon sx={{ fontSize: 20, color: form.telehealthAvailable ? '#2563eb' : 'text.disabled', mt: 0.1 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Telehealth Available</Typography>
                    <Typography variant="caption" color="text.secondary">Virtual visits offered</Typography>
                  </Box>
                </Box>
              }
            />
          </Box>

          <Grid container spacing={2.5}>

            {/* Age Groups */}
            <Grid item xs={12}>
              <FieldLabel
                icon={<AgeGroupIcon sx={{ fontSize: 18 }} />}
                label="Age Groups Treated"
                color="#6366f1"
              />
              <Box display="flex" flexWrap="wrap" gap={0.75}>
                {AGE_GROUPS.map(g => {
                  const sel = form.ageGroupsTreated.includes(g);
                  return (
                    <Chip key={g} label={g} size="small" clickable
                      onClick={() => set('ageGroupsTreated',
                        sel ? form.ageGroupsTreated.filter(x => x !== g)
                            : [...form.ageGroupsTreated, g])}
                      sx={{
                        bgcolor:    sel ? '#6366f1' : '#f1f5f9',
                        color:      sel ? '#fff'    : 'text.secondary',
                        fontWeight: sel ? 700       : 400,
                        transition: 'all 0.15s',
                        '&:hover':  { bgcolor: sel ? '#4f46e5' : '#e2e8f0' },
                      }}
                    />
                  );
                })}
              </Box>
            </Grid>

            {/* Languages */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={LANGUAGES}
                value={form.languagesSpoken}
                onChange={(_, v) => set('languagesSpoken', v)}
                filterSelectedOptions
                renderTags={(val, getTagProps) =>
                  val.map((opt, i) => <Chip label={opt} size="small" {...getTagProps({ index: i })} />)
                }
                renderInput={(params) => (
                  <TextField {...params} label="Languages Spoken"
                    placeholder={form.languagesSpoken.length ? '' : 'e.g. English, Spanish…'}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <FieldIcon icon={<TranslateIcon sx={{ fontSize: 20 }} />} color="#6366f1" />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Insurance */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={INSURANCE_PLANS}
                value={form.insuranceAccepted}
                onChange={(_, v) => set('insuranceAccepted', v)}
                filterSelectedOptions
                renderTags={(val, getTagProps) =>
                  val.map((opt, i) => (
                    <Chip label={opt} size="small" {...getTagProps({ index: i })}
                      sx={{ bgcolor: '#f0fdf4', color: '#166534' }} />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Insurance Accepted"
                    placeholder={form.insuranceAccepted.length ? '' : 'Search plans…'}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <FieldIcon icon={<InsuranceIcon sx={{ fontSize: 20 }} />} color="#16a34a" />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>

            {/* Conditions Treated */}
            <Grid item xs={12}>
              <ChipInput
                icon={<ConditionsIcon sx={{ fontSize: 18 }} />}
                iconColor="#e11d48"
                label="Conditions Treated / Areas of Focus"
                value={form.conditionsTreated}
                onChange={v => set('conditionsTreated', v)}
                placeholder="Type a condition and press Enter — e.g. Diabetes, Heart Failure"
              />
            </Grid>

            {/* Board Certifications */}
            <Grid item xs={12} sm={6}>
              <ChipInput
                icon={<CertIcon sx={{ fontSize: 18 }} />}
                iconColor="#d97706"
                label="Board Certifications"
                value={form.boardCertifications}
                onChange={v => set('boardCertifications', v)}
                placeholder="e.g. ABIM, ABFM, ABPN"
              />
            </Grid>

            {/* Hospital Affiliations */}
            <Grid item xs={12} sm={6}>
              <ChipInput
                icon={<HospitalIcon sx={{ fontSize: 18 }} />}
                iconColor="#0284c7"
                label="Hospital Affiliations"
                value={form.hospitalAffiliations}
                onChange={v => set('hospitalAffiliations', v)}
                placeholder="e.g. Mass General, UCSF Medical Center"
              />
            </Grid>

          </Grid>
        </Paper>

        {/* ════════════════════════════════════════════════
            SECTION 4 — Contact Information
        ════════════════════════════════════════════════ */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <SectionHeader
            icon={<ContactIcon fontSize="small" />}
            title="Contact Information"
            subtitle={form.npi ? 'Fax and address pre-filled from NPI mailing address (editable).' : undefined}
            color="#0ea5e9"
            step={4} totalSteps={5}
          />
          <Grid container spacing={2}>

            {/* Phone */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Phone" value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="e.g. 515-296-1301"
                helperText="Practice location phone"
                InputProps={{ startAdornment: <FieldIcon icon={<PhoneIcon sx={{ fontSize: 20 }} />} color="#0ea5e9" /> }}
              />
            </Grid>

            {/* Fax */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Fax" value={form.fax}
                onChange={e => set('fax', e.target.value)}
                placeholder="e.g. 515-292-0000"
                InputProps={{ startAdornment: <FieldIcon icon={<PrintIcon sx={{ fontSize: 20 }} />} color="#0ea5e9" /> }}
              />
            </Grid>

            {/* Address Line 1 */}
            <Grid item xs={12}>
              <TextField fullWidth label="Address Line 1" value={form.address.line1}
                onChange={e => setAddr('line1', e.target.value)}
                placeholder="Street address"
                InputProps={{ startAdornment: <FieldIcon icon={<LocationOnIcon sx={{ fontSize: 20 }} />} color="#0ea5e9" /> }}
              />
            </Grid>

            {/* Address Line 2 */}
            <Grid item xs={12}>
              <TextField fullWidth label="Address Line 2" value={form.address.line2}
                onChange={e => setAddr('line2', e.target.value)}
                placeholder="Suite, floor, unit, etc."
                InputProps={{ startAdornment: <FieldIcon icon={<ApartmentIcon sx={{ fontSize: 20 }} />} color="#0ea5e9" /> }}
              />
            </Grid>

            {/* City */}
            <Grid item xs={12} sm={5}>
              <TextField fullWidth label="City" value={form.address.city}
                onChange={e => setAddr('city', e.target.value)}
                InputProps={{ startAdornment: <FieldIcon icon={<LocationCityIcon sx={{ fontSize: 20 }} />} color="#0ea5e9" /> }}
              />
            </Grid>

            {/* State */}
            <Grid item xs={12} sm={4}>
              <SelectWithIcon icon={<MapIcon />} iconColor="#0ea5e9">
                <FormControl fullWidth>
                  <InputLabel>State</InputLabel>
                  <Select value={form.address.state} label="State"
                    onChange={e => setAddr('state', e.target.value)}>
                    {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </SelectWithIcon>
            </Grid>

            {/* ZIP */}
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="ZIP" value={form.address.zip}
                onChange={e => setAddr('zip', e.target.value)}
                inputProps={{ maxLength: 5 }}
                InputProps={{ startAdornment: <FieldIcon icon={<PostalIcon sx={{ fontSize: 20 }} />} color="#0ea5e9" /> }}
              />
            </Grid>

          </Grid>
        </Paper>

        {/* ════════════════════════════════════════════════
            SECTION 5 — License Information
        ════════════════════════════════════════════════ */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <SectionHeader
            icon={<LicenseIcon fontSize="small" />}
            title="License Information"
            subtitle="You can complete this now or when uploading documents in the next step."
            color="#10b981"
            step={5} totalSteps={5}
          />
          <Grid container spacing={2}>

            {/* License Number */}
            <Grid item xs={12} sm={5}>
              <TextField fullWidth label="License Number" value={form.licenseNumber}
                onChange={e => set('licenseNumber', e.target.value)}
                placeholder="e.g. MD-123456"
                InputProps={{ startAdornment: <FieldIcon icon={<LicenseIcon sx={{ fontSize: 20 }} />} color="#10b981" /> }}
              />
            </Grid>

            {/* License State */}
            <Grid item xs={12} sm={3}>
              <SelectWithIcon icon={<MapIcon />} iconColor="#10b981">
                <FormControl fullWidth>
                  <InputLabel>License State</InputLabel>
                  <Select value={form.licenseState} label="License State"
                    onChange={e => set('licenseState', e.target.value)}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {US_STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </SelectWithIcon>
            </Grid>

            {/* DEA Number */}
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="DEA Number (optional)" value={form.deaNumber}
                onChange={e => set('deaNumber', e.target.value)}
                placeholder="e.g. BC1234567"
                InputProps={{ startAdornment: <FieldIcon icon={<MedicalIcon sx={{ fontSize: 20 }} />} color="#10b981" /> }}
              />
            </Grid>

          </Grid>
        </Paper>

        {/* ── Save ── */}
        <Box display="flex" justifyContent="flex-end" gap={2} pb={4}>
          <Button variant="outlined"
            onClick={() => startTransition(() => navigate('/onboarding'))}
            disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" size="large"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave} disabled={saving}
            sx={{
              px: 4, borderRadius: 2,
              bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' },
              boxShadow: '0 4px 14px #8b5cf644',
            }}>
            {saving ? 'Saving…' : 'Save & Continue'}
          </Button>
        </Box>

      </Container>

      <Snackbar open={snack.open} autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}
          onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
