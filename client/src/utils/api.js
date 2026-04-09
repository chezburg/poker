export async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("The server returned a response that couldn't be parsed as JSON.");
      }
    } else {
      // Handle non-JSON responses (like 500 error pages from a proxy)
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      // If it's a success but not JSON, we might want the text
      data = await res.text();
    }

    if (!res.ok) {
      throw new Error((data && data.error) || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (e) {
    // Re-throw errors so components can handle them
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      throw new Error("Unable to connect to the server. Please check your internet connection.");
    }
    throw e;
  }
}
