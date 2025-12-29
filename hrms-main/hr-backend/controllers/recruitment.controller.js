// Basic recruitment controller with placeholder handlers
exports.getAll = (req, res) => {
	res.json({ success: true, data: [], message: 'recruitment list (placeholder)' });
};

exports.create = (req, res) => {
	const payload = req.body || {};
	res.status(201).json({ success: true, data: payload, message: 'created (placeholder)' });
};
