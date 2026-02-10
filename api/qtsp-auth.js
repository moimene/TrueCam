export default async function handler(request, response) {
    // Use VITE_ prefix variables as they are already set in Vercel
    const { VITE_QTSP_CLIENT_ID, VITE_QTSP_CLIENT_SECRET, VITE_QTSP_LOGIN_URL, VITE_QTSP_SCOPE } = process.env;

    // Allow CORS from our own domain (and localhost for testing if needed)
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    if (!VITE_QTSP_CLIENT_ID || !VITE_QTSP_CLIENT_SECRET) {
        return response.status(500).json({ error: 'Missing QTSP Credentials in Environment' });
    }

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', VITE_QTSP_CLIENT_ID);
        params.append('client_secret', VITE_QTSP_CLIENT_SECRET);
        params.append('scope', VITE_QTSP_SCOPE || 'token');

        const res = await fetch(VITE_QTSP_LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });

        if (!res.ok) {
            const text = await res.text();
            return response.status(res.status).json({ error: 'Okta Auth Failed', details: text });
        }

        const data = await res.json();
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: 'Internal Function Error', details: error.message });
    }
}
