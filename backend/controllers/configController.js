import Config from '../models/Config.js';

// @desc    Get feedback session status
// @route   GET /api/config/feedback-status
// @access  Public
export const getFeedbackStatus = async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'activeFeedbackSession' });

        // Default to false if not set
        if (!config) {
            config = await Config.create({
                key: 'activeFeedbackSession',
                value: { isActive: false, activeRound: '1' }
            });
        }

        // Handle migration from boolean simple value to object
        let status = config.value;
        if (typeof status === 'boolean') {
            status = { isActive: status, activeRound: '1' };
            // Update it
            config.value = status;
            await config.save();
        }

        res.status(200).json({
            success: true,
            isActive: status.isActive,
            activeRound: status.activeRound || '1'
        });
    } catch (error) {
        console.error('Get feedback status error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Toggle feedback session
// @route   POST /api/config/toggle-feedback
// @access  Private (Admin)
export const toggleFeedbackSession = async (req, res) => {
    try {
        const { isActive, activeRound } = req.body;

        let config = await Config.findOne({ key: 'activeFeedbackSession' });

        const newValue = {
            isActive: isActive !== undefined ? isActive : false,
            activeRound: activeRound || '1'
        };

        if (!config) {
            config = await Config.create({ key: 'activeFeedbackSession', value: newValue });
        } else {
            config.value = newValue;
            await config.save();
        }

        res.status(200).json({
            success: true,
            message: `Feedback session updated: ${newValue.isActive ? 'Active' : 'Inactive'} (Round ${newValue.activeRound})`,
            isActive: newValue.isActive,
            activeRound: newValue.activeRound
        });
    } catch (error) {
        console.error('Toggle feedback session error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
