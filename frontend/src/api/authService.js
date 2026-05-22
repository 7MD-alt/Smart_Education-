import axiosClient from "./axiosClient";

/** POST /api/token/ → { access, refresh } */
export const login = (username, password) =>
  axiosClient.post("token/", { username, password });

/** POST /api/token/refresh/ → { access } */
export const refreshToken = (refresh) =>
  axiosClient.post("token/refresh/", { refresh });

/** GET /api/me/ → user object */
export const getMe = () => axiosClient.get("me/");

/** GET /api/me/profile/ → role-specific profile */
export const getMyProfile = () => axiosClient.get("me/profile/");
