'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Azure Speech – Speech-to-Text
// ---------------------------------------------------------------------------

/**
 * Transcribe an audio buffer using Azure Cognitive Services Speech SDK.
 * Falls back to a stub response when the required env vars are absent.
 *
 * @param {Buffer} audioBuffer  Raw audio data
 * @param {string} mimeType     MIME type of the audio (e.g. 'audio/wav')
 * @returns {Promise<{success: boolean, stub?: boolean, transcript?: string|null, error?: string}>}
 */
async function transcribeAudio(_audioBuffer, _mimeType) {
  const key    = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    logger.info('[ambientIntelligenceService] AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set – returning stub transcript.');
    return { success: true, stub: true, transcript: null };
  }

  try {
    // Actual SDK usage (commented out – install microsoft-cognitiveservices-speech-sdk first):
    // const sdk = require('microsoft-cognitiveservices-speech-sdk');
    // const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    // speechConfig.speechRecognitionLanguage = 'en-US';
    // const pushStream = sdk.AudioInputStream.createPushStream();
    // pushStream.write(audioBuffer);
    // pushStream.close();
    // const audioConfig   = sdk.AudioConfig.fromStreamInput(pushStream);
    // const recognizer    = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    // const result = await new Promise((resolve, reject) => {
    //   recognizer.recognizeOnceAsync(resolve, reject);
    // });
    // recognizer.close();
    // const transcript = result.text || '';
    // return { success: true, transcript };

  } catch (err) {
    logger.error('[ambientIntelligenceService] transcribeAudio error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }

  // Placeholder until SDK above is wired up
  return { success: true, transcript: '' };
}

// ---------------------------------------------------------------------------
// Azure OpenAI – Clinical Note Generation
// ---------------------------------------------------------------------------

/**
 * Build the stub/mock clinical content object used when Azure OpenAI env vars
 * are absent.
 *
 * @param {{patientName: string, chiefComplaint: string, patientDOB?: string, patientInsurance?: string}} patientInfo
 * @returns {object}
 */
function buildMockClinicalContent(patientInfo) {
  const { patientName, chiefComplaint, patientDOB, patientInsurance } = patientInfo;
  const insurance = patientInsurance;

  return {
    success: true,
    stub: true,
    clinicalSummary:
      'SUBJECTIVE: Patient presents with chief complaint of ' + chiefComplaint +
      '. Patient reports onset 3 days ago with gradual progression. Denies fever, chills. ' +
      'Reports mild improvement with OTC medication.\n\n' +
      'OBJECTIVE: Vitals within normal limits. Alert and oriented x3. No acute distress. ' +
      'Relevant exam findings documented.\n\n' +
      'ASSESSMENT: Based on history and examination, impression consistent with reported symptoms. ' +
      'Differential includes primary diagnosis and secondary considerations.\n\n' +
      'PLAN: Specialist referral initiated. Patient counseled on warning signs. ' +
      'Follow-up in 2 weeks or sooner if symptoms worsen.',
    referralNoteDraft:
      'Dear Specialist,\n\n' +
      'I am referring ' + patientName + ' (DOB: ' + (patientDOB || 'on file') + ') for evaluation of ' + chiefComplaint + '.\n\n' +
      'Clinical Indication: Patient presents with ' + chiefComplaint +
      ' requiring specialist evaluation. Symptoms have been present for 3 days with gradual onset.\n\n' +
      'Relevant History: Patient has no known drug allergies. Current medications documented in chart. ' +
      'Insurance: ' + (insurance || 'on file') + '.\n\n' +
      'Please evaluate and advise on further management. I appreciate your expertise in this matter.\n\n' +
      'Respectfully,\n[Provider Name]\n[Clinic Name]',
    urgencyClassification: 'routine',
    urgencyReason:
      'Stable presentation without acute distress. Symptoms manageable with current treatment pending specialist evaluation.',
    icdCodes: ['Z00.00', 'R68.89'],
    recommendedSpecialty: 'Internal Medicine',
  };
}

/**
 * Generate structured clinical content from a transcript using Azure OpenAI.
 * Falls back to a realistic mock object when the required env vars are absent.
 *
 * @param {string} transcript   Transcribed text from the clinical encounter
 * @param {{patientName: string, chiefComplaint: string, patientDOB?: string, patientInsurance?: string}} patientInfo
 * @returns {Promise<{success: boolean, stub?: boolean, clinicalSummary?: string, referralNoteDraft?: string, urgencyClassification?: string, urgencyReason?: string, icdCodes?: string[], recommendedSpecialty?: string, error?: string}>}
 */
async function generateClinicalContent(transcript, patientInfo) {
  const endpoint       = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey         = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!endpoint || !apiKey || !deploymentName) {
    logger.info('[ambientIntelligenceService] Azure OpenAI env vars not set – returning mock clinical content.');
    return buildMockClinicalContent(patientInfo);
  }

  try {
    const { patientName, chiefComplaint, patientDOB, patientInsurance } = patientInfo;

    const systemPrompt =
      'You are a clinical documentation assistant. Given a medical encounter transcript and patient information, ' +
      'generate structured clinical content. Respond ONLY with a valid JSON object containing these fields: ' +
      'clinicalSummary (SOAP note format string), referralNoteDraft (formal referral letter string), ' +
      'urgencyClassification (one of: "routine", "urgent", "emergent"), ' +
      'urgencyReason (brief string explaining the classification), ' +
      'icdCodes (array of relevant ICD-10 code strings), ' +
      'recommendedSpecialty (string).';

    const userPrompt =
      'Patient Name: ' + patientName + '\n' +
      'Date of Birth: ' + (patientDOB || 'unknown') + '\n' +
      'Insurance: ' + (patientInsurance || 'unknown') + '\n' +
      'Chief Complaint: ' + chiefComplaint + '\n\n' +
      'Encounter Transcript:\n' + transcript;

    const url =
      endpoint.replace(/\/$/, '') +
      '/openai/deployments/' + deploymentName +
      '/chat/completions?api-version=2024-02-01';

    const response = await axios.post(
      url,
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      },
      {
        headers: {
          'api-key':      apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawContent = response.data.choices[0].message.content;

    // Strip optional markdown code fences before parsing
    const jsonString = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(jsonString);

    return {
      success:                true,
      clinicalSummary:        parsed.clinicalSummary        || '',
      referralNoteDraft:      parsed.referralNoteDraft      || '',
      urgencyClassification:  parsed.urgencyClassification  || 'routine',
      urgencyReason:          parsed.urgencyReason          || '',
      icdCodes:               Array.isArray(parsed.icdCodes) ? parsed.icdCodes : [],
      recommendedSpecialty:   parsed.recommendedSpecialty   || '',
    };
  } catch (err) {
    logger.error('[ambientIntelligenceService] generateClinicalContent error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Ambient Session Processing
// ---------------------------------------------------------------------------

/**
 * Process an ambient clinical session end-to-end.
 * Generates clinical content from the provided transcript and patient info.
 * Persistence (DB writes) is the caller's responsibility.
 *
 * @param {string} sessionId    Identifier for the ambient session
 * @param {string} transcript   Transcribed encounter text
 * @param {{patientName: string, chiefComplaint: string, patientDOB?: string, patientInsurance?: string}} patientInfo
 * @returns {Promise<{success: boolean, clinicalSummary?: string, referralNoteDraft?: string, urgencyClassification?: string, urgencyReason?: string, icdCodes?: string[], recommendedSpecialty?: string, error?: string}>}
 */
async function processAmbientSession(sessionId, transcript, patientInfo) {
  try {
    logger.info('[ambientIntelligenceService] Processing ambient session', { sessionId });

    const result = await generateClinicalContent(transcript, patientInfo);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success:               true,
      clinicalSummary:       result.clinicalSummary,
      referralNoteDraft:     result.referralNoteDraft,
      urgencyClassification: result.urgencyClassification,
      urgencyReason:         result.urgencyReason,
      icdCodes:              result.icdCodes,
      recommendedSpecialty:  result.recommendedSpecialty,
      ...(result.stub ? { stub: true } : {}),
    };
  } catch (err) {
    logger.error('[ambientIntelligenceService] processAmbientSession error', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  transcribeAudio,
  generateClinicalContent,
  processAmbientSession,
};
