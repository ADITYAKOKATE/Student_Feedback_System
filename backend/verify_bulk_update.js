
import http from 'http';

const BASE_URL_HOST = 'localhost';
const BASE_URL_PORT = 5000;
const BASE_PATH = '/api';

const credentials = { username: 'admin', password: 'admin123' };

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
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data, error: e });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

const run = async () => {
    try {
        console.log('Logging in...');
        const loginRes = await request('/auth/admin/login', { method: 'POST' }, credentials);
        if (!loginRes.data.success) throw new Error('Login failed: ' + loginRes.data.message);

        const token = loginRes.data.token;
        console.log('Login successful.');

        // 2. Register
        const students = [{
            grNo: 'TEST_BULK_999',
            username: 'bulk_test_user',
            password: 'password123',
            department: 'Computer - AIML',
            class: 'SE',
            division: 'A',
            practicalBatch: 'A',
            eligibility: true
        }];

        console.log('Step 1: Uploading initial student...');
        const res1 = await request('/students/bulk-register', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }, students);
        console.log('Initial Upload Response:', JSON.stringify(res1.data, null, 2));

        // 3. Update
        students[0].division = 'B';
        console.log('Step 2: Uploading SAME student with Division B...');
        const res2 = await request('/students/bulk-register', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }, students);
        console.log('Update Upload Response:', JSON.stringify(res2.data, null, 2));

        // 4. Verify
        console.log('Step 3: Verifying change...');
        const res3 = await request('/students?class=SE', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Debug array
        console.log('Array length:', res3.data.data.length);
        res3.data.data.forEach((s, i) => console.log(`Item ${i}: GR="${s.grNo}", Div="${s.division}"`));

        const upsertedStudent = res3.data.data.find(s => s.grNo === 'TEST_BULK_999');

        if (upsertedStudent) {
            console.log(`Student found. Division: ${upsertedStudent.division}`);
            if (upsertedStudent.division === 'B') {
                console.log('VERIFICATION SUCCESS: Division updated to B.');
            } else {
                console.log('VERIFICATION FAILED: Division is ' + upsertedStudent.division);
            }
            // Cleanup
            await request(`/students/${upsertedStudent._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Cleanup: Test student deleted.');
        } else {
            console.log('VERIFICATION FAILED: Student not found in list (despite logging?).');
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
};

run();
