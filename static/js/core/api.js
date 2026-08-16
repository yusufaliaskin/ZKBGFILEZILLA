/**
 * ZK Remote Operations Center - Core API Client
 * Wraps Fetch API with CSRF token injection and standardized error formatting.
 */

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const API = {
  csrfToken: getCookie('csrftoken') || '',

  async request(url, options = {}) {
    const defaultHeaders = {
      'X-CSRFToken': this.csrfToken || getCookie('csrftoken'),
    };

    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle download response streams
      if (response.headers.get('Content-Disposition') && response.headers.get('Content-Disposition').includes('attachment')) {
        return response;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      const text = await response.text();
      let data = {};
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { message: text };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.detail || data.message || `İşlem başarısız (${response.status})`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${url}]:`, err);
      throw err;
    }
  },

  get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const finalUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(finalUrl, { method: 'GET' });
  },

  post(url, body = {}) {
    const isFormData = body instanceof FormData;
    return this.request(url, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put(url, body = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(url, body = {}) {
    return this.request(url, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  },
};

window.API = API;
