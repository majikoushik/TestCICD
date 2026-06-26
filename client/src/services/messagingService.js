import { get, post, patch } from '../utils/apiUtils';

// ── Mock data (REACT_APP_MOCK_API=true) ───────────────────────────────────────
const _now = Date.now();

const MOCK_MESSAGES = [
  {
    _id: 'msg-001', referralId: 'ref-001',
    senderId: 'user-2', senderName: 'Dr. John Smith', senderRole: 'doctor',
    receiverId: 'user-4', receiverName: 'Dr. Michael Chen',
    content: "Hi Dr. Chen, I'm referring Alice Johnson for an orthopedic consult. She's been experiencing knee pain for 3 months. Please review the attached imaging.",
    readAt: new Date(_now - 82800000).toISOString(), createdAt: new Date(_now - 86400000).toISOString(),
  },
  {
    _id: 'msg-002', referralId: 'ref-001',
    senderId: 'user-4', senderName: 'Dr. Michael Chen', senderRole: 'doctor',
    receiverId: 'user-2', receiverName: 'Dr. John Smith',
    content: "Thanks Dr. Smith, I've reviewed the X-rays. Consistent with moderate medial compartment OA. I'll schedule her for next Tuesday. Any contraindications to intra-articular injections?",
    readAt: new Date(_now - 79200000).toISOString(), createdAt: new Date(_now - 82800000).toISOString(),
  },
  {
    _id: 'msg-003', referralId: 'ref-001',
    senderId: 'user-2', senderName: 'Dr. John Smith', senderRole: 'doctor',
    receiverId: 'user-4', receiverName: 'Dr. Michael Chen',
    content: "No contraindications. She's on warfarin (INR 2.1 last week) — please coordinate with hematology before any injection. Her INR target is 2.0–3.0.",
    readAt: null, createdAt: new Date(_now - 3600000).toISOString(),
  },
  {
    _id: 'msg-004', referralId: 'ref-002',
    senderId: 'user-3', senderName: 'Dr. Sarah Johnson', senderRole: 'doctor',
    receiverId: 'user-5', receiverName: 'Dr. Emily Rodriguez',
    content: "Dr. Rodriguez, Bob Williams needs a behavioral health evaluation. He's presenting with increased anxiety post his neuro diagnosis. Do you have capacity this month?",
    readAt: new Date(_now - 43200000).toISOString(), createdAt: new Date(_now - 48000000).toISOString(),
  },
  {
    _id: 'msg-005', referralId: 'ref-002',
    senderId: 'user-5', senderName: 'Dr. Emily Rodriguez', senderRole: 'doctor',
    receiverId: 'user-3', receiverName: 'Dr. Sarah Johnson',
    content: "Yes, I can take him. I have an opening Thursday at 2 PM. I'll also initiate the DTx AnxietyFree program as adjunct therapy. Please send over his full psych history if available.",
    readAt: null, createdAt: new Date(_now - 7200000).toISOString(),
  },
  {
    _id: 'msg-006', referralId: 'ref-004',
    senderId: 'user-5', senderName: 'Dr. Emily Rodriguez', senderRole: 'doctor',
    receiverId: 'user-2', receiverName: 'Dr. John Smith',
    content: "Dr. Smith, quick note on David Brown's cardiology referral — patient mentioned he had a reaction to beta-blockers in 2019. I don't see this documented in the referral form. Can you confirm?",
    readAt: null, createdAt: new Date(_now - 1800000).toISOString(),
  },
];

const MOCK_REFERRAL_META = {
  'ref-001': { _id: 'ref-001', reason: 'Knee pain — orthopedic consult', status: 'accepted', patientName: 'Alice Johnson' },
  'ref-002': { _id: 'ref-002', reason: 'Anxiety / behavioral health eval', status: 'accepted', patientName: 'Bob Williams' },
  'ref-004': { _id: 'ref-004', reason: 'Cardiology referral — possible arrhythmia', status: 'accepted', patientName: 'David Brown' },
};

const _buildMockThreads = (currentUserId) => {
  const byReferral = {};
  MOCK_MESSAGES.forEach((m) => {
    if (!byReferral[m.referralId]) byReferral[m.referralId] = [];
    byReferral[m.referralId].push(m);
  });
  return Object.entries(byReferral).map(([referralId, msgs]) => {
    const sorted = [...msgs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const last = sorted[0];
    const unreadCount = msgs.filter((m) => m.receiverId === currentUserId && !m.readAt).length;
    const referral = MOCK_REFERRAL_META[referralId] || { _id: referralId, reason: 'Referral', status: 'accepted' };
    return { _id: referralId, lastMessage: last, totalMessages: msgs.length, unreadCount, referral };
  }).sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
};

// In-memory store for messages added during the mock session
let _mockStore = [...MOCK_MESSAGES];

// ── Public API ────────────────────────────────────────────────────────────────

const getThreads = async (currentUserId) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true, data: _buildMockThreads(currentUserId) };
    }
    const res = await get('/messages/threads');
    return res.data;
  } catch (err) {
    console.error('getThreads:', err);
    return { success: false, error: err.message };
  }
};

const getThread = async (referralId) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const messages = _mockStore
        .filter((m) => m.referralId === referralId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const referral = MOCK_REFERRAL_META[referralId] || {
        _id: referralId, reason: 'Referral consultation', status: 'accepted',
      };
      return { success: true, data: { referral, messages } };
    }
    const res = await get(`/messages/threads/${referralId}`);
    return res.data;
  } catch (err) {
    console.error('getThread:', err);
    return { success: false, error: err.message };
  }
};

const sendMessage = async (referralId, content, receiverId, receiverName) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const newMsg = {
        _id: `msg-${Date.now()}`,
        referralId,
        senderId: 'current-user',
        senderName: 'You',
        senderRole: 'doctor',
        receiverId: receiverId || 'user-2',
        receiverName: receiverName || 'Provider',
        content: content.trim(),
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      _mockStore.push(newMsg);
      return { success: true, data: newMsg };
    }
    const res = await post(`/messages/threads/${referralId}`, { content, receiverId, receiverName });
    return res.data;
  } catch (err) {
    console.error('sendMessage:', err);
    return { success: false, error: err.message };
  }
};

const markThreadRead = async (referralId) => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      return { success: true };
    }
    const res = await patch(`/messages/read/${referralId}`, {});
    return res.data;
  } catch (err) {
    console.error('markThreadRead:', err);
    return { success: false, error: err.message };
  }
};

const getAdminThreads = async () => {
  try {
    if (process.env.REACT_APP_MOCK_API === 'true') {
      const threads = _buildMockThreads(null).map((t) => {
        const msgs = _mockStore.filter((m) => m.referralId === t._id);
        const participants = [...new Set(msgs.map((m) => m.senderName))];
        return { ...t, participants };
      });
      return { success: true, data: threads };
    }
    const res = await get('/messages/admin/threads');
    return res.data;
  } catch (err) {
    console.error('getAdminThreads:', err);
    return { success: false, error: err.message };
  }
};

const messagingService = {
  getThreads,
  getThread,
  sendMessage,
  markThreadRead,
  getAdminThreads,
};

export default messagingService;
