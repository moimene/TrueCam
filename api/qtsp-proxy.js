export default async function handler(request, response) {
    const { VITE_QTSP_BASE_URL } = process.env;

    // CORS headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // Get path from query string. Example: /api/qtsp-proxy?path=v1/private/case-files
    const { path } = request.query;

    if (!path) {
        return response.status(400).json({ error: 'Missing path parameter' });
    }

    // Forward Authorization header
    const authHeader = request.headers.authorization;

    try {
        // Construct target URL. Ensure we handle leading slashes correctly.
        const cleanPath = Array.isArray(path) ? path.join('/') : path;
        const targetUrl = `${VITE_QTSP_BASE_URL}/${cleanPath.replace(/^\//, '')}`;

        // console.log(`Proxying to: ${targetUrl}`); // Debug only

        const options = {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { 'Authorization': authHeader } : {})
            }
        };

        if (request.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
            options.body = JSON.stringify(request.body);
        }

        const res = await fetch(targetUrl, options);

        // If response is not OK, forward the error
        if (!res.ok) {
            const text = await res.text();
            console.error(`QTSP Error (${res.status}): ${text}`);
            return response.status(res.status).json({ error: 'QTSP API Error', details: text, endpoint: cleanPath });
        }

        // Attempt to parse JSON
        try {
            const data = await res.json();
            return response.status(200).json(data);
        } catch (e) {
            // If response is not JSON (e.g. 204 No Content), return empty success
            return response.status(200).send('');
        }

    } catch (error) {
        console.error("Proxy Error:", error);
        return response.status(500).json({ error: 'Proxy Internal Error', details: error.message });
    }
}
