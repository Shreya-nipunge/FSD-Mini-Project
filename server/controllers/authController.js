import { loginUser, publicUser, registerUser } from "../services/authService.js";

export async function register(req, res) {
  const response = await registerUser({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });
  res.status(201).json(response);
}

export async function login(req, res) {
  const response = await loginUser({
    email: req.body.email,
    password: req.body.password,
    expectedRole: req.authRole,
  });
  res.status(200).json(response);
}

export function me(req, res) {
  res.status(200).json({ success: true, data: { user: publicUser(req.currentUser) }, user: publicUser(req.currentUser) });
}

export function rejectAdminRegistration(_req, res) {
  res.status(403).json({
    success: false,
    error: { message: "Administrator accounts cannot be self-registered" },
    detail: "Administrator accounts cannot be self-registered",
  });
}
