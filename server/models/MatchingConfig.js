'use strict';

const mongoose = require('mongoose');

const DEFAULT_SYNONYM_GROUPS = [
  { name: 'Cardiology',       terms: ['Cardiology', 'Cardiovascular', 'Cardiac Surgery', 'Interventional Cardiology', 'Electrophysiology'] },
  { name: 'Orthopedics',      terms: ['Orthopedics', 'Orthopedic Surgery', 'Sports Medicine', 'Joint Replacement', 'Spine Surgery'] },
  { name: 'Neurology',        terms: ['Neurology', 'Neurosurgery', 'Neurological Surgery', 'Epilepsy', 'Movement Disorders'] },
  { name: 'Gastroenterology', terms: ['Gastroenterology', 'GI', 'Hepatology', 'Endoscopy', 'Colorectal Surgery'] },
  { name: 'Oncology',         terms: ['Oncology', 'Hematology', 'Medical Oncology', 'Radiation Oncology', 'Surgical Oncology'] },
  { name: 'Pulmonology',      terms: ['Pulmonology', 'Pulmonary Medicine', 'Critical Care', 'Sleep Medicine', 'Thoracic Surgery'] },
  { name: 'Rheumatology',     terms: ['Rheumatology', 'Immunology', 'Autoimmune'] },
  { name: 'Endocrinology',    terms: ['Endocrinology', 'Diabetes Management', 'Metabolism', 'Thyroid'] },
  { name: 'Ophthalmology',    terms: ['Ophthalmology', 'Eye Care', 'Retina', 'Glaucoma', 'Cornea'] },
  { name: 'Dermatology',      terms: ['Dermatology', 'Skin', 'Mohs Surgery'] },
  { name: 'Nephrology',       terms: ['Nephrology', 'Renal', 'Kidney', 'Dialysis'] },
  { name: 'Urology',          terms: ['Urology', 'Urological Surgery'] },
  { name: 'Psychiatry',       terms: ['Psychiatry', 'Mental Health', 'Psychology'] },
  { name: 'ENT',              terms: ['ENT', 'Otolaryngology', 'Head and Neck Surgery'] },
  { name: 'Allergy',          terms: ['Allergy', 'Allergy & Immunology', 'Immunology'] },
];

const synonymGroupSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true }, terms: [{ type: String, trim: true }] },
  { _id: false }
);

const scoreWeightsSchema = new mongoose.Schema(
  {
    specialty:      { type: Number, default: 30, min: 0, max: 50 },
    insurance:      { type: Number, default: 25, min: 0, max: 50 },
    acceptanceRate: { type: Number, default: 20, min: 0, max: 50 },
    availability:   { type: Number, default: 15, min: 0, max: 50 },
    tokenStanding:  { type: Number, default: 10, min: 0, max: 30 },
  },
  { _id: false }
);

const matchingConfigSchema = new mongoose.Schema(
  {
    // When true: skip specialty hard-filter, search all providers by text instead
    bypassSpecialtyFilter: { type: Boolean, default: false },
    // Partial/prefix matching — "Derma" matches "Dermatology"
    partialMatchEnabled:   { type: Boolean, default: true },
    partialMatchScore:     { type: Number,  default: 12, min: 0, max: 30 },
    // Global minimum score threshold (0 = return everything that passes specialty filter)
    minScoreThreshold:     { type: Number,  default: 0, min: 0, max: 80 },
    // Per-dimension score caps (sum = 100 max)
    scoreWeights:  { type: scoreWeightsSchema, default: () => ({}) },
    // Editable specialty synonym groups
    synonymGroups: { type: [synonymGroupSchema], default: () => DEFAULT_SYNONYM_GROUPS },
    updatedBy: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Only ever one document in the collection.
matchingConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({});
  if (!doc) doc = await this.create({});
  return doc;
};

const MatchingConfig = mongoose.model('MatchingConfig', matchingConfigSchema);
MatchingConfig.DEFAULT_SYNONYM_GROUPS = DEFAULT_SYNONYM_GROUPS;

module.exports = MatchingConfig;
