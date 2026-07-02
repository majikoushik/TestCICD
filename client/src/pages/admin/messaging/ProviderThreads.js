import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, IconButton,
  Collapse, List, ListItem, Avatar, Divider,
  TextField, InputAdornment, Alert, Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Search as SearchIcon,
  Lock as LockIcon,
  Forum as ForumIcon,
  CheckCircle as ReadIcon,
  RadioButtonUnchecked as UnreadIcon,
} from '@mui/icons-material';
import messagingService from '../../../services/messagingService';
import { formatRelativeTime } from '../../../utils/dateFormatter';
import EllipsisCell from '../../../components/common/EllipsisCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../../components/common/adminTableStyles';

// Percentages sum to 100% (excluding the fixed-width expand-toggle column).
const COLUMN_WIDTHS = {
  toggle: '48px', patient: '28%', participants: '27%',
  messages: '10%', lastActivity: '17%', status: '18%',
};

const AVATAR_COLORS = ['#1976d2', '#388e3c', '#7b1fa2', '#f57c00', '#0288d1'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

function ThreadRow({ thread }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const toggle = async () => {
    if (!open && messages.length === 0) {
      setLoadingMsgs(true);
      const res = await messagingService.getThread(thread._id);
      if (res?.success) setMessages(res.data?.messages || []);
      setLoadingMsgs(false);
    }
    setOpen((p) => !p);
  };

  const { lastMessage: lm, totalMessages, participants = [] } = thread;
  const referral = thread.referral || {};

  return (
    <>
      <TableRow hover sx={{ ...tableBodyRowSx, cursor: 'pointer' }} onClick={toggle}>
        <TableCell sx={{ width: COLUMN_WIDTHS.toggle }}>
          <IconButton size="small">{open ? <CollapseIcon /> : <ExpandIcon />}</IconButton>
        </TableCell>
        <TableCell sx={{ width: COLUMN_WIDTHS.patient }}>
          <Typography variant="body2" fontWeight={500} noWrap>{referral.patientName || referral.patient?.name || '—'}</Typography>
          <EllipsisCell value={referral.reason || 'Referral'} variant="caption" sx={{ color: 'text.secondary' }} />
        </TableCell>
        <TableCell sx={{ width: COLUMN_WIDTHS.participants, whiteSpace: 'normal' }}>
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {participants.map((p) => (
              <Chip key={p} label={p} size="small" avatar={<Avatar sx={{ bgcolor: avatarColor(p) }}>{initials(p)}</Avatar>} sx={compactChipSx} />
            ))}
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ width: COLUMN_WIDTHS.messages }}>
          <Chip label={totalMessages} size="small" color="primary" variant="outlined" sx={compactChipSx} />
        </TableCell>
        <TableCell sx={{ width: COLUMN_WIDTHS.lastActivity }}>
          <Typography variant="caption" color="text.secondary">{formatRelativeTime(lm?.createdAt)}</Typography>
        </TableCell>
        <TableCell sx={{ width: COLUMN_WIDTHS.status }}>
          <Chip
            label={referral.status || 'active'}
            size="small"
            color={referral.status === 'completed' ? 'success' : referral.status === 'rejected' ? 'error' : 'info'}
            sx={compactChipSx}
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ pb: 0, pt: 0, px: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: 'grey.50', px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
              {loadingMsgs ? (
                <Typography variant="caption" color="text.secondary">Loading messages…</Typography>
              ) : messages.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No messages in this thread.</Typography>
              ) : (
                <List dense disablePadding>
                  {messages.map((msg, i) => (
                    <React.Fragment key={msg._id}>
                      <ListItem sx={{ px: 0, alignItems: 'flex-start', gap: 1 }}>
                        <Avatar sx={{ bgcolor: avatarColor(msg.senderName), width: 28, height: 28, fontSize: 11, mt: 0.3, flexShrink: 0 }}>
                          {initials(msg.senderName)}
                        </Avatar>
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="caption" fontWeight={600}>{msg.senderName}</Typography>
                            <Typography variant="caption" color="text.disabled">{formatRelativeTime(msg.createdAt)}</Typography>
                            {msg.readAt
                              ? <ReadIcon sx={{ fontSize: 12, color: 'success.main' }} />
                              : <UnreadIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                            }
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.2, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                        </Box>
                      </ListItem>
                      {i < messages.length - 1 && <Divider sx={{ my: 0.5 }} />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

const ProviderThreads = () => {
  const [threads, setThreads]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await messagingService.getAdminThreads();
    if (res?.success) { setThreads(res.data || []); setError(null); }
    else setError(res?.error || 'Failed to load threads');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.referral?.patientName || '').toLowerCase().includes(q) ||
      (t.referral?.reason || '').toLowerCase().includes(q) ||
      (t.participants || []).some((p) => p.toLowerCase().includes(q))
    );
  });

  const totalMessages = threads.reduce((s, t) => s + (t.totalMessages || 0), 0);

  return (
    <Box p={3}>
      {/* Summary strip */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Active Threads', value: threads.length, color: 'primary.main' },
          { label: 'Total Messages', value: totalMessages, color: 'success.main' },
          { label: 'Providers Messaging', value: [...new Set(threads.flatMap((t) => t.participants || []))].length, color: 'secondary.main' },
        ].map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              <Typography variant="h4" fontWeight={700} color={s.color}>{s.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* HIPAA notice */}
      <Alert
        icon={<LockIcon />}
        severity="info"
        sx={{ mb: 2 }}
      >
        <strong>Compliance View.</strong> All provider-to-provider messages are stored with full audit trail. Read-only monitoring — admins cannot send messages on behalf of providers.
      </Alert>

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search by patient, provider, or referral reason…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />

      {/* Thread table */}
      {loading ? (
        <Typography color="text.secondary">Loading threads…</Typography>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={6}>
          <ForumIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No provider threads found.</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
          <Table size="small" sx={tableSx}>
            <TableHead>
              <TableRow sx={tableHeadRowSx}>
                <TableCell sx={{ width: COLUMN_WIDTHS.toggle }} />
                <TableCell sx={{ width: COLUMN_WIDTHS.patient }}>Patient / Referral</TableCell>
                <TableCell sx={{ width: COLUMN_WIDTHS.participants }}>Participants</TableCell>
                <TableCell align="center" sx={{ width: COLUMN_WIDTHS.messages }}>Messages</TableCell>
                <TableCell sx={{ width: COLUMN_WIDTHS.lastActivity }}>Last Activity</TableCell>
                <TableCell sx={{ width: COLUMN_WIDTHS.status }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((t) => <ThreadRow key={t._id} thread={t} />)}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ProviderThreads;
