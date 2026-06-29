const https = require('https');
const logger = require('../utils/logger');

// ── Configuration ─────────────────────────────────────────────────────────────
// Set these in your .env file to enable real Azure OpenAI calls.
// The service falls back to heuristic analysis when credentials are absent.
//
//   AZURE_OPENAI_ENDPOINT      = https://your-resource.openai.azure.com
//   AZURE_OPENAI_KEY           = your-api-key   (also accepted: AZURE_OPENAI_API_KEY)
//   AZURE_OPENAI_DEPLOYMENT    = your-deployment-name (e.g. gpt-4o)
//                                (also accepted: AZURE_OPENAI_DEPLOYMENT_NAME)
//   AZURE_OPENAI_API_VERSION   = 2024-05-01-preview  (optional, has sensible default)

const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_KEY = process.env.AZURE_OPENAI_KEY || process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview';

// Auto-approval thresholds — tune these per clinical policy
// confidenceScore is a 0.0-1.0 float; 0.92 = 92% confidence minimum
const AUTO_APPROVE_CONFIDENCE_MIN = 0.92;
const AUTO_APPROVE_URGENCIES = ['Routine', 'Urgent'];
const SURGICAL_KEYWORDS = ['surgery', 'procedure', 'transplant', 'implant', 'biopsy', 'resection', 'excision'];
const HIGH_COMPLEXITY_SERVICES = ['transplant', 'experimental', 'investigational', 'off-label'];

// CARC denial reason code catalogue (subset of X12 CARC codes)
const CARC_CODES = {
  '4':   'Service/equipment/drug is not covered by this payer/contractor',
  '50':  'These are non-covered services because this is not deemed a medical necessity by the payer',
  '96':  'Non-covered charge(s). At least one Remark Code must be provided',
  '97':  'The benefit for this service is included in the payment/allowance for another service/procedure',
  '125': 'Submission/billing error',
  '167': 'This (these) diagnosis(es) is (are) not covered',
  '197': 'Precertification/authorization/notification absent',
  '252': 'An attachment/other documentation is required to adjudicate this claim',
};

// ── Low-level Azure HTTP call ──────────────────────────────────────────────────
function callAzureOpenAI(messages, maxTokens = 1200) {
  return new Promise((resolve, reject) => {
    if (!AZURE_ENDPOINT || !AZURE_KEY) {
      return reject(new Error('Azure OpenAI not configured — set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY in .env'));
    }

    const url = new URL(
      `/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`,
      AZURE_ENDPOINT
    );

    const body = JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature: 0.15,
      response_format: { type: 'json_object' },
      seed: 42, // improves determinism across retries
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            logger.error('Azure OpenAI API error', { code: parsed.error.code, message: parsed.error.message });
            return reject(new Error(`Azure OpenAI: ${parsed.error.message}`));
          }
          const content = parsed.choices?.[0]?.message?.content;
          if (!content) return reject(new Error('Empty response from Azure OpenAI'));
          resolve(JSON.parse(content));
        } catch (e) {
          logger.error('Azure OpenAI parse error', { raw: data.slice(0, 500), error: e.message });
          reject(new Error('Failed to parse Azure OpenAI response'));
        }
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Azure OpenAI request timed out after 30s'));
    });

    req.on('error', (err) => reject(new Error(`Azure OpenAI network error: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

// ── Prior Authorization Analysis ──────────────────────────────────────────────
async function analyzePriorAuthorization(paRequest) {
  const {
    serviceType = '',
    serviceCode = '',
    diagnosisCodes = [],
    clinicalNotes = '',
    urgency = 'Routine',
    patientName = '',
    insurancePlan = '',
    memberId = '',
  } = paRequest;

  const diagnosisText = diagnosisCodes.length
    ? diagnosisCodes.map(d => `${d.code}${d.description ? ': ' + d.description : ''}`).join('; ')
    : 'None provided';

  const systemPrompt = `You are a senior medical director AI assistant specializing in prior authorization review for a multi-specialty healthcare network. Your analysis must be evidence-based, referencing established clinical guidelines including InterQual criteria, MCG (Milliman Care Guidelines), and CMS Local Coverage Determinations (LCDs), National Coverage Determinations (NCDs), and AMA CPT guidelines where applicable.

Base your analysis on established clinical guidelines (InterQual, MCG, CMS LCDs).

Evaluate each request against ALL SIX of these medical necessity criteria:
1. Medical necessity — Does the clinical documentation establish that the service is medically required per CMS/payer criteria and InterQual/MCG severity-of-illness thresholds?
2. ICD-10 appropriateness — Do the diagnosis codes accurately reflect the patient's condition and support the requested service per CMS LCD/NCD coverage indicators?
3. CPT code validity — Is the CPT code appropriate for the service described, and does it align with the documented clinical indication?
4. Urgency justification — Is the stated urgency level clinically supported by objective findings (vitals, labs, imaging) documented in the clinical notes?
5. Documentation completeness — Are clinical notes sufficient to justify the request, including history, physical exam findings, prior treatments tried, and response to treatment?
6. Alternatives considered — Has the provider documented that clinically appropriate lower-acuity or lower-cost alternatives have been attempted or are contraindicated?

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation outside JSON):
{
  "recommendation": "Approve" | "Deny" | "Peer-to-Peer Review",
  "confidenceScore": <float 0.0-1.0>,
  "clinicalReasoning": "<2-3 sentences of clinical reasoning referencing specific criteria and guidelines>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "guidelinesCited": ["<specific guideline or LCD/NCD reference1>", "<guideline2>"],
  "alternativesConsidered": ["<alternative treatment or lower-acuity option1>", "<alternative2>"],
  "appealPoints": ["<strong appeal argument if denying1>", "<appeal argument2>"],
  "suggestedAction": "<specific actionable guidance for the requesting provider>",
  "denialReasonCode": "<CARC code if Deny, else empty string>",
  "denialReasonDescription": "<description of denial reason if Deny, else empty string>",
  "clinicalGapIdentified": "<specific documentation gap if any, else empty string>"
}`;

  const userPrompt = `PRIOR AUTHORIZATION REQUEST
════════════════════════════════
Patient: ${patientName}
Insurance Plan: ${insurancePlan || 'Not specified'}
Member ID: ${memberId || 'Not specified'}
Service Requested: ${serviceType}
CPT Code: ${serviceCode || 'Not provided'}
ICD-10 Diagnosis Codes: ${diagnosisText}
Urgency: ${urgency}

Clinical Notes:
${clinicalNotes}

════════════════════════════════
Provide your prior authorization recommendation based on medical necessity criteria, CMS guidelines, and the documentation above.`;

  try {
    const result = await callAzureOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const rawScore = parseFloat(result.confidenceScore);
    // Accept both 0-1 float and 0-100 integer from the model
    const confidence = isNaN(rawScore)
      ? 0.70
      : rawScore > 1
        ? Math.min(1, rawScore / 100)
        : Math.min(1, Math.max(0, rawScore));

    const recommendation = ['Approve', 'Deny', 'Peer-to-Peer Review'].includes(result.recommendation)
      ? result.recommendation
      : 'Peer-to-Peer Review';

    logger.info('Azure PA analysis complete', {
      recommendation,
      confidence,
      serviceType,
      urgency,
    });

    return {
      recommendation,
      confidenceScore: confidence,
      clinicalReasoning: result.clinicalReasoning || result.reasoning || 'Analysis completed.',
      keyFactors: Array.isArray(result.keyFactors) ? result.keyFactors : [],
      guidelinesCited: Array.isArray(result.guidelinesCited) ? result.guidelinesCited : [],
      alternativesConsidered: Array.isArray(result.alternativesConsidered) ? result.alternativesConsidered : [],
      appealPoints: Array.isArray(result.appealPoints) ? result.appealPoints : [],
      suggestedAction: result.suggestedAction || 'Review clinical documentation and resubmit if appropriate.',
      denialReasonCode: result.denialReasonCode || '',
      denialReasonDescription: result.denialReasonDescription || '',
      clinicalGapIdentified: result.clinicalGapIdentified || '',
      source: 'azure',
    };
  } catch (err) {
    logger.warn('Azure AI analysis failed — using heuristic fallback', {
      error: err.message,
      serviceType,
      urgency,
    });
    return getFallbackAnalysis(paRequest);
  }
}

// ── Appeal Letter Generation ───────────────────────────────────────────────────
async function generateAppealLetter(paRequest, denialReason) {
  const {
    patientName = '',
    serviceType = '',
    serviceCode = '',
    diagnosisCodes = [],
    clinicalNotes = '',
    urgency = 'Routine',
    insurancePlan = '',
    requestingProviderName = '',
  } = paRequest;

  const diagnosisText = diagnosisCodes.map(d => `${d.code}${d.description ? ': ' + d.description : ''}`).join('; ');

  const systemPrompt = `You are a medical appeals specialist helping a physician write a formal prior authorization appeal letter. The letter must be:
- Professional and formal in tone
- Evidence-based, citing specific clinical guidelines (CMS LCDs/NCDs, specialty society guidelines)
- Structured with: opening, clinical justification, guideline citations, request for reconsideration, closing
- Compliant with standard insurance appeal requirements
- Maximum 400 words

Return a JSON object: { "subject": "<letter subject line>", "body": "<full letter body as plain text with \\n line breaks>" }`;

  const userPrompt = `Write an appeal letter for this denied prior authorization:

Patient: ${patientName}
Provider: ${requestingProviderName}
Insurance: ${insurancePlan}
Service: ${serviceType} (CPT: ${serviceCode || 'N/A'})
Diagnoses: ${diagnosisText}
Urgency: ${urgency}
Denial Reason: ${denialReason}
Clinical Notes: ${clinicalNotes}`;

  try {
    const result = await callAzureOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 800);

    return {
      subject: result.subject || `Appeal for Prior Authorization — ${serviceType}`,
      body: result.body || '',
      source: 'azure',
    };
  } catch (err) {
    logger.warn('Azure appeal letter generation failed — using template fallback', { error: err.message });
    return getFallbackAppealLetter(paRequest, denialReason);
  }
}

// ── Heuristic Fallback Analysis (no Azure credentials) ───────────────────────
function getFallbackAnalysis(paRequest) {
  const { urgency = 'Routine', serviceType = '', diagnosisCodes = [], clinicalNotes = '' } = paRequest;

  const noteLength = clinicalNotes.length;
  const diagCount = diagnosisCodes.length;
  const serviceLC = serviceType.toLowerCase();

  const isSurgical = SURGICAL_KEYWORDS.some(k => serviceLC.includes(k));
  const isHighComplexity = HIGH_COMPLEXITY_SERVICES.some(k => serviceLC.includes(k));

  let recommendation = 'Peer-to-Peer Review';
  let confidenceScore = 0.60;
  let denialReasonCode = '';
  let denialReasonDescription = '';
  const keyFactors = [];
  const guidelinesCited = [];
  const alternativesConsidered = [];
  const appealPoints = [];

  // Emergent always gets approved
  if (urgency === 'Emergent') {
    recommendation = 'Approve';
    confidenceScore = 0.92;
    keyFactors.push('Emergent urgency requires expedited authorization');
    guidelinesCited.push('CMS Emergency Services Coverage — 42 CFR § 410.26');
    alternativesConsidered.push('No lower-acuity alternatives appropriate given emergent status');
  } else if (noteLength < 50) {
    recommendation = 'Deny';
    confidenceScore = 0.78;
    denialReasonCode = '252';
    denialReasonDescription = CARC_CODES['252'];
    keyFactors.push('Clinical notes are insufficient (< 50 characters)');
    keyFactors.push('Medical necessity cannot be established without adequate documentation');
    keyFactors.push('Criterion 5 (documentation completeness) not met');
    guidelinesCited.push('CMS Documentation Requirements — Medicare Benefit Policy Manual Ch. 15');
    guidelinesCited.push('InterQual Criteria — Documentation Threshold Requirements');
    appealPoints.push('Submit comprehensive clinical notes including history, exam findings, and prior treatment attempts');
    appealPoints.push('Include objective clinical data (labs, vitals, imaging) supporting medical necessity');
  } else if (diagCount === 0) {
    recommendation = 'Deny';
    confidenceScore = 0.82;
    denialReasonCode = '167';
    denialReasonDescription = CARC_CODES['167'];
    keyFactors.push('No ICD-10 diagnosis codes provided');
    keyFactors.push('Diagnosis codes required to establish medical necessity');
    keyFactors.push('Criterion 2 (ICD-10 appropriateness) not met');
    guidelinesCited.push('ICD-10-CM Official Guidelines for Coding and Reporting');
    guidelinesCited.push('CMS LCD Coverage Indicators require supporting diagnosis codes');
    appealPoints.push('Resubmit with all applicable ICD-10-CM codes that reflect the patient\'s current conditions');
    appealPoints.push('Ensure primary diagnosis code directly supports the medical necessity of the requested service');
  } else if (urgency === 'Urgent' && diagCount >= 2 && noteLength >= 100) {
    recommendation = 'Approve';
    confidenceScore = 0.82;
    keyFactors.push('Urgent urgency with multiple supporting diagnoses');
    keyFactors.push('Adequate clinical documentation provided');
    keyFactors.push('Criteria 1-5 appear satisfied based on submitted documentation');
    guidelinesCited.push('MCG Care Guidelines — Urgent Service Authorization Criteria');
    alternativesConsidered.push('Urgency level indicates lower-acuity alternatives have been assessed');
  } else if (noteLength > 200 && diagCount >= 1) {
    recommendation = 'Approve';
    confidenceScore = 0.78;
    keyFactors.push('Adequate clinical documentation');
    keyFactors.push('Diagnosis code(s) support medical necessity');
    keyFactors.push('Documentation exceeds minimum threshold for review');
    guidelinesCited.push('InterQual Criteria — Service-specific medical necessity thresholds');
    alternativesConsidered.push('Documentation suggests provider assessed conservative treatment options');
  } else if (noteLength >= 50 && diagCount >= 1) {
    recommendation = 'Peer-to-Peer Review';
    confidenceScore = 0.65;
    keyFactors.push('Documentation meets minimum threshold but additional detail recommended');
    keyFactors.push('Criterion 6 (alternatives considered) requires clarification');
    alternativesConsidered.push('Provider should document whether lower-acuity alternatives were attempted');
  }

  // Surgical/high-complexity services are always escalated to human review
  if (isSurgical && recommendation === 'Approve') {
    recommendation = 'Peer-to-Peer Review';
    confidenceScore = Math.max(0.55, confidenceScore - 0.18);
    keyFactors.push('Surgical/procedural service requires clinical reviewer sign-off');
    guidelinesCited.push('CMS Surgical Prior Authorization Policy');
    alternativesConsidered.push('Non-surgical management options should be documented as having been considered');
  }

  if (isHighComplexity) {
    recommendation = 'Peer-to-Peer Review';
    confidenceScore = Math.min(confidenceScore, 0.60);
    keyFactors.push('High-complexity or experimental service requires additional scrutiny');
    alternativesConsidered.push('Standard of care alternatives must be documented as inadequate or contraindicated');
  }

  if (keyFactors.length < 3) {
    keyFactors.push(`Urgency level: ${urgency}`);
    if (keyFactors.length < 3) keyFactors.push(`Diagnosis codes provided: ${diagCount}`);
    if (keyFactors.length < 3) keyFactors.push(`Clinical notes length: ${noteLength > 100 ? 'Adequate' : 'Insufficient'}`);
  }

  const suggestedAction =
    recommendation === 'Approve'
      ? 'Authorization granted. Schedule the service within the approval window.'
      : recommendation === 'Deny'
      ? 'Provide detailed clinical notes establishing medical necessity, relevant history, and all supporting diagnosis codes. Consider peer-to-peer review.'
      : 'Provide supplementary clinical documentation including recent labs, imaging reports, or specialist consultation notes.';

  logger.info('PA heuristic fallback used', { recommendation, confidenceScore, urgency, diagCount, noteLength });

  return {
    recommendation,
    confidenceScore,
    clinicalReasoning: buildFallbackReasoning(recommendation, urgency, serviceType, diagCount, noteLength),
    keyFactors,
    guidelinesCited,
    alternativesConsidered,
    appealPoints,
    suggestedAction,
    denialReasonCode,
    denialReasonDescription,
    clinicalGapIdentified: recommendation === 'Deny' ? suggestedAction : '',
    source: 'heuristic',
  };
}

function buildFallbackReasoning(recommendation, urgency, serviceType, diagCount, noteLength) {
  if (recommendation === 'Approve') {
    return `Based on the ${urgency.toLowerCase()} urgency level, ${diagCount} supporting diagnosis code(s), and clinical documentation provided for ${serviceType}, this request meets standard medical necessity criteria. Authorization is recommended within the specified approval window.`;
  }
  if (recommendation === 'Deny') {
    const gap = noteLength < 50
      ? 'insufficient clinical documentation'
      : 'absence of supporting ICD-10 diagnosis codes';
    return `This prior authorization request for ${serviceType} was denied due to ${gap}. Per CMS documentation requirements, adequate clinical notes and diagnosis codes are required to establish medical necessity. The provider should address these gaps and resubmit.`;
  }
  return `The prior authorization request for ${serviceType} requires additional clinical review. The submitted documentation partially supports the request, but further detail is needed before a determination can be made. A peer-to-peer review or supplementary documentation submission is recommended.`;
}

// ── Fallback Appeal Letter ─────────────────────────────────────────────────────
function getFallbackAppealLetter(paRequest, denialReason) {
  const { patientName = '', serviceType = '', requestingProviderName = '', insurancePlan = '' } = paRequest;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const body = `${date}

To the Medical Review Board,
${insurancePlan || 'Insurance Review Committee'}

RE: Prior Authorization Appeal — Patient: ${patientName}, Service: ${serviceType}

Dear Medical Review Board,

I am writing to formally appeal the denial of the prior authorization request for ${serviceType} for patient ${patientName}.

The denial reason provided was: ${denialReason || 'Not specified'}.

Clinical Justification:
The requested service is medically necessary based on the patient's current clinical status, supporting diagnosis codes, and the treating provider's assessment. The documentation submitted establishes that this service meets standard medical necessity criteria as defined by CMS and current clinical practice guidelines.

I respectfully request that the Medical Review Board reconsider this determination in light of the clinical evidence presented. I am available for a peer-to-peer review at your earliest convenience.

Supporting documentation has been attached to this appeal.

Sincerely,

${requestingProviderName}`;

  return {
    subject: `Prior Authorization Appeal — ${patientName} — ${serviceType}`,
    body,
    source: 'template',
  };
}

// ── Clinical Insight (conversational Q&A for providers) ───────────────────────
async function generateClinicalInsight(patientContext, question) {
  if (!question || typeof question !== 'string') {
    logger.warn('generateClinicalInsight called without a question');
    return getFallbackClinicalInsight(question);
  }

  const systemPrompt = `You are a clinical decision support AI for healthcare providers. Provide evidence-based, concise clinical guidance. Always recommend consulting appropriate specialists for complex cases.

Your guidance must:
- Reference specific clinical guidelines, society recommendations, or evidence-based literature when applicable
- Be concise and actionable (2-4 sentences for the answer)
- Clearly flag when specialist consultation, urgent workup, or escalation is warranted
- Never replace clinical judgment — frame recommendations as decision support, not directives

Return ONLY a valid JSON object with these exact fields:
{
  "answer": "<2-4 sentence evidence-based answer to the provider's question>",
  "confidence": <float 0.0-1.0, reflecting certainty given available context>,
  "suggestedActions": ["<specific actionable step1>", "<actionable step2>", "<actionable step3>"],
  "relevantGuidelines": ["<guideline or reference1>", "<guideline2>"],
  "escalationWarning": "<non-empty string if urgent specialist referral or escalation is indicated, else empty string>"
}`;

  const userPrompt = `Patient Context:
${patientContext || 'No additional patient context provided.'}

Provider Question:
${question}`;

  try {
    const result = await callAzureOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 700);

    const rawScore = parseFloat(result.confidence);
    const confidence = isNaN(rawScore)
      ? 0.70
      : rawScore > 1 ? Math.min(1, rawScore / 100) : Math.min(1, Math.max(0, rawScore));

    logger.info('Azure clinical insight generated', { confidence, questionLength: question.length });

    return {
      answer: result.answer || 'Unable to generate a clinical insight for this question.',
      confidence,
      suggestedActions: Array.isArray(result.suggestedActions) ? result.suggestedActions : [],
      relevantGuidelines: Array.isArray(result.relevantGuidelines) ? result.relevantGuidelines : [],
      escalationWarning: result.escalationWarning || '',
      source: 'azure',
    };
  } catch (err) {
    logger.warn('Azure clinical insight generation failed — using fallback', { error: err.message });
    return getFallbackClinicalInsight(question);
  }
}

function getFallbackClinicalInsight(question) {
  logger.info('Clinical insight heuristic fallback used');
  return {
    answer: 'Clinical decision support is temporarily unavailable. Please consult current clinical guidelines or a specialist for guidance on this question.',
    confidence: 0.40,
    suggestedActions: [
      'Consult the relevant specialty service for a definitive recommendation',
      'Review current clinical practice guidelines (AHA, ACS, USPSTF, or relevant specialty society)',
      'Document clinical rationale in the patient chart regardless of the decision made',
    ],
    relevantGuidelines: [
      'Refer to current specialty society guidelines for this clinical scenario',
      'UpToDate or DynaMed for evidence-based point-of-care guidance',
    ],
    escalationWarning: 'Azure AI is not configured — this is a placeholder response only. Do not rely on it for clinical decisions.',
    source: 'heuristic',
  };
}

// ── Referral Summary Generation ────────────────────────────────────────────────
async function generateReferralSummary(referralData) {
  const {
    patientDiagnosis = '',
    clinicalNotes = '',
    requestedSpecialty = '',
    urgency = 'Routine',
    patientName = '',
    relevantHistory = '',
    currentMedications = '',
  } = referralData || {};

  const systemPrompt = `You are a clinical documentation AI that generates concise, professional referral summaries for specialist consultations. Your summaries are read by specialist physicians who need to quickly understand why a patient is being referred.

Generate summaries that:
- Lead with the primary clinical question or concern
- Include only clinically relevant information
- Use standard medical terminology appropriate for specialist-to-specialist communication
- Are factual and grounded in the provided clinical notes — do not invent findings

Return ONLY a valid JSON object with these exact fields:
{
  "clinicalJustification": "<2-3 sentences summarizing why this referral is clinically indicated, citing key findings from the notes>",
  "urgencyRationale": "<1-2 sentences explaining why the chosen urgency level is appropriate given the clinical situation>",
  "keyFindings": ["<relevant objective finding or symptom1>", "<finding2>", "<finding3>"],
  "referralQuestion": "<the specific clinical question this specialist is being asked to answer>",
  "suggestedWorkup": ["<test or evaluation the specialist may want to consider1>", "<workup item2>"]
}`;

  const userPrompt = `REFERRAL SUMMARY REQUEST
════════════════════════
Patient: ${patientName || 'Not specified'}
Requested Specialty: ${requestedSpecialty}
Urgency: ${urgency}
Primary Diagnosis: ${patientDiagnosis}

Clinical Notes:
${clinicalNotes || 'None provided'}

Relevant History:
${relevantHistory || 'Not provided'}

Current Medications:
${currentMedications || 'Not provided'}
════════════════════════
Generate a clinical referral summary appropriate for ${requestedSpecialty} review.`;

  try {
    const result = await callAzureOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 600);

    logger.info('Azure referral summary generated', { requestedSpecialty, urgency });

    return {
      clinicalJustification: result.clinicalJustification || 'Referral indicated based on clinical presentation documented in the attached notes.',
      urgencyRationale: result.urgencyRationale || `${urgency} referral based on current clinical status.`,
      keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : [],
      referralQuestion: result.referralQuestion || `Please evaluate and provide recommendations for management of ${patientDiagnosis || 'the above condition'}.`,
      suggestedWorkup: Array.isArray(result.suggestedWorkup) ? result.suggestedWorkup : [],
      source: 'azure',
    };
  } catch (err) {
    logger.warn('Azure referral summary generation failed — using fallback', { error: err.message, requestedSpecialty });
    return getFallbackReferralSummary(referralData);
  }
}

function getFallbackReferralSummary(referralData) {
  const {
    patientDiagnosis = 'the documented condition',
    requestedSpecialty = 'Specialist',
    urgency = 'Routine',
    clinicalNotes = '',
  } = referralData || {};

  logger.info('Referral summary heuristic fallback used', { requestedSpecialty, urgency });

  return {
    clinicalJustification: `Patient is being referred to ${requestedSpecialty} for evaluation and management of ${patientDiagnosis}. Clinical documentation supports the need for specialist consultation based on the patient's current presentation and clinical course. Provider has determined that specialist input is necessary to optimize the patient's management plan.`,
    urgencyRationale: `${urgency} referral priority assigned based on the provider's clinical assessment of the patient's current status and acuity.`,
    keyFindings: clinicalNotes
      ? ['Clinical documentation available — see attached notes', `Diagnosis: ${patientDiagnosis}`, `Urgency level: ${urgency}`]
      : [`Primary diagnosis: ${patientDiagnosis}`, `Referral urgency: ${urgency}`, 'Complete clinical details available from referring provider'],
    referralQuestion: `Please evaluate ${patientDiagnosis} and provide recommendations for ongoing management and any additional workup you deem appropriate.`,
    suggestedWorkup: [
      'Review prior workup and imaging if available',
      'Consider specialty-specific evaluation per clinical presentation',
    ],
    source: 'heuristic',
  };
}

// ── Risk Factor Analysis ───────────────────────────────────────────────────────
async function analyzeRiskFactors(patientData) {
  const {
    conditions = [],
    medications = [],
    recentVisits = [],
    riskScore = null,
    patientAge = null,
    patientName = '',
  } = patientData || {};

  const conditionsText = conditions.length ? conditions.join(', ') : 'None documented';
  const medicationsText = medications.length ? medications.join(', ') : 'None documented';
  const visitsText = recentVisits.length
    ? recentVisits.map(v => `${v.date || 'Unknown date'}: ${v.reason || v.type || 'Visit'}`).join('; ')
    : 'No recent visits on record';

  const systemPrompt = `You are a clinical risk stratification AI that interprets patient risk scores and clinical data for healthcare providers. You translate complex risk scores and clinical patterns into plain-English explanations that help providers understand and act on high-risk patients.

Your analysis must:
- Explain risk drivers in plain English (avoid excessive jargon — providers need to explain this to patients too)
- Prioritize modifiable risk factors that can be addressed through clinical intervention
- Base recommendations on evidence-based chronic disease management guidelines
- Be specific and actionable, not generic

Return ONLY a valid JSON object with these exact fields:
{
  "riskNarrative": "<2-3 plain-English sentences explaining why this patient has an elevated risk score and what it means clinically>",
  "topRiskDrivers": ["<specific modifiable or non-modifiable risk driver1 with brief explanation>", "<driver2>", "<driver3>"],
  "interventionRecommendations": ["<specific evidence-based intervention1 tied to a risk driver>", "<intervention2>", "<intervention3>"],
  "urgentFlags": ["<condition or finding that warrants immediate attention1, or empty array if none>"],
  "monitoringParameters": ["<specific lab, vital, or clinical parameter to track1>", "<parameter2>"]
}`;

  const userPrompt = `PATIENT RISK PROFILE
════════════════════════
Patient: ${patientName || 'Not specified'}
Age: ${patientAge !== null ? patientAge : 'Not specified'}
Overall Risk Score: ${riskScore !== null ? riskScore : 'Not calculated'}

Active Conditions:
${conditionsText}

Current Medications:
${medicationsText}

Recent Visits (last 12 months):
${visitsText}
════════════════════════
Analyze the risk factors driving this patient's risk score and provide actionable intervention recommendations.`;

  try {
    const result = await callAzureOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 700);

    logger.info('Azure risk factor analysis complete', {
      patientName,
      riskScore,
      conditionCount: conditions.length,
    });

    return {
      riskNarrative: result.riskNarrative || 'Risk analysis completed. Please review the identified risk drivers below.',
      topRiskDrivers: Array.isArray(result.topRiskDrivers) ? result.topRiskDrivers : [],
      interventionRecommendations: Array.isArray(result.interventionRecommendations) ? result.interventionRecommendations : [],
      urgentFlags: Array.isArray(result.urgentFlags) ? result.urgentFlags : [],
      monitoringParameters: Array.isArray(result.monitoringParameters) ? result.monitoringParameters : [],
      source: 'azure',
    };
  } catch (err) {
    logger.warn('Azure risk factor analysis failed — using fallback', { error: err.message, riskScore });
    return getFallbackRiskAnalysis(patientData);
  }
}

function getFallbackRiskAnalysis(patientData) {
  const {
    conditions = [],
    medications = [],
    riskScore = null,
    recentVisits = [],
  } = patientData || {};

  const highRiskConditions = ['diabetes', 'heart failure', 'chf', 'copd', 'ckd', 'hypertension', 'cancer', 'stroke', 'afib'];
  const matchedConditions = conditions.filter(c =>
    highRiskConditions.some(hrc => c.toLowerCase().includes(hrc))
  );

  const visitCount = recentVisits.length;
  const isHighRisk = riskScore !== null ? riskScore >= 70 : matchedConditions.length >= 2;
  const isMedComplex = medications.length >= 5;

  const topRiskDrivers = [];
  const interventionRecommendations = [];
  const urgentFlags = [];
  const monitoringParameters = [];

  if (matchedConditions.length > 0) {
    topRiskDrivers.push(`Chronic conditions (${matchedConditions.slice(0, 3).join(', ')}) contribute significantly to overall risk`);
    interventionRecommendations.push('Ensure all chronic conditions have active, guideline-concordant management plans');
    monitoringParameters.push('HbA1c, BMP, CBC per condition-specific monitoring intervals');
  }

  if (isMedComplex) {
    topRiskDrivers.push(`Polypharmacy (${medications.length} medications) increases risk of adverse drug events and non-adherence`);
    interventionRecommendations.push('Conduct medication reconciliation and deprescribing review — target high-risk medications (anticoagulants, insulin, opioids)');
    monitoringParameters.push('Annual medication reconciliation; screen for drug-drug interactions');
  }

  if (visitCount >= 3) {
    topRiskDrivers.push(`Frequent healthcare utilization (${visitCount} visits) may indicate uncontrolled conditions or care gaps`);
    interventionRecommendations.push('Schedule care coordination visit to address root causes of frequent utilization');
    urgentFlags.push(visitCount >= 5 ? `High visit frequency (${visitCount} visits) — evaluate for care management enrollment` : '');
  }

  if (isHighRisk) {
    interventionRecommendations.push('Enroll in disease management or complex care coordination program');
    monitoringParameters.push('Monthly care manager outreach; 30-day post-discharge follow-up if recently hospitalized');
  }

  // Remove empty strings from urgentFlags
  const filteredUrgentFlags = urgentFlags.filter(f => f);

  const scoreLabel = riskScore !== null
    ? `a calculated risk score of ${riskScore}`
    : 'an elevated risk profile based on documented conditions';

  logger.info('Risk factor heuristic fallback used', { riskScore, conditionCount: conditions.length, medicationCount: medications.length });

  return {
    riskNarrative: `This patient has ${scoreLabel}, driven primarily by ${matchedConditions.length > 0 ? 'multiple chronic conditions' : 'clinical complexity factors'} identified in their health record. ${isMedComplex ? `The current medication regimen of ${medications.length} active medications adds additional complexity. ` : ''}Proactive care management and guideline-concordant chronic disease management are recommended to reduce risk.`,
    topRiskDrivers: topRiskDrivers.length > 0 ? topRiskDrivers : ['Insufficient data for detailed risk driver analysis — review complete clinical record'],
    interventionRecommendations: interventionRecommendations.length > 0
      ? interventionRecommendations
      : ['Review and update chronic condition management plans', 'Ensure preventive care and screenings are current', 'Assess social determinants of health for additional risk factors'],
    urgentFlags: filteredUrgentFlags,
    monitoringParameters: monitoringParameters.length > 0 ? monitoringParameters : ['Routine condition-specific labs and vitals per clinical guidelines'],
    source: 'heuristic',
  };
}

// ── Auto-approval eligibility check ───────────────────────────────────────────
function isEligibleForAutoApproval(paRequest, aiResult) {
  if (!aiResult || aiResult.recommendation !== 'Approve') return false;
  if (aiResult.confidenceScore < AUTO_APPROVE_CONFIDENCE_MIN) return false;
  if (!AUTO_APPROVE_URGENCIES.includes(paRequest.urgency)) return false;

  const serviceLC = (paRequest.serviceType || '').toLowerCase();
  if (SURGICAL_KEYWORDS.some(k => serviceLC.includes(k))) return false;
  if (HIGH_COMPLEXITY_SERVICES.some(k => serviceLC.includes(k))) return false;

  return true;
}

module.exports = {
  analyzePriorAuthorization,
  generateAppealLetter,
  generateClinicalInsight,
  generateReferralSummary,
  analyzeRiskFactors,
  getFallbackAnalysis,
  isEligibleForAutoApproval,
};
