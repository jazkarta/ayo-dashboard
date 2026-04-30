export function extractFieldErrors(err) {
  const apiErrors = err?.response?.data;
  const fieldErrors = {};
  if (apiErrors && typeof apiErrors === "object") {
    for (const [key, value] of Object.entries(apiErrors)) {
      const message = Array.isArray(value) ? value[0] : value;
      if (typeof message === "string") fieldErrors[key] = message;
    }
  }
  return fieldErrors;
}
