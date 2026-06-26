import React from 'react';
import {
  Card, CardContent, CardActions, Typography, Box, Chip, Button, Divider,
} from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import VerifiedIcon from '@mui/icons-material/Verified';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DevicesIcon from '@mui/icons-material/Devices';

const CATEGORY_COLORS = {
  mental_health: '#9C27B0',
  metabolic: '#F44336',
  musculoskeletal: '#FF9800',
  cardiovascular: '#E91E63',
  behavioral: '#2196F3',
  respiratory: '#00BCD4',
  neurology: '#673AB7',
  general: '#607D8B',
};

const CATEGORY_LABELS = {
  mental_health: 'Mental Health',
  metabolic: 'Metabolic',
  musculoskeletal: 'Musculoskeletal',
  cardiovascular: 'Cardiovascular',
  behavioral: 'Behavioral',
  respiratory: 'Respiratory',
  neurology: 'Neurology',
  general: 'General',
};

const EVIDENCE_LABELS = {
  fda_cleared: 'FDA Cleared',
  fda_authorized: 'FDA Authorized',
  peer_reviewed: 'Peer Reviewed',
  evidence_based: 'Evidence Based',
  clinical_study: 'Clinical Study',
};

const EVIDENCE_COLORS = {
  fda_cleared: 'success',
  fda_authorized: 'success',
  peer_reviewed: 'primary',
  evidence_based: 'info',
  clinical_study: 'secondary',
};

const FORMAT_LABELS = {
  app: 'Mobile App',
  web: 'Web Platform',
  both: 'App + Web',
  coaching: 'Coaching',
  hybrid: 'Hybrid',
};

export default function DtxProgramCard({ program, onPrescribe }) {
  const catColor = CATEGORY_COLORS[program.category] || '#607D8B';
  const catLabel = CATEGORY_LABELS[program.category] || program.category;
  const evidenceLabel = EVIDENCE_LABELS[program.evidenceLevel] || program.evidenceLevel;
  const evidenceColor = EVIDENCE_COLORS[program.evidenceLevel] || 'default';

  return (
    <Card
      variant="outlined"
      sx={{
        borderTop: `4px solid ${catColor}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1} mr={1}>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
              {program.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">{program.vendor}</Typography>
          </Box>
          <Chip
            icon={<VerifiedIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={evidenceLabel}
            color={evidenceColor}
            size="small"
            sx={{ fontSize: '0.65rem', height: 20, flexShrink: 0 }}
          />
        </Box>

        {/* Category */}
        <Box mb={1}>
          <Chip
            label={catLabel}
            size="small"
            sx={{ backgroundColor: catColor, color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}
          />
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {program.description}
        </Typography>

        {/* Conditions */}
        {program.conditions?.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.5}>
            {program.conditions.slice(0, 3).map(c => (
              <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
            ))}
            {program.conditions.length > 3 && (
              <Chip label={`+${program.conditions.length - 3}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
            )}
          </Box>
        )}

        {/* Highlights */}
        {program.highlights?.length > 0 && (
          <Box mb={1}>
            {program.highlights.slice(0, 2).map(h => (
              <Typography key={h} variant="caption" display="block" color="text.secondary" sx={{ '&::before': { content: '"✓ "', color: 'success.main' } }}>
                {h}
              </Typography>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Meta row */}
        <Box display="flex" gap={2} flexWrap="wrap">
          {program.durationWeeks && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <AccessTimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{program.durationWeeks}w</Typography>
            </Box>
          )}
          <Box display="flex" alignItems="center" gap={0.5}>
            <DevicesIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{FORMAT_LABELS[program.deliveryFormat] || program.deliveryFormat}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <LocalPharmacyIcon sx={{ fontSize: 13, color: 'warning.main' }} />
            <Typography variant="caption" color="warning.main" fontWeight={600}>+{program.tokenReward || 10} tokens</Typography>
          </Box>
        </Box>

        {program.prescriptionCount > 0 && (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {program.prescriptionCount} prescriptions issued
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="small"
          startIcon={<LocalPharmacyIcon />}
          onClick={() => onPrescribe && onPrescribe(program)}
          sx={{ backgroundColor: catColor, '&:hover': { backgroundColor: catColor, filter: 'brightness(0.9)' } }}
        >
          Prescribe
        </Button>
      </CardActions>
    </Card>
  );
}
