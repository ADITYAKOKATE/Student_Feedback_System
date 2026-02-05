import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL_HOST = 'localhost';
const BASE_URL_PORT = 5000;
const BASE_PATH = '/api';

// Admin credentials (hardcoded as per previous checks or env)
const credentials = {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD
};

// Helper for requests
function request(path, options, body) {
    return new Promise((resolve, reject) => {
        const reqOptions = {
            hostname: BASE_URL_HOST,
            port: BASE_URL_PORT,
            path: BASE_PATH + path,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', e => reject(e));

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const run = async () => {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await request('/auth/admin/login', { method: 'POST' }, credentials);

        if (!loginRes.data.success) {
            console.error('Login Failed:', loginRes.data);
            return;
        }

        const token = loginRes.data.token;
        console.log('Login Successful.');

        console.log('\n2. Testing GET /reports/stats');
        const statsRes = await request('/reports/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Stats:', JSON.stringify(statsRes.data.data, null, 2));

        console.log('\n3. Testing GET /reports/department-distribution');
        const deptRes = await request('/reports/department-distribution', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Dept Distribution:', JSON.stringify(deptRes.data.data, null, 2));

        console.log('\n4. Testing GET /reports/top-faculty');
        const facultyRes = await request('/reports/top-faculty', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Top Faculty:', JSON.stringify(facultyRes.data.data, null, 2));

    } catch (e) {
        console.error('Script Error:', e);
    }
};

run();
