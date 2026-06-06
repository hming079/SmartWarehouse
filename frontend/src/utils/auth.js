export const hasValidToken = () => {
  const token = localStorage.getItem("auth_token");
  return Boolean(token && token !== "null" && token !== "undefined");
};