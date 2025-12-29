const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
// allow larger JSON payloads (resumes are sent as base64 inside JSON)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// simple request logger for debugging
app.use((req, res, next) => {
	console.log(new Date().toISOString(), req.method, req.originalUrl);
	next();
});
app.use("/api/recruitment", require("./routes/recruitment.routes"));
app.use("/api/jd", require("./routes/jd.routes"));
app.use("/api/tickets", require("./routes/tickets.routes"));
app.use("/api/candidates", require("./routes/candidates.routes"));
app.use("/api/employees", require("./routes/employees.routes"));
app.use("/api/departments", require("./routes/departments.routes"));
app.use("/api/roles", require("./routes/roles.routes"));
app.use("/api/performance", require("./routes/performance.routes"));
app.use("/api/exits", require("./routes/exits.routes"));

// catch-all 404 JSON response for unknown API endpoints
app.use((req, res) => {
	res.status(404).json({ success: false, message: 'Not Found', path: req.originalUrl, method: req.method });
});
module.exports = app;
