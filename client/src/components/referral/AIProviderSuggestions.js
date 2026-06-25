import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Chip,
  Alert,
  Divider,
  LinearProgress
} from '@mui/material'
import AIIcon from '@mui/icons-material/Psychology'
import MatchedIcon from '@mui/icons-material/CheckCircle'
import TimeIcon from '@mui/icons-material/AccessTime'
import HospitalIcon from '@mui/icons-material/LocalHospital'
import RateIcon from '@mui/icons-material/TrendingUp'
import { findMatches } from '../../services/referralMatchingService'

/**
 * AIProviderSuggestions
 *
 * @param {object} props
 * @param {string} props.specialty - The specialty being searched
 * @param {string} props.patientInsurance - Patient's insurance plan
 * @param {string} props.patientCity - Patient's city
 * @param {string} props.patientState - Patient's state
 * @param {string} props.urgency - One of 'routine' | 'urgent' | 'emergency'
 * @param {function} props.onSelectProvider - Called with provider object when a suggestion is clicked
 * @param {string} props.selectedProviderId - The _id of the currently selected provider
 */
export default function AIProviderSuggestions({
  specialty,
  patientInsurance,
  patientCity,
  patientState,
  urgency,
  onSelectProvider,
  selectedProviderId
}) {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [, setSessionId] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const runSearch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await findMatches({
        specialty,
        patientInsurance,
        patientCity,
        patientState,
        urgency,
        limit: 5
      })
      const payload = result?.data || result || {}
      setMatches(payload.matches || [])
      setSessionId(payload.sessionId || null)
      setHasSearched(true)
    } catch (err) {
      setError(err.message || 'Failed to fetch AI suggestions')
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [specialty, patientInsurance, patientCity, patientState, urgency])

  useEffect(() => {
    if (!specialty || specialty.trim().length < 3) return
    const timer = setTimeout(() => {
      runSearch()
    }, 800)
    return () => clearTimeout(timer)
  }, [specialty, runSearch])

  const getScoreColor = (score) => {
    if (score >= 80) return 'success'
    if (score >= 60) return 'warning'
    return 'error'
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        bgcolor: 'background.paper'
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AIIcon sx={{ color: 'purple', fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
          AI Match Suggestions
        </Typography>
        {hasSearched && (
          <Chip
            label={`${matches.length} found`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
      </Box>

      {/* Loading bar */}
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Error */}
      {error && (
        <Alert severity="warning" sx={{ py: 0, mb: 1, fontSize: '0.75rem' }}>
          {error}
        </Alert>
      )}

      {/* Placeholder */}
      {!hasSearched && !loading && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', py: 1 }}>
          Enter a specialty above to see AI-matched specialists
        </Typography>
      )}

      {/* No results */}
      {hasSearched && !loading && matches.length === 0 && !error && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', py: 1 }}>
          No matches found for this specialty
        </Typography>
      )}

      {/* Match cards */}
      {matches.slice(0, 5).map((match) => {
        const isSelected = match._id === selectedProviderId
        const scoreBreakdown = match.scoreBreakdown || {}

        return (
          <Card
            key={match._id}
            variant="outlined"
            sx={{
              mb: 1,
              border: isSelected ? '2px solid' : '1px solid',
              borderColor: isSelected ? 'primary.main' : 'divider',
              borderRadius: 1.5
            }}
          >
            <CardActionArea onClick={() => onSelectProvider(match)}>
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                {/* Card header: name + specialty chip */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ flexGrow: 1, fontSize: '0.8rem' }}>
                    {match.name || match.providerName}
                  </Typography>
                  {match.specialty && (
                    <Chip
                      label={match.specialty}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                  {isSelected && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <MatchedIcon sx={{ fontSize: 14, color: 'success.main' }} />
                      <Typography variant="caption" color="success.main" sx={{ fontSize: '0.65rem' }}>
                        Selected
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Score bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={match.matchScore || 0}
                    color={getScoreColor(match.matchScore || 0)}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                    Score: {match.matchScore || 0}/100
                  </Typography>
                </Box>

                {/* Score breakdown chips */}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                  {scoreBreakdown.specialty !== undefined && (
                    <Chip
                      label={`Specialty: ${scoreBreakdown.specialty}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  )}
                  {scoreBreakdown.insurance !== undefined && (
                    <Chip
                      label={`Insurance: ${scoreBreakdown.insurance}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  )}
                  {scoreBreakdown.acceptanceRate !== undefined && (
                    <Chip
                      label={`Rate: ${scoreBreakdown.acceptanceRate}pts`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {/* Footer info row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {(match.organizationName || match.org) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <HospitalIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {match.organizationName || match.org}
                      </Typography>
                    </Box>
                  )}
                  {match.avgResponseDays !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <TimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {match.avgResponseDays}d response
                      </Typography>
                    </Box>
                  )}
                  {match.acceptanceRate !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <RateIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                        {match.acceptanceRate}% acceptance
                      </Typography>
                    </Box>
                  )}
                  {match.networkParticipation && (
                    <Chip
                      label="In-Network"
                      size="small"
                      sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'success.light', color: 'success.dark' }}
                    />
                  )}
                  {match.telehealth && (
                    <Chip
                      label="Telehealth"
                      size="small"
                      sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'info.light', color: 'info.dark' }}
                    />
                  )}
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        )
      })}

      {/* Refresh button */}
      {hasSearched && (
        <Box sx={{ mt: 0.5, textAlign: 'right' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={runSearch}
            disabled={loading}
            sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}
          >
            Refresh Suggestions
          </Button>
        </Box>
      )}
    </Box>
  )
}
