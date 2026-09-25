const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, ...result });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, ...result });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user._id);
  res.json({ success: true, user });
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user._id);
  res.json({ success: true, ...result });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset({ ...req.body, req });
  res.json({ success: true, ...result });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ success: true, ...result });
});

module.exports = { register, login, me, logout, forgotPassword, resetPassword };