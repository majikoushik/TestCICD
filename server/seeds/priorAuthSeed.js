const PriorAuthorization = require('../models/PriorAuthorization');

const d = (daysAgo) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
const h = (hoursAgo) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
const m = (minsAgo) => new Date(Date.now() - minsAgo * 60 * 1000);

const samplePAs = [
  // ── Approved ──────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100001', patientName: 'Alice Johnson',
    requestingProviderName: 'Dr. John Smith', targetProviderName: 'Metro Imaging Center',
    serviceType: 'MRI Scan', serviceCode: '70553',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R51', description: 'Headache' }],
    clinicalNotes: 'Patient presents with recurring headaches and vision changes. Neurological symptoms suggest possible demyelinating disease. MRI of brain with contrast required for diagnosis and treatment planning.',
    urgency: 'Urgent', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-100001',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 88,
    aiReasoning: 'Clinical presentation is consistent with neurological disorder requiring imaging. Documentation supports medical necessity. Proceed with scheduling the authorized service within the approval window.',
    aiAnalyzedAt: d(2), reviewerNotes: 'Approved based on clinical necessity and AI recommendation.',
    approvedDate: d(1), expiryDate: d(-89), createdAt: d(3), updatedAt: d(1)
  },
  {
    patientId: 'PT-100004', patientName: 'David Kim',
    requestingProviderName: 'Dr. Sarah Chen', targetProviderName: 'Metro Heart Institute',
    serviceType: 'Cardiac Catheterization', serviceCode: '93460',
    diagnosisCodes: [{ code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' }, { code: 'I20.9', description: 'Angina pectoris, unspecified' }],
    clinicalNotes: 'Patient with unstable angina and positive stress test. Cardiac catheterization needed to evaluate coronary anatomy and guide revascularization decision.',
    urgency: 'Emergent', insurancePlan: 'Medicare', memberId: 'MCR-400004',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 95,
    aiReasoning: 'Emergent cardiac catheterization for unstable angina with positive stress test meets criteria for urgent authorization. Clinical documentation supports medical necessity.',
    aiAnalyzedAt: h(6), reviewerNotes: 'Emergent case approved immediately.',
    approvedDate: h(5), expiryDate: d(-90), createdAt: h(7), updatedAt: h(5)
  },
  {
    patientId: 'PT-100007', patientName: 'Grace Lee',
    requestingProviderName: 'Dr. Sarah Chen', targetProviderName: 'Advanced Oncology Partners',
    serviceType: 'Infusion Therapy', serviceCode: '96413',
    diagnosisCodes: [{ code: 'C50.911', description: 'Malignant neoplasm of unspecified site of right female breast' }],
    clinicalNotes: 'Patient is a 52-year-old female with Stage III breast cancer on active chemotherapy. Requesting prior auth for 4 cycles of IV infusion therapy. Tumor markers show treatment response.',
    urgency: 'Urgent', insurancePlan: 'Kaiser Permanente', memberId: 'KP-700007',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 93,
    aiReasoning: 'Chemotherapy infusion for active Stage III breast cancer meets all criteria for prior authorization. Documented treatment response supports continuation.',
    aiAnalyzedAt: d(4), reviewerNotes: 'Approved. Treatment response documented. Authorize 4 cycles.',
    approvedDate: d(3), expiryDate: d(-87), createdAt: d(5), updatedAt: d(3)
  },
  {
    patientId: 'PT-100008', patientName: 'Henry Thompson',
    requestingProviderName: 'Dr. Mike Johnson', targetProviderName: 'Westside Sleep Disorders Clinic',
    serviceType: 'Sleep Study', serviceCode: '95810',
    diagnosisCodes: [{ code: 'G47.33', description: 'Obstructive sleep apnea (adult)' }],
    clinicalNotes: 'Patient reports excessive daytime sleepiness, loud snoring, and witnessed apneas. Epworth Sleepiness Scale score 16/24. BMI 34.2. Overnight polysomnography requested.',
    urgency: 'Routine', insurancePlan: 'Anthem', memberId: 'ANT-800008',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 85,
    aiReasoning: 'Clinical presentation with high Epworth score, BMI, and witnessed apneas strongly supports medical necessity for polysomnography.',
    aiAnalyzedAt: d(6), reviewerNotes: 'Approved. ESS score and clinical findings meet criteria.',
    approvedDate: d(5), expiryDate: d(-85), createdAt: d(8), updatedAt: d(5)
  },
  {
    patientId: 'PT-100012', patientName: 'Liam Anderson',
    requestingProviderName: 'Dr. John Smith', targetProviderName: 'City Radiology Center',
    serviceType: 'CT Scan', serviceCode: '71250',
    diagnosisCodes: [{ code: 'R04.2', description: 'Haemoptysis' }, { code: 'Z87.891', description: 'Personal history of nicotine dependence' }],
    clinicalNotes: '58-year-old male with 30 pack-year smoking history, persistent cough and hemoptysis. Chest X-ray shows right upper lobe opacity. Low-dose CT chest required for lung cancer screening.',
    urgency: 'Urgent', insurancePlan: 'Medicare', memberId: 'MCR-121212',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 96,
    aiReasoning: 'Hemoptysis with chest X-ray opacity in a heavy smoker constitutes high clinical suspicion for lung malignancy. CT chest is medically necessary.',
    aiAnalyzedAt: d(1), reviewerNotes: 'Approved immediately. High-priority case.',
    approvedDate: h(22), expiryDate: d(-89), createdAt: d(2), updatedAt: h(22)
  },
  {
    patientId: 'PT-100014', patientName: 'Noah Clark',
    requestingProviderName: 'Dr. Mike Johnson', targetProviderName: 'Comprehensive Rehab Center',
    serviceType: 'Occupational Therapy', serviceCode: '97530',
    diagnosisCodes: [{ code: 'I63.9', description: 'Cerebral infarction, unspecified' }, { code: 'G81.90', description: 'Hemiplegia, unspecified, affecting unspecified side' }],
    clinicalNotes: '67-year-old male recovering from ischemic stroke 3 weeks ago with residual left-sided hemiplegia. FIM score 62. Requesting 30 occupational therapy sessions over 10 weeks.',
    urgency: 'Urgent', insurancePlan: 'Medicare', memberId: 'MCR-141414',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 94,
    aiReasoning: 'Post-stroke occupational therapy with documented FIM score and functional deficits clearly meets medical necessity criteria.',
    aiAnalyzedAt: d(3), reviewerNotes: 'Approved. Post-stroke rehab is medically necessary. Authorize 30 sessions.',
    approvedDate: d(2), expiryDate: d(-88), createdAt: d(4), updatedAt: d(2)
  },
  {
    patientId: 'PT-100016', patientName: 'Peter Williams',
    requestingProviderName: 'Dr. Sarah Chen', targetProviderName: 'Gastroenterology Specialists',
    serviceType: 'Colonoscopy', serviceCode: '45378',
    diagnosisCodes: [{ code: 'K92.1', description: 'Melaena' }, { code: 'Z80.0', description: 'Family history of malignant neoplasm of digestive organs' }],
    clinicalNotes: '52-year-old male with 2-week history of melena and hemoglobin drop from 13.8 to 10.2 g/dL. Family history of colon cancer. Colonoscopy urgently needed to evaluate GI bleeding source.',
    urgency: 'Urgent', insurancePlan: 'Anthem', memberId: 'ANT-161616',
    status: 'Approved', aiRecommendation: 'Approve', aiConfidenceScore: 98,
    aiReasoning: 'Active GI bleeding with anemia and family history of colorectal cancer represents an urgent indication for colonoscopy.',
    aiAnalyzedAt: h(8), reviewerNotes: 'Approved urgently. Active bleeding requiring immediate evaluation.',
    approvedDate: h(7), expiryDate: d(-90), createdAt: h(10), updatedAt: h(7)
  },
  // ── Under Review ─────────────────────────────────────────────────────────
  {
    patientId: 'PT-100002', patientName: 'Bob Martinez',
    requestingProviderName: 'Dr. John Smith', targetProviderName: 'City Orthopedic Specialists',
    serviceType: 'Physical Therapy', serviceCode: '97110',
    diagnosisCodes: [{ code: 'M54.5', description: 'Low back pain' }, { code: 'M47.816', description: 'Spondylosis with radiculopathy, lumbar region' }],
    clinicalNotes: 'Patient has chronic low back pain with lumbar radiculopathy confirmed by EMG. Conservative treatment with PT recommended before surgical intervention. 12-week program requested.',
    urgency: 'Routine', insurancePlan: 'Aetna', memberId: 'AET-200002',
    status: 'Under Review', aiRecommendation: 'Approve', aiConfidenceScore: 82,
    aiReasoning: 'Physical therapy for lumbar radiculopathy is well-supported by evidence. Documentation adequately establishes medical necessity.',
    aiAnalyzedAt: d(1), reviewerNotes: '', createdAt: d(2), updatedAt: d(1)
  },
  {
    patientId: 'PT-100010', patientName: 'James Brown',
    requestingProviderName: 'Dr. Sarah Chen', targetProviderName: 'Pediatric Neurology Associates',
    serviceType: 'Specialist Consultation', serviceCode: '99244',
    diagnosisCodes: [{ code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus' }],
    clinicalNotes: '9-year-old male with new-onset seizure activity. Two tonic-clonic episodes in the past month. EEG shows abnormal epileptiform discharges. Referral to pediatric neurologist required.',
    urgency: 'Urgent', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-101010',
    status: 'Under Review', aiRecommendation: 'Approve', aiConfidenceScore: 91,
    aiReasoning: 'New-onset pediatric epilepsy with confirmed EEG abnormalities requires urgent specialist evaluation.',
    aiAnalyzedAt: h(3), reviewerNotes: '', createdAt: d(1), updatedAt: h(3)
  },
  {
    patientId: 'PT-100015', patientName: 'Olivia Harris',
    requestingProviderName: 'Dr. John Smith', targetProviderName: 'Endocrine Specialty Clinic',
    serviceType: 'Durable Medical Equipment', serviceCode: 'E0784',
    diagnosisCodes: [{ code: 'E10.649', description: 'Type 1 diabetes mellitus with hypoglycemia without coma' }],
    clinicalNotes: '28-year-old female with Type 1 diabetes on insulin pump therapy with frequent hypoglycemic episodes (>3/week). Requesting CGM authorization. HbA1c 8.9%.',
    urgency: 'Routine', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-151515',
    status: 'Under Review', aiRecommendation: 'Approve', aiConfidenceScore: 87,
    aiReasoning: 'CGM for Type 1 diabetes with documented hypoglycemic episodes and elevated HbA1c meets standard criteria for authorization.',
    aiAnalyzedAt: h(5), reviewerNotes: '', createdAt: d(1), updatedAt: h(5)
  },
  // ── Pending ───────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100003', patientName: 'Carol White',
    requestingProviderName: 'Dr. Sarah Chen', targetProviderName: 'Regional Cancer Center',
    serviceType: 'PET Scan', serviceCode: '78816',
    diagnosisCodes: [{ code: 'C34.10', description: 'Malignant neoplasm of upper lobe, unspecified bronchus or lung' }],
    clinicalNotes: 'Patient with confirmed Stage II lung cancer. PET scan required for accurate staging and treatment planning. CT showed suspicious mediastinal lymph nodes requiring characterization.',
    urgency: 'Urgent', insurancePlan: 'UnitedHealth', memberId: 'UHC-300003',
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null, aiReasoning: '', aiAnalyzedAt: null,
    reviewerNotes: '', createdAt: h(4), updatedAt: h(4)
  },
  {
    patientId: 'PT-100009', patientName: 'Isabella Garcia',
    requestingProviderName: 'Dr. John Smith', targetProviderName: 'Metro Spine Institute',
    serviceType: 'Epidural Steroid Injection', serviceCode: '62323',
    diagnosisCodes: [{ code: 'M51.16', description: 'Intervertebral disc degeneration, lumbar region' }, { code: 'M54.4', description: 'Lumbago with sciatica, right side' }],
    clinicalNotes: 'Refractory lumbar radiculopathy unresponsive to 8 weeks of PT and NSAIDs. MRI confirms L4-L5 disc herniation with nerve root compression. Epidural steroid injection recommended.',
    urgency: 'Routine', insurancePlan: 'Aetna', memberId: 'AET-900009',
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null, aiReasoning: '', aiAnalyzedAt: null,
    reviewerNotes: '', createdAt: h(2), updatedAt: h(2)
  },
  {
    patientId: 'PT-100013', patientName: 'Mia Robinson',
    requestingProviderName: 'Dr. Mike Johnson', targetProviderName: 'Reproductive Endocrinology Associates',
    serviceType: 'Lab Testing', serviceCode: '89264',
    diagnosisCodes: [{ code: 'N97.9', description: 'Female infertility, unspecified' }, { code: 'E28.2', description: 'Polycystic ovarian syndrome' }],
    clinicalNotes: '33-year-old female with PCOS and 18 months of primary infertility. Comprehensive fertility panel requested including AMH, FSH, LH, estradiol, and antral follicle count.',
    urgency: 'Routine', insurancePlan: 'Cigna', memberId: 'CGN-131313',
    status: 'Pending', aiRecommendation: null, aiConfidenceScore: null, aiReasoning: '', aiAnalyzedAt: null,
    reviewerNotes: '', createdAt: m(30), updatedAt: m(30)
  },
  // ── Denied ────────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100005', patientName: 'Emma Davis',
    requestingProviderName: 'Dr. Mike Johnson', targetProviderName: 'Behavioral Health Associates',
    serviceType: 'Mental Health Services', serviceCode: '90837',
    diagnosisCodes: [{ code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' }, { code: 'F41.1', description: 'Generalized anxiety disorder' }],
    clinicalNotes: 'Patient with treatment-resistant depression and comorbid anxiety. Requires intensive outpatient mental health services. Previous treatments with SSRIs insufficient.',
    urgency: 'Routine', insurancePlan: 'Cigna', memberId: 'CGN-500005',
    status: 'Denied', aiRecommendation: 'Review', aiConfidenceScore: 58,
    aiReasoning: 'Documentation does not adequately demonstrate that standard outpatient therapy has been exhausted. Additional clinical documentation is needed.',
    aiAnalyzedAt: d(5), reviewerNotes: 'Denied pending additional documentation of prior treatment failure. Therapy notes from previous providers required.',
    deniedDate: d(4), createdAt: d(7), updatedAt: d(4)
  },
  {
    patientId: 'PT-100011', patientName: 'Karen Martinez',
    requestingProviderName: 'Dr. Sarah Chen', targetProviderName: 'Regional Bariatric Center',
    serviceType: 'Surgical Procedure', serviceCode: '43644',
    diagnosisCodes: [{ code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories' }, { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' }],
    clinicalNotes: '41-year-old female with morbid obesity (BMI 43.8), type 2 diabetes, and hypertension. 6-month medically supervised weight loss program completed. Laparoscopic gastric bypass requested.',
    urgency: 'Routine', insurancePlan: 'UnitedHealth', memberId: 'UHC-111011',
    status: 'Denied', aiRecommendation: 'Review', aiConfidenceScore: 62,
    aiReasoning: 'While BMI and comorbidities meet surgical criteria, documentation of the 6-month supervised weight loss program requires additional verification.',
    aiAnalyzedAt: d(12), reviewerNotes: 'Denied — supervised diet program documentation is incomplete. Monthly weigh-in records for all 6 months required.',
    deniedDate: d(11), createdAt: d(15), updatedAt: d(11)
  },
  // ── Appealing ─────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100006', patientName: 'Frank Wilson',
    requestingProviderName: 'Dr. John Smith', targetProviderName: '',
    serviceType: 'Surgical Procedure', serviceCode: '27447',
    diagnosisCodes: [{ code: 'M17.11', description: 'Primary osteoarthritis, right knee' }],
    clinicalNotes: 'Patient with severe bilateral knee osteoarthritis, failed conservative management including PT and injections. Total knee replacement recommended for right knee.',
    urgency: 'Routine', insurancePlan: 'Humana', memberId: 'HUM-600006',
    status: 'Appealing', aiRecommendation: 'Review', aiConfidenceScore: 67,
    aiReasoning: 'Surgical procedure requires additional documentation of failed conservative treatments.',
    aiAnalyzedAt: d(10), reviewerNotes: 'Denied initially due to insufficient documentation of conservative treatment failure.',
    deniedDate: d(8),
    appealNotes: 'Attaching 18 months of PT records, 3 corticosteroid injections, and 2 orthopaedic consultations demonstrating failed conservative management.',
    appealSubmittedAt: d(2), createdAt: d(14), updatedAt: d(2)
  },
  // ── Expired ───────────────────────────────────────────────────────────────
  {
    patientId: 'PT-100001', patientName: 'Alice Johnson',
    requestingProviderName: 'Dr. John Smith', targetProviderName: 'NeuroRehab Specialists',
    serviceType: 'Speech Therapy', serviceCode: '92507',
    diagnosisCodes: [{ code: 'G35', description: 'Multiple sclerosis' }, { code: 'R47.1', description: 'Dysarthria and anarthria' }],
    clinicalNotes: 'Patient with confirmed MS presenting with progressive dysarthria. Weekly speech therapy sessions requested for motor speech rehabilitation. Dysarthria Impact Profile score 3/7.',
    urgency: 'Routine', insurancePlan: 'Blue Cross Blue Shield', memberId: 'BCBS-100001',
    status: 'Expired', aiRecommendation: 'Approve', aiConfidenceScore: 83,
    aiReasoning: 'Speech therapy for MS-related dysarthria is clinically indicated. Functional communication impact documented with standardized tool.',
    aiAnalyzedAt: d(95), reviewerNotes: 'Approved. 12 sessions authorized.',
    approvedDate: d(94), expiryDate: d(4), createdAt: d(97), updatedAt: d(4)
  }
];

async function seedPriorAuths() {
  try {
    const count = await PriorAuthorization.countDocuments();
    if (count > 0) {
      console.log(`Prior Authorization collection already has ${count} records — skipping seed.`);
      return;
    }
    await PriorAuthorization.insertMany(samplePAs);
    console.log(`Prior Authorization: seeded ${samplePAs.length} sample records.`);
  } catch (err) {
    console.error('Prior Authorization seed error:', err.message);
  }
}

module.exports = { seedPriorAuths };
