const express = require('express');
const router = express.Router();
const EscalationWorkflow = require('../../models/EscalationWorkflow');

// Statistics — must be defined before /:id to avoid route conflict
router.get('/statistics', async (req, res) => {
  try {
    const [totalWorkflows, statusCounts, priorityCounts, categoryCounts] = await Promise.all([
      EscalationWorkflow.countDocuments(),
      EscalationWorkflow.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EscalationWorkflow.countDocuments({ priority: { $in: ['high', 'critical'] } }),
      EscalationWorkflow.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    const unassigned = await EscalationWorkflow.countDocuments({ assignedTo: null });

    const statusDistribution = { pendingReview: 0, inProgress: 0, resolved: 0, dismissed: 0 };
    statusCounts.forEach(({ _id, count }) => {
      if (_id === 'pending_review') statusDistribution.pendingReview = count;
      else if (_id === 'in_progress') statusDistribution.inProgress = count;
      else if (_id === 'resolved') statusDistribution.resolved = count;
      else if (_id === 'dismissed') statusDistribution.dismissed = count;
    });

    const resolvedDocs = await EscalationWorkflow.find({ status: 'resolved', 'resolution.timestamp': { $exists: true } }, 'flaggedAt resolution.timestamp');
    let avgResolutionHours = null;
    if (resolvedDocs.length > 0) {
      const totalHours = resolvedDocs.reduce((sum, doc) => {
        const ms = new Date(doc.resolution.timestamp) - new Date(doc.flaggedAt);
        return sum + ms / 3600000;
      }, 0);
      avgResolutionHours = (totalHours / resolvedDocs.length).toFixed(1);
    }

    res.json({
      success: true,
      data: {
        totalWorkflows,
        statusDistribution,
        highPriority: priorityCounts,
        unassigned,
        categoryDistribution: categoryCounts.map(({ _id, count }) => ({ name: _id, value: count })),
        averageResolutionTime: avgResolutionHours ? `${avgResolutionHours} hours` : 'N/A',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const workflows = await EscalationWorkflow.find(filter).sort({ flaggedAt: -1 });
    res.json({ success: true, data: workflows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const workflow = await EscalationWorkflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });
    res.json({ success: true, data: workflow });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const workflow = await EscalationWorkflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });

    const oldStatus = workflow.status;
    const { status, assignedTo, resolution, details } = req.body;

    if (status && status !== oldStatus) {
      workflow.timeline.push({ action: `Status changed to ${status}`, timestamp: new Date(), user: req.user?.name || 'Admin' });
      workflow.status = status;
    }
    if (assignedTo !== undefined) workflow.assignedTo = assignedTo;
    if (resolution !== undefined) workflow.resolution = resolution;
    if (details !== undefined) workflow.details = details;

    await workflow.save();
    res.json({ success: true, data: workflow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/assign', async (req, res) => {
  try {
    const workflow = await EscalationWorkflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });

    const assignmentData = req.body;
    workflow.assignedTo = assignmentData;
    workflow.timeline.push({
      action: `Assigned to ${assignmentData.name}`,
      timestamp: new Date(),
      user: req.user?.name || 'Admin',
    });

    if (workflow.status === 'pending_review') {
      workflow.status = 'in_progress';
      workflow.timeline.push({ action: 'Status changed to in_progress', timestamp: new Date(), user: 'System' });
    }

    await workflow.save();
    res.json({ success: true, data: workflow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/resolve', async (req, res) => {
  try {
    const workflow = await EscalationWorkflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Escalation workflow not found' });

    const { action, notes, resolvedBy } = req.body;
    workflow.status = 'resolved';
    workflow.resolution = {
      action: action || 'Resolved by admin',
      notes: notes || '',
      timestamp: new Date(),
      resolvedBy: resolvedBy || { name: req.user?.name || 'Admin' },
    };
    workflow.timeline.push({
      action: 'Case resolved',
      timestamp: new Date(),
      user: resolvedBy?.name || req.user?.name || 'Admin',
    });

    await workflow.save();
    res.json({ success: true, data: workflow });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
