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
const AUTO_APPROVE_CONFIDENCE_MIN = 92;
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

  const systemPrompt = `You are a senior medical director AI assistant specializing in prior authorization review for a multi-specialty healthcare network. Your analysis must be evidence-based, referencing CMS Local Coverage Determinations (LCDs), National Coverage Determinations (NCDs), and AMA CPT guidelines where applicable.

Evaluate each request against these criteria:
1. Medical necessity — Does the clinical documentation establish that the service is medically required per CMS/payer criteria?
2. ICD-10 appropriateness — Do the diagnosis codes support the requested service?
3. CPT code validity — Is the CPT code appropriate for the service described?
4. Urgency justification — Is the stated urgency level clinically supported?
5. Documentation completeness — Are clinical notes sufficient to justify the request?

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation outside JSON):
{
  "recommendation": "Approve" | "Deny" | "Review",
  "confidenceScore": <integer 0-100>,
  "reasoning": "<2-3 sentences of clinical reasoning referencing specific criteria>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "suggestedAction": "<specific actionable guidance for the requesting provider>",
  "guidelinesCited": ["<guideline1>", "<guideline2>"],
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

    const confidence = Math.min(100, Math.max(0, parseInt(result.confidenceScore) || 70));
    const recommendation = ['Approve', 'Deny', 'Review'].includes(result.recommendation)
      ? result.recommendation
      : 'Review';

    logger.info('Azure PA analysis complete', {
      recommendation,
      confidence,
      serviceType,
      urgency,
    });

    return {
      recommendation,
      confidenceScore: confidence,
      reasoning: result.reasoning || 'Analysis completed.',
      keyFactors: Array.isArray(result.keyFactors) ? result.keyFactors : [],
      suggestedAction: result.suggestedAction || 'Review clinical documentation and resubmit if appropriate.',
      guidelinesCited: Array.isArray(result.guidelinesCited) ? result.guidelinesCited : [],
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

  let recommendation = 'Review';
  let confidenceScore = 60;
  let denialReasonCode = '';
  let denialReasonDescription = '';
  const keyFactors = [];
  const guidelinesCited = [];

  // Emergent always gets approved
  if (urgency === 'Emergent') {
    recommendation = 'Approve';
    confidenceScore = 92;
    keyFactors.push('Emergent urgency requires expedited authorization');
    guidelinesCited.push('CMS Emergency Services Coverage — 42 CFR § 410.26');
  } else if (noteLength < 50) {
    recommendation = 'Deny';
    confidenceScore = 78;
    denialReasonCode = '252';
    denialReasonDescription = CARC_CODES['252'];
    keyFactors.push('Clinical notes are insufficient (< 50 characters)');
    keyFactors.push('Medical necessity cannot be established without adequate documentation');
    guidelinesCited.push('CMS Documentation Requirements — Medicare Benefit Policy Manual Ch. 15');
  } else if (diagCount === 0) {
    recommendation = 'Deny';
    confidenceScore = 82;
    denialReasonCode = '167';
    denialReasonDescription = CARC_CODES['167'];
    keyFactors.push('No ICD-10 diagnosis codes provided');
    keyFactors.push('Diagnosis codes required to establish medical necessity');
    guidelinesCited.push('ICD-10-CM Official Guidelines for Coding and Reporting');
  } else if (urgency === 'Urgent' && diagCount >= 2 && noteLength >= 100) {
    recommendation = 'Approve';
    confidenceScore = 82;
    keyFactors.push('Urgent urgency with multiple supporting diagnoses');
    keyFactors.push('Adequate clinical documentation provided');
  } else if (noteLength > 200 && diagCount >= 1) {
    recommendation = 'Approve';
    confidenceScore = 78;
    keyFactors.push('Adequate clinical documentation');
    keyFactors.push('Diagnosis code(s) support medical necessity');
  } else if (noteLength >= 50 && diagCount >= 1) {
    recommendation = 'Review';
    confidenceScore = 65;
    keyFactors.push('Documentation meets minimum threshold but additional detail recommended');
  }

  // Surgical/high-complexity services are always escalated to human review
  if (isSurgical && recommendation === 'Approve') {
    recommendation = 'Review';
    confidenceScore = Math.max(55, confidenceScore - 18);
    keyFactors.push('Surgical/procedural service requires clinical reviewer sign-off');
    guidelinesCited.push('CMS Surgical Prior Authorization Policy');
  }

  if (isHighComplexity) {
    recommendation = 'Review';
    confidenceScore = Math.min(confidenceScore, 60);
    keyFactors.push('High-complexity or experimental service requires additional scrutiny');
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
    reasoning: buildFallbackReasoning(recommendation, urgency, serviceType, diagCount, noteLength),
    keyFactors,
    suggestedAction,
    guidelinesCited,
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
  getFallbackAnalysis,
  isEligibleForAutoApproval,
};
