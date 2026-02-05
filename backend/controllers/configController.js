import Config from '../models/Config.js';

// @desc    Get feedback session status
// @route   GET /api/config/feedback-status
// @access  Public
export const getFeedbackStatus = async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'activeFeedbackSession' });

        // Default to false if not set
        if (!config) {
            config = await Config.create({ key: 'activeFeedbackSession', value: false });
        }

        res.status(200).json({
            success: true,
            isActive: config.value,
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
        const { isActive } = req.body; // Expect boolean

        let config = await Config.findOne({ key: 'activeFeedbackSession' });

        if (!config) {
            config = await Config.create({ key: 'activeFeedbackSession', value: isActive });
        } else {
            config.value = isActive;
            await config.save();
        }

        res.status(200).json({
            success: true,
            message: `Feedback session ${isActive ? 'activated' : 'deactivated'}`,
            isActive: config.value,
        });
    } catch (error) {
        console.error('Toggle feedback session error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
