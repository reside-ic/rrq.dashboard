const API_URL = import.meta.env.VITE_DASHBOARD_API_URL ?? import.meta.env.BASE_URL + "api";
export default async function fetcher(url) {
  const res = await fetch(API_URL + url);
  const envelope = await res.json();
  if (envelope.status === "failure") {
    const error = new Error(envelope.errors[0].detail);
    error.status = res.status;
    throw error;
  }
  if (!res.ok) {
    throw new Error("Unknown error occurred");
  }

  return envelope.data
}
