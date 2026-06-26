const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const ProviderProfile = require('../models/ProviderProfile');

// GET /api/npi/lookup/:npi — public
router.get('/lookup/:npi', async (req, res) => {
  try {
    const { npi } = req.params;
    if (!/^\d{10}$/.test(npi)) {
      return res.status(400).json({ success: false, error: 'NPI must be a 10-digit number' });
    }

    // Check if NPI already registered in our system
    const existing = await ProviderProfile.findOne({ npi });
    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        npiStatus: existing.kycStatus,
        message: getNpiStatusMessage(existing.kycStatus),
      });
    }

    // Fetch from NPPES public API
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npi}`;
    const response = await fetch(url, { timeout: 8000 });
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ success: false, error: 'NPI not found in the NPPES registry' });
    }

    const result = data.results[0];
    const basic = result.basic || {};
    const addresses = result.addresses || [];
    const taxonomies = result.taxonomies || [];

    // Pick practice location address first
    const addr = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0] || {};
    const taxonomy = taxonomies.find(t => t.primary) || taxonomies[0] || {};

    const isOrg = result.enumeration_type === 'NPI-2';

    const profile = {
      npi: result.number,
      enumerationType: result.enumeration_type,
      firstName: basic.first_name || '',
      lastName: basic.last_name || '',
      name: isOrg
        ? (basic.organization_name || '')
        : `${basic.first_name || ''} ${basic.last_name || ''}`.trim(),
      credential: basic.credential || '',
      gender: basic.gender || '',
      organizationName: basic.organization_name || '',
      specialty: taxonomy.desc || '',
      taxonomyCode: taxonomy.code || '',
      licenseNumber: taxonomy.license || '',
      licenseState: taxonomy.state || '',
      address: {
        line1: addr.address_1 || '',
        line2: addr.address_2 || '',
        city: addr.city || '',
        state: addr.state || '',
        zip: (addr.postal_code || '').substring(0, 5),
        phone: addr.telephone_number || '',
        fax: addr.fax_number || '',
      },
    };

    res.json({ success: true, alreadyRegistered: false, data: profile });
  } catch (err) {
    console.error('NPI lookup error:', err.message);
    if (err.type === 'request-timeout') {
      return res.status(504).json({ success: false, error: 'NPPES registry timed out. Please try again.' });
    }
    res.status(500).json({ success: false, error: 'Failed to lookup NPI' });
  }
});

function getNpiStatusMessage(status) {
  const map = {
    pending_email: 'This NPI is already registered. Please check your email to verify.',
    pending_docs: 'This NPI is already registered. Please sign in to complete onboarding.',
    under_review: 'This NPI is already registered and under review.',
    verified: 'This NPI is already registered and verified. Please sign in.',
    rejected: 'This NPI registration was rejected. Please contact support.',
  };
  return map[status] || 'This NPI is already registered.';
}

module.exports = router;
