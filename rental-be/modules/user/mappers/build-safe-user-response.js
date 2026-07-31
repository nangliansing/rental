export const buildSafeUserResponse = (user) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  profilePhoto: user.profilePhoto ?? null,
  authProvider: user.authProvider,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
